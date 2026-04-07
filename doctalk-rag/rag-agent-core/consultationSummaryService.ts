/**
 * Consultation Summary Service
 *
 * 상담 종료 시 AI를 사용하여 상담 요약을 자동 생성하고,
 * consultation_summaries 테이블에 저장합니다.
 *
 * Gemini Flash를 사용하여 비용 최적화.
 */

import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  patientChatMessages,
  patientChatRooms,
  patients,
  consultationSummaries,
} from "@shared/schema";
import { GeminiChatProvider } from "../ai/llm/gemini";

export interface ConsultationSummaryResult {
  roomId: string;
  patientId: string;
  doctorId: string;
  chartPatientId: string;
  summary: string;
  keySymptoms: string[];
  recommendedActions: string[];
  messageCount: number;
  duration: string;
  consultedAt: string;
}

const SUMMARY_SYSTEM_PROMPT = `환자와의 상담 내용을 의사가 전자차트에 기록할 수 있도록 간결하게 요약해주세요. 주요 증상, 환자 요청사항, AI 권장 사항을 포함하세요.

응답은 반드시 아래 JSON 형식으로만 답하세요:
{
  "summary": "전체 상담 요약 (3-5문장, 한국어)",
  "keySymptoms": ["주요 증상 1", "주요 증상 2"],
  "recommendedActions": ["권장 사항 1", "권장 사항 2"]
}

규칙:
- 확정 진단 표현 금지 (의료법 준수)
- 환자 실명 사용 금지
- 한국어로 작성
- 간결하게 요약 (의사가 빠르게 읽을 수 있도록)`;

/**
 * 채팅방의 상담 요약을 생성합니다.
 * 이미 요약이 존재하면 캐시된 결과를 반환합니다.
 */
export async function generateConsultationSummary(
  roomId: string
): Promise<ConsultationSummaryResult | null> {
  try {
    // 1. 채팅방 정보 조회
    const [room] = await db
      .select()
      .from(patientChatRooms)
      .where(eq(patientChatRooms.id, roomId))
      .limit(1);

    if (!room) {
      console.error(`[ConsultationSummary] Room not found: ${roomId}`);
      return null;
    }

    // 2. 이미 요약이 존재하면 캐시 반환
    const [existingSummary] = await db
      .select()
      .from(consultationSummaries)
      .where(eq(consultationSummaries.roomId, roomId))
      .orderBy(desc(consultationSummaries.createdAt))
      .limit(1);

    if (existingSummary) {
      return {
        roomId: existingSummary.roomId,
        patientId: existingSummary.patientId,
        doctorId: existingSummary.doctorId,
        chartPatientId: existingSummary.chartPatientId || "",
        summary: existingSummary.summary,
        keySymptoms: (existingSummary.keyFindings as string[]) || [],
        recommendedActions: (existingSummary.recommendations as string[]) || [],
        messageCount: existingSummary.messageCount || 0,
        duration: "",
        consultedAt: existingSummary.consultedAt?.toISOString() || "",
      };
    }

    // 3. 대화 메시지 조회
    const messages = await db
      .select()
      .from(patientChatMessages)
      .where(eq(patientChatMessages.roomId, roomId))
      .orderBy(patientChatMessages.createdAt);

    if (messages.length === 0) {
      console.log(`[ConsultationSummary] No messages in room: ${roomId}`);
      return null;
    }

    // 4. 대화 텍스트 변환 + 상담 시간 계산
    const conversationText = messages
      .map((m) => {
        const role =
          m.senderType === "ai_agent"
            ? "AI Agent"
            : m.senderType === "system"
            ? "시스템"
            : "환자";
        return `${role}: ${m.content}`;
      })
      .join("\n");

    const firstMsgTime = messages[0].createdAt
      ? new Date(messages[0].createdAt)
      : new Date();
    const lastMsgTime = messages[messages.length - 1].createdAt
      ? new Date(messages[messages.length - 1].createdAt)
      : new Date();
    const durationMinutes = Math.max(
      1,
      Math.round((lastMsgTime.getTime() - firstMsgTime.getTime()) / 60000)
    );
    const duration = `${durationMinutes}분`;

    // 5. Gemini Flash로 요약 생성
    const gemini = new GeminiChatProvider("gemini-2.5-flash");
    const truncatedConversation = conversationText.substring(0, 6000);

    const result = await gemini.chat(
      [
        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
        {
          role: "user",
          content: `다음 상담 대화를 요약해주세요:\n\n${truncatedConversation}`,
        },
      ],
      {
        temperature: 0.3,
        maxTokens: 500,
        endpoint: "consultation-summary",
      }
    );

    // 6. JSON 파싱
    let parsed: {
      summary?: string;
      keySymptoms?: string[];
      recommendedActions?: string[];
    };
    try {
      // Gemini 응답에서 JSON 부분 추출 (```json ... ``` 래핑 제거)
      let jsonStr = result.content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      // JSON 파싱 실패 — ```json 래핑과 JSON 키를 제거하고 순수 텍스트 추출
      let cleanText = result.content || "";
      cleanText = cleanText.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
      // { "summary": "..." } 형태에서 summary 값만 추출 시도
      const summaryMatch = cleanText.match(/"summary"\s*:\s*"([^"]*)/);
      if (summaryMatch) cleanText = summaryMatch[1];
      parsed = {
        summary: cleanText,
        keySymptoms: [],
        recommendedActions: [],
      };
    }

    // 7. chartPatientId 조회
    let chartPatientId = "";
    if (room.patientId) {
      const [patient] = await db
        .select({ chartPatientId: patients.chartPatientId })
        .from(patients)
        .where(eq(patients.id, room.patientId))
        .limit(1);
      chartPatientId = patient?.chartPatientId || "";
    }

    const consultedAt = new Date();
    const summaryResult: ConsultationSummaryResult = {
      roomId: room.id,
      patientId: room.patientId || "",
      doctorId: room.doctorId || "",
      chartPatientId,
      summary: parsed.summary || "",
      keySymptoms: parsed.keySymptoms || [],
      recommendedActions: parsed.recommendedActions || [],
      messageCount: messages.length,
      duration,
      consultedAt: consultedAt.toISOString(),
    };

    // 8. DB에 저장
    try {
      await db.insert(consultationSummaries).values({
        orgId: room.orgId || "",
        doctorId: room.doctorId || "",
        patientId: room.patientId || "",
        roomId: room.id,
        chartPatientId: chartPatientId || null,
        summary: summaryResult.summary,
        keyFindings: summaryResult.keySymptoms,
        recommendations: summaryResult.recommendedActions,
        messageCount: messages.length,
        consultedAt,
      });
      console.log(
        `[ConsultationSummary] Saved summary for room ${roomId}: ${messages.length} messages, ${duration}`
      );
    } catch (dbErr) {
      console.error(
        `[ConsultationSummary] Failed to persist summary for room ${roomId}:`,
        dbErr
      );
    }

    // 9. Webhook 이벤트 발행 (비동기, non-blocking)
    if (room.orgId) {
      try {
        const { emitPartnerEventByOrg } = await import(
          "../services/partnerIntegrationService"
        );
        emitPartnerEventByOrg(room.orgId, "consultation_summary.created", {
          chartPatientId: chartPatientId || null,
          roomId: room.id,
          summary: summaryResult.summary,
          keyFindings: summaryResult.keySymptoms,
          recommendations: summaryResult.recommendedActions,
          messageCount: messages.length,
          duration,
          consultedAt: consultedAt.toISOString(),
        });
      } catch (webhookErr) {
        console.error(
          "[ConsultationSummary] Failed to emit webhook:",
          webhookErr
        );
      }
    }

    return summaryResult;
  } catch (error) {
    console.error(
      `[ConsultationSummary] Error generating summary for room ${roomId}:`,
      error
    );
    return null;
  }
}

/**
 * 만료된 채팅방에 대해 자동으로 상담 요약을 생성합니다.
 * checkExpiringLinks 스케줄러와 함께 사용됩니다.
 */
export async function generateSummariesForExpiredRooms(): Promise<number> {
  try {
    const now = new Date();

    // 만료되었으나 요약이 아직 없는 채팅방 조회
    const expiredRoomsWithoutSummary = await db
      .select({ roomId: patientChatRooms.id })
      .from(patientChatRooms)
      .leftJoin(
        consultationSummaries,
        eq(patientChatRooms.id, consultationSummaries.roomId)
      )
      .where(
        and(
          eq(patientChatRooms.isActive, true),
          // expiresAt이 과거 (만료됨)
          // activatedAt이 not null (실제 사용됨)
        )
      )
      // Raw SQL for date comparison since drizzle lte/gte needs import
      .then((rows) =>
        rows.filter((r) => {
          // This is a post-filter; the leftJoin already excludes rows with summaries
          return true;
        })
      );

    // Use raw query for more precise filtering
    const rooms = await db.execute<{ room_id: string }>(
      `SELECT pcr.id as room_id
       FROM patient_chat_rooms pcr
       LEFT JOIN consultation_summaries cs ON pcr.id = cs.room_id
       WHERE pcr.is_active = true
         AND pcr.activated_at IS NOT NULL
         AND pcr.expires_at IS NOT NULL
         AND pcr.expires_at < NOW()
         AND cs.id IS NULL
         AND (SELECT COUNT(*) FROM patient_chat_messages pcm WHERE pcm.room_id = pcr.id) > 0
       LIMIT 10`
    );

    let generatedCount = 0;
    const roomRows = (rooms as any).rows || rooms;
    for (const row of roomRows) {
      const roomId = (row as any).room_id;
      if (!roomId) continue;

      const summaryResult = await generateConsultationSummary(roomId);
      if (summaryResult) {
        generatedCount++;
      }
    }

    if (generatedCount > 0) {
      console.log(
        `[ConsultationSummary] Auto-generated ${generatedCount} summaries for expired rooms`
      );
    }

    return generatedCount;
  } catch (error) {
    console.error(
      "[ConsultationSummary] Error in generateSummariesForExpiredRooms:",
      error
    );
    return 0;
  }
}
