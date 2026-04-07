/**
 * Patient Context Service - 환자별 컨텍스트 빌더
 *
 * 환자 DB(진단/처방/방문이력) + 과거 대화를 로드하여
 * 시스템 프롬프트에 주입할 텍스트 블록을 생성.
 *
 * 토큰 예산:
 * - 환자 facts: 최대 500 토큰
 * - 환자 sources 요약: 최대 600 토큰
 * - 과거 대화: 최대 400 토큰
 * - 합계: 최대 1500 토큰
 */

import { db } from "../../db";
import {
  patientFacts,
  patientSources,
  agentChatHistory,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// 토큰 예산 상수
const TOKEN_BUDGET = {
  FACTS: 500,
  SOURCES: 600,
  CONVERSATION: 400,
  TOTAL: 1500,
} as const;

// 대략적인 토큰 추정 (한국어 기준: 1토큰 ≈ 1.5자)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 1.5);
}

// 텍스트를 토큰 예산 내로 자르기
function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = Math.floor(maxTokens * 1.5);
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}

export interface PatientContextOptions {
  includeConversationHistory?: boolean;
  currentRoomId?: string;
  maxConversationTurns?: number;
}

/**
 * 환자 컨텍스트 블록 빌드
 * patient_facts + patient_sources 요약 + 과거 대화를 조합하여
 * 토큰 예산(1500) 내에서 텍스트 블록 반환
 */
export async function buildPatientContextBlock(
  patientId: string,
  options: PatientContextOptions = {}
): Promise<string> {
  try {
    const [factsBlock, sourcesBlock, conversationBlock] = await Promise.all([
      buildFactsBlock(patientId),
      buildSourcesSummaryBlock(patientId),
      options.includeConversationHistory !== false
        ? loadPatientConversationHistory(
            patientId,
            options.currentRoomId,
            options.maxConversationTurns || 5
          )
        : Promise.resolve(""),
    ]);

    const parts: string[] = [];

    if (factsBlock) {
      parts.push(truncateToTokenBudget(factsBlock, TOKEN_BUDGET.FACTS));
    }
    if (sourcesBlock) {
      parts.push(truncateToTokenBudget(sourcesBlock, TOKEN_BUDGET.SOURCES));
    }
    if (conversationBlock) {
      parts.push(truncateToTokenBudget(conversationBlock, TOKEN_BUDGET.CONVERSATION));
    }

    if (parts.length === 0) return "";

    const contextBlock = parts.join("\n\n");
    const totalEstimate = estimateTokens(contextBlock);
    console.log(`[AgentChat] Patient context loaded: patientId=${patientId}, tokens~${totalEstimate}`);

    return truncateToTokenBudget(contextBlock, TOKEN_BUDGET.TOTAL);
  } catch (error) {
    console.error("[PatientContext] Failed to build patient context:", error);
    return "";
  }
}

/**
 * 환자 facts 블록 빌드 (진단/처방/방문/검사 등)
 */
async function buildFactsBlock(patientId: string): Promise<string> {
  try {
    const facts = await db
      .select()
      .from(patientFacts)
      .where(
        and(
          eq(patientFacts.patientId, patientId),
          eq(patientFacts.isArchived, false)
        )
      )
      .orderBy(desc(patientFacts.date))
      .limit(20);

    if (facts.length === 0) return "";

    const grouped: Record<string, string[]> = {};
    for (const fact of facts) {
      const type = fact.factType;
      if (!grouped[type]) grouped[type] = [];
      const dateStr = fact.date.toISOString().split("T")[0];
      const entry = fact.code
        ? `${dateStr}: ${fact.description} (${fact.code})`
        : `${dateStr}: ${fact.description}`;
      grouped[type].push(entry);
    }

    const typeLabels: Record<string, string> = {
      VISIT: "방문이력",
      DIAGNOSIS: "진단",
      PRESCRIPTION: "처방",
      LAB: "검사결과",
      VACCINE: "예방접종",
      NOTE: "메모",
      PROCEDURE: "시술",
    };

    const lines: string[] = ["[환자 진료 정보]"];
    for (const [type, entries] of Object.entries(grouped)) {
      const label = typeLabels[type] || type;
      lines.push(`- ${label}: ${entries.slice(0, 5).join("; ")}`);
    }

    return lines.join("\n");
  } catch (error) {
    console.error("[PatientContext] Failed to load patient facts:", error);
    return "";
  }
}

/**
 * 환자 sources 요약 블록 빌드 (업로드 파일, EMR 데이터 등)
 */
async function buildSourcesSummaryBlock(patientId: string): Promise<string> {
  try {
    const sources = await db
      .select()
      .from(patientSources)
      .where(
        and(
          eq(patientSources.patientId, patientId),
          eq(patientSources.isDeleted, false),
          eq(patientSources.analysisStatus, "completed")
        )
      )
      .orderBy(desc(patientSources.createdAt))
      .limit(10);

    if (sources.length === 0) return "";

    const lines: string[] = ["[환자 데이터 요약]"];
    for (const source of sources) {
      const normalized = source.normalizedJson as Record<string, any> | null;
      if (!normalized) continue;

      // chat_conversation 타입은 대화 기록이므로 스킵 (과거 대화 섹션에서 처리)
      if (normalized.type === "chat_conversation") continue;

      const summary = normalized.summary || normalized.description || normalized.title;
      if (summary) {
        const typeLabel = source.type === "EMR" ? "EMR" : source.type;
        const dateStr = source.createdAt.toISOString().split("T")[0];
        lines.push(`- [${typeLabel}] ${dateStr}: ${String(summary).slice(0, 150)}`);
      }
    }

    return lines.length > 1 ? lines.join("\n") : "";
  } catch (error) {
    console.error("[PatientContext] Failed to load patient sources:", error);
    return "";
  }
}

/**
 * 환자 과거 대화 히스토리 로드
 * patientChatMessages + agentChatHistory에서 최근 대화를 조합
 */
export async function loadPatientConversationHistory(
  patientId: string,
  currentRoomId?: string,
  limit: number = 5
): Promise<string> {
  try {
    // 1) agentChatHistory에서 해당 환자의 최근 대화 조회
    const agentHistory = await db
      .select({
        role: agentChatHistory.role,
        content: agentChatHistory.content,
        createdAt: agentChatHistory.createdAt,
      })
      .from(agentChatHistory)
      .where(eq(agentChatHistory.patientId, patientId))
      .orderBy(desc(agentChatHistory.createdAt))
      .limit(limit * 2);

    // 2) patient_sources에서 chat_conversation 타입의 과거 대화도 조회
    const chatSources = await db
      .select({
        normalizedJson: patientSources.normalizedJson,
        createdAt: patientSources.createdAt,
      })
      .from(patientSources)
      .where(
        and(
          eq(patientSources.patientId, patientId),
          eq(patientSources.isDeleted, false),
          eq(patientSources.type, "TEXT"),
          sql`${patientSources.normalizedJson}->>'type' = 'chat_conversation'`
        )
      )
      .orderBy(desc(patientSources.createdAt))
      .limit(3);

    const conversationEntries: { role: string; content: string; at: Date }[] = [];

    // agentChatHistory 변환 (immutable reverse)
    for (const h of [...agentHistory].reverse()) {
      conversationEntries.push({
        role: h.role === "user" ? "환자" : "AI",
        content: h.content.slice(0, 200),
        at: h.createdAt,
      });
    }

    // chatSources에서 대화 추출 (이전 세션의 요약)
    for (const src of chatSources) {
      const normalized = src.normalizedJson as Record<string, any> | null;
      if (!normalized?.messages) continue;
      const msgs = normalized.messages as Array<{ role: string; content: string }>;
      for (const msg of msgs.slice(-4)) {
        conversationEntries.push({
          role: msg.role === "user" ? "환자" : "AI",
          content: msg.content.slice(0, 200),
          at: src.createdAt,
        });
      }
    }

    if (conversationEntries.length === 0) return "";

    // 최근 대화만 유지
    const recentEntries = conversationEntries.slice(-limit * 2);

    const lines: string[] = ["[이전 대화 기록]"];
    for (const entry of recentEntries) {
      lines.push(`${entry.role}: ${entry.content}`);
    }

    return lines.join("\n");
  } catch (error) {
    console.error("[PatientContext] Failed to load conversation history:", error);
    return "";
  }
}

/**
 * 대화 내용을 patient_sources에 저장
 * sourceId = `ai-chat-${roomId}-${YYYY-MM-DD}` (일자별 그룹화)
 * UPSERT: 같은 날 같은 방의 대화는 append
 */
export async function saveConversationToPatientSources(
  patientId: string,
  roomId: string,
  userMessage: string,
  aiReply: string
): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const sourceId = `ai-chat-${roomId}-${today}`;
    const timestamp = new Date().toISOString();

    const newEntry = {
      role: "user" as const,
      content: userMessage.slice(0, 500),
      timestamp,
    };
    const aiEntry = {
      role: "assistant" as const,
      content: aiReply.slice(0, 500),
      timestamp,
    };

    // 기존 소스 조회 (같은 날 같은 방)
    const existing = await db
      .select()
      .from(patientSources)
      .where(eq(patientSources.id, sourceId))
      .limit(1);

    if (existing.length > 0) {
      // UPSERT: 기존 대화에 append
      const existingNormalized = (existing[0].normalizedJson as Record<string, any>) || {};
      const existingMessages = (existingNormalized.messages || []) as Array<Record<string, any>>;
      const updatedMessages = [...existingMessages, newEntry, aiEntry];

      // 모든 메시지를 보존 (제한 없음)
      const trimmedMessages = updatedMessages;

      await db
        .update(patientSources)
        .set({
          normalizedJson: {
            ...existingNormalized,
            type: "chat_conversation",
            messages: trimmedMessages,
            lastUpdated: timestamp,
            turnCount: Math.ceil(trimmedMessages.length / 2),
          },
          rawText: trimmedMessages
            .map((m: Record<string, any>) => `${m.role}: ${m.content}`)
            .join("\n"),
        })
        .where(eq(patientSources.id, sourceId));

      console.log(`[PatientContext] Updated conversation source: ${sourceId} (${trimmedMessages.length} messages)`);
    } else {
      // INSERT: 새 대화 소스 생성
      await db.insert(patientSources).values({
        id: sourceId,
        patientId,
        type: "TEXT",
        rawText: `user: ${userMessage.slice(0, 500)}\nassistant: ${aiReply.slice(0, 500)}`,
        normalizedJson: {
          type: "chat_conversation",
          roomId,
          date: today,
          messages: [newEntry, aiEntry],
          lastUpdated: timestamp,
          turnCount: 1,
        },
        analysisStatus: "completed",
        originalFilename: `AI 대화 ${today}`,
      });

      console.log(`[PatientContext] Created conversation source: ${sourceId}`);
    }
  } catch (error) {
    console.error("[PatientContext] Failed to save conversation to patient_sources:", error);
    // 에러 격리: 대화 저장 실패 시 대화 자체는 중단하지 않음
  }
}
