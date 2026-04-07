/**
 * Agent Chat Service - AI Agent RAG 채팅 통합 서비스
 * 
 * 아키텍처 흐름:
 * 사용자 질문
 * → (A) Safety Pre-check (응급 triage)
 * → (B) Query Normalizer
 * → (C) Multi-RAG Retrieve
 * → (D) Rerank + Context Builder
 * → (E) LLM Response + Citations
 * → (F) Safety Post-check
 * → 저장 (agentChatHistory, agentLearnedConversations 초안)
 */

import { db } from "../../db";
import { 
  agentChatHistory, 
  agentLearnedConversations,
  hospitalSettings,
  doctorProfiles,
  users,
  ragFallbackStats,
  organizationMembers,
  organizations,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { llmRouter } from "../llm/router";
import { buildSystemPrompt, PATIENT_CONTEXT_WRAPPER, type ChatMessage } from "../llm/provider";
import { retrieveMultiIndex } from "./retriever";
import { buildPatientContextBlock, saveConversationToPatientSources } from "./patientContextService";
import { rerank, diversifyResults, llmRerank } from "./reranker";
import { buildContext, buildCitationFooter, buildInlineCitationPromptGuide, type Citation } from "./contextBuilder";
import { preCheckSafety, postCheckSafety, combineSafetyFlags, type SafetyFlag } from "./safety";
import { searchPubMed, buildMedicalQuery, formatPubMedCitation, type PubMedArticle } from "./pubmedService";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";
import * as fsPromises from "fs/promises";

// Helper function to resolve image URL to base64 data URI for OpenAI Vision API
async function resolveImageToBase64(url: string, mimeType?: string): Promise<string | null> {
  try {
    let buffer: Buffer | null = null;
    let detectedMimeType = mimeType || "image/jpeg";

    if (url.startsWith("/objects/")) {
      // S3/local object storage path
      const { ObjectStorageService } = await import("../../replit_integrations/object_storage");
      const storageService = new ObjectStorageService();
      const result = await storageService.downloadObjectAsBuffer(url);
      if (!result) return null;
      buffer = result.buffer;
      detectedMimeType = result.contentType || detectedMimeType;
    } else if (url.startsWith("https://storage.googleapis.com/")) {
      // Legacy GCS URL - normalize and resolve via storage service
      const { ObjectStorageService } = await import("../../replit_integrations/object_storage");
      const storageService = new ObjectStorageService();
      const normalized = storageService.normalizeObjectEntityPath(url);
      if (normalized.startsWith("/objects/")) {
        const result = await storageService.downloadObjectAsBuffer(normalized);
        if (result) {
          buffer = result.buffer;
          detectedMimeType = result.contentType || detectedMimeType;
        }
      }
      if (!buffer) {
        const response = await fetch(url);
        if (!response.ok) return null;
        buffer = Buffer.from(await response.arrayBuffer());
        detectedMimeType = response.headers.get("content-type") || detectedMimeType;
      }
    } else if (url.startsWith("/api/chat/files/")) {
      const filename = path.basename(url.replace("/api/chat/files/", ""));
      const filePath = path.join("/tmp/chat_uploads", filename);
      try {
        buffer = await fsPromises.readFile(filePath);
        const ext = path.extname(filename).toLowerCase();
        if (ext === ".png") detectedMimeType = "image/png";
        else if (ext === ".gif") detectedMimeType = "image/gif";
        else if (ext === ".webp") detectedMimeType = "image/webp";
        else detectedMimeType = "image/jpeg";
      } catch {
        return null;
      }
    } else if (url.startsWith("data:")) {
      return url;
    } else if (url.startsWith("http")) {
      const response = await fetch(url);
      if (!response.ok) return null;
      buffer = Buffer.from(await response.arrayBuffer());
      detectedMimeType = response.headers.get("content-type") || detectedMimeType;
    } else {
      return null;
    }
    
    if (!buffer || buffer.length === 0) return null;
    const base64 = buffer.toString("base64");
    return `data:${detectedMimeType};base64,${base64}`;
  } catch {
    return null;
  }
}

// API 키 상태 검증
function checkApiKeyStatus(): { openai: boolean; anyAvailable: boolean } {
  const openai = !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  return { openai, anyAvailable: openai };
}

// Fallback 통계 기록
async function logFallbackStat(
  doctorId: string,
  sessionId: string,
  userMessage: string,
  fallbackReason: string,
  errorDetails: string,
  fallbackResponse: string,
  stage: string,
  userEmail?: string
): Promise<void> {
  try {
    await db.insert(ragFallbackStats).values({
      doctorId,
      userEmail: userEmail || null,
      sessionId,
      userMessage: userMessage.slice(0, 500),
      fallbackReason,
      errorDetails: errorDetails.slice(0, 1000),
      fallbackResponse: fallbackResponse.slice(0, 500),
      stage,
    });
    console.log(`[AgentChat] Fallback recorded: ${stage} - ${fallbackReason}`);
  } catch (err) {
    console.error("[AgentChat] Failed to log fallback stat:", err);
  }
}

// 기본 LLM Fallback 응답 생성
async function generateFallbackResponse(
  message: string,
  doctorId: string,
  sessionId: string,
  fallbackReason: string,
  errorDetails: string,
  userEmail?: string,
  patientId?: string | null
): Promise<AgentChatResponse> {
  const startTime = Date.now();
  const apiStatus = checkApiKeyStatus();
  
  if (!apiStatus.anyAvailable) {
    const noApiResponse = "현재 AI 서비스를 이용할 수 없습니다. 시스템 관리자에게 문의해 주세요.";
    await logFallbackStat(doctorId, sessionId, message, "NO_API_KEY", "API 키가 설정되지 않음", noApiResponse, "api_check", userEmail);
    
    await saveChatHistory(doctorId, sessionId, "user", message, patientId || null, [], 0, 0, "fallback-no-api", 0, []);
    await saveChatHistory(doctorId, sessionId, "assistant", noApiResponse, patientId || null, [], 0, 0, "fallback-no-api", Date.now() - startTime, []);
    
    return {
      reply: noApiResponse,
      sessionId,
      citations: [],
      safetyFlags: [],
      tokensIn: 0,
      tokensOut: 0,
      model: "fallback-no-api",
      latencyMs: Date.now() - startTime,
      isEmergency: false,
    };
  }

  try {
    const fallbackSystemPrompt = `당신은 닥톡AI Agent입니다. 의료 전문가를 도와 환자 관리와 메시지 작성을 지원합니다.
현재 RAG 검색 시스템에 일시적인 문제가 있어 기본 응답 모드로 동작합니다.
질문에 대해 일반적인 의료 조언을 제공하되, 반드시 의사의 판단이 우선임을 안내해주세요.`;

    const messages: ChatMessage[] = [
      { role: "system", content: fallbackSystemPrompt },
      { role: "user", content: message },
    ];

    const llmResult = await llmRouter.chat(messages, {
      temperature: 0.7,
      maxTokens: 2000,
    });

    const finalReply = llmResult.content;
    const latencyMs = Date.now() - startTime;

    await logFallbackStat(doctorId, sessionId, message, fallbackReason, errorDetails, finalReply.slice(0, 200), "llm_fallback", userEmail);

    await saveChatHistory(doctorId, sessionId, "user", message, patientId || null, [], 0, 0, `${llmResult.model}-fallback`, 0, []);
    await saveChatHistory(doctorId, sessionId, "assistant", finalReply, patientId || null, [], llmResult.tokensIn, llmResult.tokensOut, `${llmResult.model}-fallback`, latencyMs, []);

    return {
      reply: finalReply,
      sessionId,
      citations: [],
      safetyFlags: [],
      tokensIn: llmResult.tokensIn,
      tokensOut: llmResult.tokensOut,
      model: `${llmResult.model}-fallback`,
      latencyMs,
      isEmergency: false,
    };
  } catch (llmError: any) {
    const errorMsg = "죄송합니다. 현재 AI 서비스에 문제가 있습니다. 잠시 후 다시 시도해 주세요.";
    const latencyMs = Date.now() - startTime;
    
    await logFallbackStat(doctorId, sessionId, message, "LLM_FALLBACK_FAILED", llmError?.message || "Unknown LLM error", errorMsg, "llm_error", userEmail);
    
    await saveChatHistory(doctorId, sessionId, "user", message, patientId || null, [], 0, 0, "fallback-error", 0, []);
    await saveChatHistory(doctorId, sessionId, "assistant", errorMsg, patientId || null, [], 0, 0, "fallback-error", latencyMs, []);
    
    return {
      reply: errorMsg,
      sessionId,
      citations: [],
      safetyFlags: [],
      tokensIn: 0,
      tokensOut: 0,
      model: "fallback-error",
      latencyMs,
      isEmergency: false,
    };
  }
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: "image" | "document";
  url: string;
  mimeType?: string;
  size?: number;
}

export interface AgentChatRequest {
  doctorId: string;
  sessionId?: string;
  patientId?: string;
  message: string;
  includePatientContext?: boolean;
  attachments?: ChatAttachment[];
  systemPromptAddition?: string;
  isPatientFacing?: boolean;
}

export interface AgentChatResponse {
  reply: string;
  sessionId: string;
  citations: Citation[];
  safetyFlags: SafetyFlag[];
  tokensIn: number;
  tokensOut: number;
  model: string;
  latencyMs: number;
  isEmergency: boolean;
}

async function getHospitalContext(doctorId: string, patientId?: string): Promise<{ hospitalName: string; clinicContext: string; doctorContext: string }> {
  try {
    const doctor = await db.select().from(doctorProfiles).where(eq(doctorProfiles.id, doctorId)).limit(1);
    
    if (doctor.length === 0) {
      return {
        hospitalName: "병원",
        clinicContext: "일반 진료",
        doctorContext: "담당 의사",
      };
    }
    
    const user = await db.select().from(users).where(eq(users.id, doctor[0].userId)).limit(1);
    
    // Fetch hospital settings using patient's orgId if available, otherwise use a fallback orgId from doctor knowledge
    let fetchedHospitalName = "병원";
    
    // Import patients table for this query
    const { patients } = await import("@shared/schema");
    
    if (patientId) {
      // If patientId is provided, use it directly
      const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (patient.length > 0) {
        const settings = await db.select().from(hospitalSettings).where(eq(hospitalSettings.orgId, patient[0].orgId)).limit(1);
        fetchedHospitalName = settings[0]?.hospitalName || "병원";
      }
    } else {
      // Fallback: Find any patient to get the orgId for this doctor
      // This works because doctors typically work within a single organization
      const anyPatient = await db.select().from(patients).limit(1);
      if (anyPatient.length > 0) {
        const settings = await db.select().from(hospitalSettings).where(eq(hospitalSettings.orgId, anyPatient[0].orgId)).limit(1);
        fetchedHospitalName = settings[0]?.hospitalName || "병원";
      }
    }
    
    // Dynamic Prompting: DB에서 의사 정보를 동적으로 로딩하여 페르소나 구성
    // Format: "병원명 + 원장이름" (e.g., "GF소아과 김우성")
    const doctorName = user[0]?.firstName?.trim() || user[0]?.lastName?.trim() || "담당";
    
    return {
      hospitalName: fetchedHospitalName,
      clinicContext: `전문 분야: ${doctor[0].specialty || "일반 진료"}`,
      doctorContext: doctorName,
    };
  } catch (error) {
    console.error("Error getting hospital context:", error);
    return {
      hospitalName: "병원",
      clinicContext: "일반 진료",
      doctorContext: "담당 의사",
    };
  }
}

/**
 * Resolve orgId for a doctor.
 * Priority: patientId → patients.orgId, then doctorId → organizationMembers.orgId
 * CRITICAL: orgId is required for RAG data isolation (2026-03-18)
 */
async function resolveDoctorOrgId(doctorId: string, patientId?: string): Promise<string> {
  try {
    const { patients } = await import("@shared/schema");

    // 1) If patientId is provided, get orgId from the patient record
    if (patientId) {
      const patient = await db.select({ orgId: patients.orgId }).from(patients).where(eq(patients.id, patientId)).limit(1);
      if (patient.length > 0 && patient[0].orgId) {
        return patient[0].orgId;
      }
    }

    // 2) Resolve from doctorId → doctorProfiles → users → organizationMembers
    const doctor = await db.select().from(doctorProfiles).where(eq(doctorProfiles.id, doctorId)).limit(1);
    if (doctor.length > 0) {
      const member = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, doctor[0].userId)).limit(1);
      if (member.length > 0 && member[0].orgId) {
        return member[0].orgId;
      }
    }

    // 3) Fallback: find orgId from doctor_knowledge table (doctor's data is stored with orgId)
    const { doctorKnowledge } = await import("@shared/schema");
    const anyKnowledge = await db.select({ orgId: doctorKnowledge.orgId }).from(doctorKnowledge)
      .where(eq(doctorKnowledge.doctorId, doctorId))
      .limit(1);
    if (anyKnowledge.length > 0 && anyKnowledge[0].orgId) {
      return anyKnowledge[0].orgId;
    }

    console.error(`[AgentChat] CRITICAL: Could not resolve orgId for doctorId=${doctorId} — RAG data isolation compromised`);
    return "";
  } catch (err) {
    console.error("[AgentChat] Error resolving orgId:", err);
    return "";
  }
}

async function getDoctorPlanId(doctorId: string): Promise<string> {
  try {
    const doctor = await db.select().from(doctorProfiles).where(eq(doctorProfiles.id, doctorId)).limit(1);
    if (doctor.length === 0) return "basic";
    const member = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, doctor[0].userId)).limit(1);
    if (member.length === 0) return "basic";
    const org = await db.select({ planId: organizations.planId }).from(organizations).where(eq(organizations.id, member[0].orgId)).limit(1);
    return org[0]?.planId || "basic";
  } catch {
    return "basic";
  }
}

async function getChatHistory(
  doctorId: string, 
  sessionId: string, 
  limit: number = 100
): Promise<ChatMessage[]> {
  const history = await db.select()
    .from(agentChatHistory)
    .where(
      and(
        eq(agentChatHistory.doctorId, doctorId),
        eq(agentChatHistory.sessionId, sessionId)
      )
    )
    .orderBy(desc(agentChatHistory.createdAt))
    .limit(limit);
  
  return history.reverse().map(h => ({
    role: h.role as "user" | "assistant" | "system",
    content: h.content,
  }));
}

async function saveChatHistory(
  doctorId: string,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  patientId: string | null,
  safetyFlags: SafetyFlag[],
  tokensIn: number,
  tokensOut: number,
  model: string,
  latencyMs: number,
  citations: Citation[]
): Promise<void> {
  await db.insert(agentChatHistory).values({
    doctorId,
    sessionId,
    patientId,
    role,
    content,
    safetyFlags: safetyFlags as any,
    tokensIn,
    tokensOut,
    model,
    latencyMs,
    citations: citations as any,
    qualityMetrics: {} as any,
  });
}

async function generateLearnedConversationDraft(
  doctorId: string,
  sessionId: string
): Promise<void> {
  const history = await db.select()
    .from(agentChatHistory)
    .where(
      and(
        eq(agentChatHistory.doctorId, doctorId),
        eq(agentChatHistory.sessionId, sessionId)
      )
    )
    .orderBy(agentChatHistory.createdAt);
  
  if (history.length < 6) {
    return;
  }
  
  const userMessages = history.filter(h => h.role === "user");
  const assistantMessages = history.filter(h => h.role === "assistant");
  
  if (userMessages.length < 3 || assistantMessages.length < 3) {
    return;
  }
  
  const lastUserMessage = userMessages[userMessages.length - 1];
  const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
  
  const hasRagEvidence = (lastAssistantMessage.citations as any[])?.length > 0;
  const hasRiskExpression = (lastAssistantMessage.safetyFlags as SafetyFlag[])?.length > 0;
  const hasPatientPii = lastUserMessage.patientId !== null;
  
  let qaQualityScore = 50;
  if (hasRagEvidence) qaQualityScore += 20;
  if (!hasRiskExpression) qaQualityScore += 15;
  if (!hasPatientPii) qaQualityScore += 15;
  
  const existing = await db.select()
    .from(agentLearnedConversations)
    .where(
      and(
        eq(agentLearnedConversations.doctorId, doctorId),
        eq(agentLearnedConversations.sessionId, sessionId)
      )
    )
    .limit(1);
  
  if (existing.length === 0) {
    await db.insert(agentLearnedConversations).values({
      doctorId,
      sessionId,
      question: lastUserMessage.content,
      answer: lastAssistantMessage.content,
      summary: `${userMessages.length}턴 대화 요약: ${lastUserMessage.content.slice(0, 100)}...`,
      qaQualityScore,
      hasRagEvidence,
      hasRiskExpression,
      hasPatientPii,
      isApproved: false,
    });
  }
}

export async function chat(request: AgentChatRequest): Promise<AgentChatResponse> {
  const startTime = Date.now();
  const sessionId = request.sessionId || uuidv4();
  
  // Step 1: API 키 상태 검증
  const apiStatus = checkApiKeyStatus();
  if (!apiStatus.anyAvailable) {
    console.error("[AgentChat] No API keys available");
    return generateFallbackResponse(
      request.message,
      request.doctorId,
      sessionId,
      "NO_API_KEY",
      "OpenAI API 키가 설정되지 않음",
      undefined,
      request.patientId
    );
  }
  console.log(`[AgentChat] API Status - OpenAI: ${apiStatus.openai}`);
  
  // Step 2: Safety Pre-check
  let preCheck;
  try {
    preCheck = preCheckSafety(request.message);
    if (!preCheck.isPass && preCheck.emergencyResponse) {
      await saveChatHistory(
        request.doctorId,
        sessionId,
        "user",
        request.message,
        request.patientId || null,
        preCheck.flags,
        0, 0, "safety-check", 0, []
      );
      
      await saveChatHistory(
        request.doctorId,
        sessionId,
        "assistant",
        preCheck.emergencyResponse,
        request.patientId || null,
        preCheck.flags,
        0, 0, "safety-check", Date.now() - startTime, []
      );
      
      return {
        reply: preCheck.emergencyResponse,
        sessionId,
        citations: [],
        safetyFlags: preCheck.flags,
        tokensIn: 0,
        tokensOut: 0,
        model: "safety-check",
        latencyMs: Date.now() - startTime,
        isEmergency: true,
      };
    }
  } catch (safetyError: any) {
    console.error("[AgentChat] Safety check error:", safetyError);
    preCheck = { isPass: true, flags: [] };
  }
  
  // Step 2.5: Resolve orgId for RAG data isolation (CRITICAL — 2026-03-18)
  const resolvedOrgId = await resolveDoctorOrgId(request.doctorId, request.patientId);
  if (!resolvedOrgId) {
    console.error(`[AgentChat] WARNING: orgId not resolved for doctor ${request.doctorId} — RAG may return cross-org data`);
  }

  // Step 3: RAG Retrieval (with fallback on error)
  let retrievalResult;
  let ragFailed = false;
  try {
    retrievalResult = await retrieveMultiIndex(request.message, {
      doctorId: request.doctorId,
      orgId: resolvedOrgId,
      patientId: request.patientId,
      includePatientContext: request.includePatientContext,
      topK: 50,
      enableQueryExpansion: true,
    });
    console.log(`[AgentChat] RAG retrieved ${retrievalResult.sources.length} sources (orgId=${resolvedOrgId})`);
  } catch (ragError: any) {
    console.error("[AgentChat] RAG retrieval error:", ragError);
    ragFailed = true;
    return generateFallbackResponse(
      request.message,
      request.doctorId,
      sessionId,
      "RAG_RETRIEVAL_FAILED",
      ragError?.message || "RAG 검색 중 오류 발생",
      undefined,
      request.patientId
    );
  }
  
  // Step 3.5: Confidence Check - 신뢰도 점수 기반 로깅 (조기 리턴 제거 - 항상 LLM 응답 생성)
  const { confidenceMetrics } = retrievalResult;
  console.log(`[AgentChat] Confidence metrics: level=${confidenceMetrics.confidenceLevel}, maxScore=${confidenceMetrics.maxScore.toFixed(3)}, reliable=${confidenceMetrics.isReliable}`);
  
  // INSUFFICIENT confidence: return helpful fallback instead of low-quality LLM response
  if (confidenceMetrics.confidenceLevel === "INSUFFICIENT" && retrievalResult.sources.length === 0) {
    console.log(`[AgentChat] INSUFFICIENT confidence with no sources - returning fallback response`);
    await logFallbackStat(
      request.doctorId,
      sessionId,
      request.message,
      "LOW_CONFIDENCE_FALLBACK",
      `maxScore=${confidenceMetrics.maxScore.toFixed(3)}, sources=${retrievalResult.sources.length}`,
      "Returned fallback response due to insufficient RAG confidence",
      "confidence_check"
    );

    const fallbackReply = "죄송합니다. 해당 질문에 대한 충분한 참고 자료가 없습니다.\n\n" +
      "다음과 같이 시도해보세요:\n" +
      "- 더 구체적인 증상이나 검사 결과를 알려주세요\n" +
      "- 환자의 차트 데이터가 업로드되었는지 확인해주세요\n" +
      "- 다른 방식으로 질문을 다시 표현해주세요";

    await saveChatHistory(
      request.doctorId, sessionId, "user", request.message,
      request.patientId || null, [], 0, 0, "fallback", 0, []
    );
    await saveChatHistory(
      request.doctorId, sessionId, "assistant", fallbackReply,
      request.patientId || null,
      [{ type: "LOW_CONFIDENCE", severity: "MEDIUM", description: "검색 결과 신뢰도 부족" }],
      0, 0, "low-confidence-fallback", Date.now() - startTime, []
    );

    return {
      reply: fallbackReply,
      sessionId,
      citations: [],
      safetyFlags: [{ type: "LOW_CONFIDENCE", severity: "MEDIUM", description: "검색 결과 신뢰도 부족" }],
      tokensIn: 0,
      tokensOut: 0,
      model: "low-confidence-fallback",
      latencyMs: Date.now() - startTime,
      isEmergency: false,
    };
  }

  if (confidenceMetrics.confidenceLevel === "INSUFFICIENT") {
    console.log(`[AgentChat] Low confidence but has ${retrievalResult.sources.length} sources - proceeding with caution`);
    await logFallbackStat(
      request.doctorId,
      sessionId,
      request.message,
      "LOW_CONFIDENCE_PROCEEDING",
      `maxScore=${confidenceMetrics.maxScore.toFixed(3)}, sources=${retrievalResult.sources.length}`,
      "Proceeding with LLM despite low RAG confidence",
      "confidence_check"
    );
  }
  
  // Step 3.6: Fetch RAG Settings (PubMed, Inline Citation) - scoped by orgId
  // Citations and PubMed are only shown in doctor-facing chats (not patient-facing)
  let pubmedEnabled = false;
  let inlineCitationEnabled = false;
  let pubmedArticles: PubMedArticle[] = [];
  
  try {
    const { patients } = await import("@shared/schema");
    let orgId: string | null = null;
    
    // Get orgId from patientId if available
    if (request.patientId) {
      const patient = await db.select().from(patients).where(eq(patients.id, request.patientId)).limit(1);
      if (patient.length > 0) {
        orgId = patient[0].orgId;
      }
    }
    
    // Fallback: get orgId from any patient (single-tenant assumption)
    if (!orgId) {
      const anyPatient = await db.select().from(patients).limit(1);
      if (anyPatient.length > 0) {
        orgId = anyPatient[0].orgId;
      }
    }
    
    // Fetch settings scoped by orgId (only for doctor-facing chats)
    if (orgId && !request.isPatientFacing) {
      const settings = await db.select().from(hospitalSettings).where(eq(hospitalSettings.orgId, orgId)).limit(1);
      if (settings.length > 0) {
        pubmedEnabled = settings[0].pubmedEnabled ?? false;
        inlineCitationEnabled = settings[0].inlineCitationEnabled ?? false;
      }
    }
  } catch (settingsError) {
    console.error("[AgentChat] Failed to fetch hospital settings:", settingsError);
  }
  
  // Step 3.7: PubMed Search (if enabled)
  if (pubmedEnabled && confidenceMetrics.confidenceLevel !== "HIGH") {
    try {
      const medicalQuery = buildMedicalQuery(request.message);
      console.log(`[AgentChat] Searching PubMed for: ${medicalQuery}`);
      const pubmedResult = await searchPubMed(medicalQuery, 3);
      pubmedArticles = pubmedResult.articles;
      console.log(`[AgentChat] PubMed found ${pubmedArticles.length} articles in ${pubmedResult.searchTimeMs}ms`);
    } catch (pubmedError) {
      console.error("[AgentChat] PubMed search failed:", pubmedError);
    }
  }
  
  // Step 4: Rerank and Context Building
  let builtContext: { context: string; citations: any[]; tokensUsed: number; sourcesUsed: number };
  try {
    const rerankedSources = rerank(request.message, retrievalResult.sources, { topK: 12 });
    
    let finalSources: typeof rerankedSources;
    const shouldLlmRerank = rerankedSources.length > 6 && (retrievalResult as any).confidence?.confidenceLevel !== "high";
    if (shouldLlmRerank) {
      try {
        console.log(`[RAG] LLM rerank triggered: ${rerankedSources.length} candidates, confidence=${(retrievalResult as any).confidence?.confidenceLevel}`);
        finalSources = await llmRerank(request.message, rerankedSources, 8);
      } catch {
        finalSources = diversifyResults(rerankedSources, 3);
      }
    } else {
      console.log(`[RAG] Skipping LLM rerank: ${rerankedSources.length} candidates, confidence=${(retrievalResult as any).confidence?.confidenceLevel}`);
      finalSources = diversifyResults(rerankedSources, 3);
    }
    
    builtContext = buildContext(finalSources, {
      maxTokens: 3000,
      includeCitations: true,
      formatStyle: "compact",
    });
    
    // Append PubMed citations to context if available
    if (pubmedArticles.length > 0) {
      const pubmedCitationsText = pubmedArticles.map((article, i) => 
        formatPubMedCitation(article, builtContext.citations.length + i + 1)
      ).join("\n");
      
      builtContext.context += `\n\n## 외부 의학 데이터베이스 (PubMed)\n${pubmedCitationsText}`;
      
      pubmedArticles.forEach((article, i) => {
        builtContext.citations.push({
          id: `pubmed-${article.pmid}`,
          sourceType: "PubMed",
          title: article.title,
          relevanceScore: 0.8,
        });
      });
    }
  } catch (contextError: any) {
    console.error("[AgentChat] Context building error:", contextError);
    return generateFallbackResponse(
      request.message,
      request.doctorId,
      sessionId,
      "CONTEXT_BUILD_FAILED",
      contextError?.message || "컨텍스트 빌드 중 오류 발생",
      undefined,
      request.patientId
    );
  }
  
  // Step 5: LLM Response Generation
  let llmResult;
  try {
    const { hospitalName, clinicContext, doctorContext } = await getHospitalContext(request.doctorId, request.patientId);
    const doctorPlanId = await getDoctorPlanId(request.doctorId);
    const systemPrompt = await buildSystemPrompt(hospitalName, doctorContext, clinicContext, doctorPlanId);

    // 환자 컨텍스트 블록 빌드 (patientId가 있을 때만)
    let patientContextBlock = "";
    if (request.patientId) {
      const rawContext = await buildPatientContextBlock(request.patientId, {
        includeConversationHistory: true,
        currentRoomId: sessionId,
      });
      if (rawContext) {
        patientContextBlock = "\n\n" + PATIENT_CONTEXT_WRAPPER.replace("{{patient_context}}", rawContext);
      }
    }

    const citationGuide = buildInlineCitationPromptGuide(inlineCitationEnabled);

    const chatHistory = await getChatHistory(request.doctorId, sessionId, 100);
    console.log(`[AgentChat] Chat history loaded: ${chatHistory.length} messages for session ${sessionId}`);

    const ragContextBlock = inlineCitationEnabled
      ? `\n\n[참고 자료]\n${builtContext.context}\n\n${citationGuide}\n응답 시 위 자료를 참고하고, 관련 출처 번호를 표시하세요.`
      : `\n\n[참고 자료]\n${builtContext.context}`;

    const enrichedSystemPrompt = systemPrompt + patientContextBlock + ragContextBlock + `\n\n[대화 지침]\n- 이전 대화 내용을 기억하고, 사용자의 후속 질문에는 이전 맥락을 반영하여 답변하세요.\n- 사용자가 \"그럼\", \"그러면\", \"그것은\", \"아까\" 등의 표현을 사용하면 이전 대화를 참조하세요.`;
    
    const messages: ChatMessage[] = [
      { role: "system", content: enrichedSystemPrompt },
      ...chatHistory,
      { role: "user", content: request.message },
    ];
    
    llmResult = await llmRouter.chat(messages, {
      temperature: 0.7,
      maxTokens: 2500,
    });
    console.log(`[AgentChat] LLM response received: ${llmResult.model}, ${llmResult.tokensOut} tokens`);
  } catch (llmError: any) {
    console.error("[AgentChat] LLM response error:", llmError);
    return generateFallbackResponse(
      request.message,
      request.doctorId,
      sessionId,
      "LLM_RESPONSE_FAILED",
      llmError?.message || "LLM 응답 생성 중 오류 발생",
      undefined,
      request.patientId
    );
  }
  
  // Step 6: Post-processing and saving
  try {
    const cleanedContent = llmResult.content.replace(/\*\*/g, "").replace(/^#{1,4}\s/gm, "");
    const postCheck = postCheckSafety(cleanedContent);
    const finalReply = postCheck.modifiedContent || cleanedContent;
    const allFlags = combineSafetyFlags(preCheck, postCheck);
    
    const citationFooter = inlineCitationEnabled ? buildCitationFooter(builtContext.citations) : "";
    const replyWithCitations = finalReply + citationFooter;
    
    await saveChatHistory(
      request.doctorId,
      sessionId,
      "user",
      request.message,
      request.patientId || null,
      [],
      0, 0, llmResult.model, 0, []
    );
    
    await saveChatHistory(
      request.doctorId,
      sessionId,
      "assistant",
      replyWithCitations,
      request.patientId || null,
      allFlags,
      llmResult.tokensIn,
      llmResult.tokensOut,
      llmResult.model,
      llmResult.latencyMs,
      builtContext.citations
    );
    
    generateLearnedConversationDraft(request.doctorId, sessionId).catch(err => {
      console.error("Error generating learned conversation draft:", err);
    });

    // 환자 대화를 patient_sources에 저장 (비동기, 에러 격리)
    if (request.patientId) {
      saveConversationToPatientSources(
        request.patientId,
        sessionId,
        request.message,
        replyWithCitations
      ).catch(err => {
        console.error("[AgentChat] Failed to save conversation to patient_sources:", err);
      });
    }

    return {
      reply: replyWithCitations,
      sessionId,
      citations: inlineCitationEnabled ? builtContext.citations : [],
      safetyFlags: allFlags,
      tokensIn: llmResult.tokensIn,
      tokensOut: llmResult.tokensOut,
      model: llmResult.model,
      latencyMs: Date.now() - startTime,
      isEmergency: false,
    };
  } catch (postError: any) {
    console.error("[AgentChat] Post-processing error:", postError);
    return {
      reply: llmResult.content,
      sessionId,
      citations: [],
      safetyFlags: [],
      tokensIn: llmResult.tokensIn,
      tokensOut: llmResult.tokensOut,
      model: llmResult.model,
      latencyMs: Date.now() - startTime,
      isEmergency: false,
    };
  }
}

/**
 * Streaming Agent Chat - 첫 토큰 빠른 응답 지원
 * SSE (Server-Sent Events)를 통한 실시간 스트리밍
 */
export async function* chatStream(request: AgentChatRequest): AsyncGenerator<{ type: string; data: any }> {
  const startTime = Date.now();
  const sessionId = request.sessionId || uuidv4();
  
  // Step 1: API 키 상태 검증
  const apiStatus = checkApiKeyStatus();
  if (!apiStatus.anyAvailable) {
    yield { type: "error", data: { message: "AI 서비스를 이용할 수 없습니다." } };
    return;
  }
  
  // Step 2: Safety Pre-check
  let preCheck;
  try {
    preCheck = preCheckSafety(request.message);
    if (!preCheck.isPass && preCheck.emergencyResponse) {
      yield { type: "message", data: { content: preCheck.emergencyResponse, isComplete: true } };
      return;
    }
  } catch {
    preCheck = { isPass: true, flags: [] };
  }
  
  // Step 2.5: Resolve orgId for RAG data isolation (CRITICAL — 2026-03-18)
  const resolvedOrgId = await resolveDoctorOrgId(request.doctorId, request.patientId);

  // Step 3: RAG Retrieval (non-streaming part)
  yield { type: "status", data: { stage: "retrieving" } };

  let retrievalResult;
  try {
    retrievalResult = await retrieveMultiIndex(request.message, {
      doctorId: request.doctorId,
      orgId: resolvedOrgId,
      patientId: request.patientId,
      includePatientContext: request.includePatientContext,
      topK: 50,
      enableQueryExpansion: true,
    });
  } catch (ragError: any) {
    yield { type: "error", data: { message: "검색 중 오류가 발생했습니다." } };
    return;
  }
  
  // Confidence check - INSUFFICIENT에서도 LLM 응답 생성 진행
  const { confidenceMetrics } = retrievalResult;
  console.log(`[AgentChat Stream] Confidence: ${confidenceMetrics.confidenceLevel}, maxScore=${confidenceMetrics.maxScore.toFixed(3)}`);
  // INSUFFICIENT인 경우에도 LLM 호출하여 일반 의료 지식 기반 응답 생성
  
  // Step 4: Context building
  yield { type: "status", data: { stage: "building_context" } };
  
  let builtContext: { context: string; citations: any[]; tokensUsed: number; sourcesUsed: number };
  try {
    const ranked = rerank(request.message, retrievalResult.sources);
    const diversified = diversifyResults(ranked, 10);
    builtContext = buildContext(diversified, {});
  } catch (contextError: any) {
    yield { type: "error", data: { message: "컨텍스트 생성 중 오류가 발생했습니다." } };
    return;
  }
  
  let streamInlineCitationEnabled = false;
  try {
    const { patients } = await import("@shared/schema");
    let orgId: string | null = null;
    
    if (request.patientId) {
      const patient = await db.select({ orgId: patients.orgId }).from(patients).where(eq(patients.id, request.patientId)).limit(1);
      if (patient.length > 0) orgId = patient[0].orgId;
    }
    
    if (!orgId) {
      const anyPatient = await db.select({ orgId: patients.orgId }).from(patients).limit(1);
      if (anyPatient.length > 0) orgId = anyPatient[0].orgId;
    }
    
    if (orgId && !request.isPatientFacing) {
      const settings = await db.select().from(hospitalSettings).where(eq(hospitalSettings.orgId, orgId)).limit(1);
      if (settings.length > 0) {
        streamInlineCitationEnabled = settings[0].inlineCitationEnabled ?? false;
      }
    }
  } catch (settingsErr) {
    console.error("[AgentChat Stream] Failed to fetch citation settings:", settingsErr);
  }
  
  // Step 5: LLM Streaming Response
  yield { type: "status", data: { stage: "generating" } };
  
  try {
    const { hospitalName, clinicContext, doctorContext } = await getHospitalContext(request.doctorId, request.patientId);
    const doctorPlanId = await getDoctorPlanId(request.doctorId);
    const systemPrompt = await buildSystemPrompt(hospitalName, doctorContext, clinicContext, doctorPlanId);

    // 환자 컨텍스트 블록 빌드 (patientId가 있을 때만)
    let patientContextBlock = "";
    if (request.patientId) {
      const rawContext = await buildPatientContextBlock(request.patientId, {
        includeConversationHistory: true,
        currentRoomId: sessionId,
      });
      if (rawContext) {
        patientContextBlock = "\n\n" + PATIENT_CONTEXT_WRAPPER.replace("{{patient_context}}", rawContext);
      }
    }

    const chatHistory = await getChatHistory(request.doctorId, sessionId, 100);
    console.log(`[AgentChat Stream] Chat history loaded: ${chatHistory.length} messages for session ${sessionId}`);

    const citationGuide = buildInlineCitationPromptGuide(streamInlineCitationEnabled);
    const ragContextBlock = streamInlineCitationEnabled
      ? `\n\n[참고 자료]\n${builtContext.context}\n\n${citationGuide}\n응답 시 위 자료를 참고하고, 관련 출처 번호를 표시하세요.`
      : `\n\n[참고 자료]\n${builtContext.context}`;
    let enrichedSystemPrompt = systemPrompt + patientContextBlock + ragContextBlock + `\n\n[대화 지침]\n- 이전 대화 내용을 기억하고, 사용자의 후속 질문에는 이전 맥락을 반영하여 답변하세요.\n- 사용자가 "그럼", "그러면", "그것은", "아까" 등의 표현을 사용하면 이전 대화를 참조하세요.\n- 위 참고 자료는 현재 질문에 대한 보조 정보입니다. 이전 대화 맥락과 함께 활용하세요.`;
    
    if (request.systemPromptAddition) {
      enrichedSystemPrompt += `\n\n${request.systemPromptAddition}`;
    }
    
    const hasImageAttachments = request.attachments?.some(a => a.type === "image");
    let userMessageContent: ChatMessage["content"];
    
    if (hasImageAttachments && request.attachments) {
      const contentParts: any[] = [];
      
      if (request.message.trim()) {
        contentParts.push({ type: "text" as const, text: request.message });
      } else {
        contentParts.push({ type: "text" as const, text: "이 이미지를 분석해주세요." });
      }
      
      for (const att of request.attachments) {
        if (att.type === "image" && att.url) {
          try {
            const imageBase64 = await resolveImageToBase64(att.url, att.mimeType);
            if (imageBase64) {
              contentParts.push({
                type: "image_url" as const,
                image_url: { url: imageBase64, detail: "auto" as const }
              });
            } else {
              console.log(`[AgentChat Stream] Could not resolve image: ${att.url}`);
            }
          } catch (imgErr: any) {
            console.error(`[AgentChat Stream] Image resolve error: ${imgErr?.message}`);
          }
        }
      }
      
      const resolvedImages = contentParts.filter((p: any) => p.type === "image_url").length;
      console.log(`[AgentChat Stream] Vision mode: ${resolvedImages} images resolved`);
      
      if (resolvedImages > 0) {
        userMessageContent = contentParts;
        enrichedSystemPrompt += `\n\n[이미지 분석 지침]\n사용자가 이미지를 첨부했습니다. 이미지를 주의 깊게 분석하고:\n1. 이미지에서 관찰되는 내용을 상세히 설명하세요\n2. 의료 이미지(엑스레이, 피부 사진, 증상 사진 등)인 경우 관찰 소견을 제공하세요\n3. RAG 지식을 참고하여 관련 조언을 제공하세요\n4. 정확한 진단은 전문의 진료가 필요하다고 안내하세요`;
      } else {
        userMessageContent = request.message || "이미지를 첨부했지만 처리할 수 없었습니다.";
        console.log(`[AgentChat Stream] All images failed to resolve, falling back to text-only mode`);
      }
    } else {
      userMessageContent = request.message;
    }
    
    const messages: ChatMessage[] = [
      { role: "system", content: enrichedSystemPrompt },
      ...chatHistory,
      { role: "user", content: userMessageContent },
    ];
    
    await saveChatHistory(
      request.doctorId,
      sessionId,
      "user",
      request.message,
      request.patientId || null,
      [],
      0, 0, "stream", 0, []
    );
    
    let fullContent = "";
    let firstTokenLatency = 0;
    let assistantSaved = false;
    
    try {
      for await (const chunk of llmRouter.chatStream(messages, {
        temperature: 0.7,
        maxTokens: 2500,
      })) {
        if (!firstTokenLatency) {
          firstTokenLatency = Date.now() - startTime;
          console.log(`[AgentChat Stream] First token in ${firstTokenLatency}ms`);
        }
        
        const cleanedChunk = chunk.content.replace(/\*\*/g, "").replace(/^#{1,4}\s/gm, "");
        fullContent += cleanedChunk;
        yield { 
          type: "message", 
          data: { 
            content: cleanedChunk, 
            isComplete: chunk.isDone || false 
          } 
        };
      }
      
      const postCheck = postCheckSafety(fullContent);
      const finalReply = postCheck.modifiedContent || fullContent;
      const allFlags = combineSafetyFlags(preCheck, postCheck);
      const totalLatency = Date.now() - startTime;
      const citationFooter = streamInlineCitationEnabled ? buildCitationFooter(builtContext.citations) : "";
      const replyWithCitations = finalReply + citationFooter;
      
      await saveChatHistory(
        request.doctorId,
        sessionId,
        "assistant",
        replyWithCitations,
        request.patientId || null,
        allFlags,
        0, 0, "stream",
        totalLatency,
        builtContext.citations
      );
      assistantSaved = true;
      console.log(`[AgentChat Stream] Chat history saved for session ${sessionId} (${chatHistory.length} prior messages)`);

      // 환자 대화를 patient_sources에 저장 (비동기, 에러 격리)
      if (request.patientId) {
        saveConversationToPatientSources(
          request.patientId,
          sessionId,
          request.message,
          replyWithCitations
        ).catch(err => {
          console.error("[AgentChat Stream] Failed to save conversation to patient_sources:", err);
        });
      }

      yield {
        type: "done",
        data: {
          sessionId,
          citations: streamInlineCitationEnabled ? builtContext.citations : [],
          safetyFlags: allFlags,
          firstTokenLatency,
          totalLatency,
        }
      };
    } finally {
      if (!assistantSaved && fullContent.length > 0) {
        const partialContent = fullContent + "\n\n(응답이 중단되었습니다)";
        saveChatHistory(
          request.doctorId,
          sessionId,
          "assistant",
          partialContent,
          request.patientId || null,
          [],
          0, 0, "stream-partial",
          Date.now() - startTime,
          []
        ).catch(err => console.error("[AgentChat Stream] Failed to save partial history:", err));
        console.log(`[AgentChat Stream] Partial response saved on disconnect for session ${sessionId}`);
      }
    }
    
  } catch (llmError: any) {
    console.error("[AgentChat Stream] LLM error:", llmError?.message, llmError?.status, llmError?.code);
    const errorMsg = "죄송합니다. 응답 생성 중 오류가 발생했습니다. 다시 시도해주세요.";
    saveChatHistory(
      request.doctorId,
      sessionId,
      "assistant",
      errorMsg,
      request.patientId || null,
      [],
      0, 0, "stream-error",
      Date.now() - startTime,
      []
    ).catch(err => console.error("[AgentChat Stream] Failed to save error history:", err));
    yield { type: "error", data: { message: errorMsg } };
  }
}

/**
 * Generic Agent Chat Request — 범용 건강상담 AI (RAG 미사용)
 * agentMode === "generic"인 파트너 환경에서 사용.
 * doctor_knowledge, patient_sources를 검색하지 않고,
 * 범용 시스템 프롬프트 + 병원 정보만으로 응답 생성.
 */
export interface GenericChatRequest {
  message: string;
  sessionId?: string;
  orgId?: string;
  /** 병원명 — hospitalSettings에서 조회하여 전달 */
  hospitalName?: string;
  /** 병원 안내 정보 (영업시간, 주소, 전화번호 등) */
  hospitalInfo?: string;
  /** 환자 식별 (선택) — 대화 히스토리 분리용 */
  patientId?: string;
}

export interface GenericChatResponse {
  reply: string;
  sessionId: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  latencyMs: number;
}

const GENERIC_SYSTEM_PROMPT = `당신은 닥톡AI 건강상담 AI입니다.
일반적인 건강 상담과 병원 안내를 도와드립니다.

## 역할
- 증상에 대한 일반적인 건강 정보 제공
- 병원 안내 (영업시간, 위치 등)
- 내원 필요성 안내

## 제한사항
- 진단이나 처방을 하지 마세요. 반드시 내원을 안내하세요.
- 응급 상황이면 즉시 119 또는 응급실 방문을 안내하세요.
- 약물 복용/중단 결정은 반드시 담당의와 상의하도록 안내하세요.
- 한국어로 답변하세요.
- 친절하고 공감하는 톤으로 답변하세요.`;

export async function genericChat(request: GenericChatRequest): Promise<GenericChatResponse> {
  const startTime = Date.now();
  const sessionId = request.sessionId || uuidv4();

  const apiStatus = checkApiKeyStatus();
  if (!apiStatus.anyAvailable) {
    return {
      reply: "현재 AI 서비스를 이용할 수 없습니다. 시스템 관리자에게 문의해 주세요.",
      sessionId,
      tokensIn: 0,
      tokensOut: 0,
      model: "fallback-no-api",
      latencyMs: Date.now() - startTime,
    };
  }

  // Safety Pre-check
  const preCheck = preCheckSafety(request.message);
  if (!preCheck.isPass && preCheck.emergencyResponse) {
    return {
      reply: preCheck.emergencyResponse,
      sessionId,
      tokensIn: 0,
      tokensOut: 0,
      model: "safety-check",
      latencyMs: Date.now() - startTime,
    };
  }

  // Build system prompt with hospital context
  let systemPrompt = GENERIC_SYSTEM_PROMPT;
  if (request.hospitalName) {
    systemPrompt += `\n\n## 병원 정보\n병원명: ${request.hospitalName}`;
  }
  if (request.hospitalInfo) {
    systemPrompt += `\n${request.hospitalInfo}`;
  }

  // Get chat history for continuity (use a generic doctorId for storage)
  const genericDoctorId = `generic_${request.orgId || "system"}`;
  const chatHistory = await getChatHistory(genericDoctorId, sessionId, 50);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: request.message },
  ];

  try {
    const llmResult = await llmRouter.chat(messages, {
      temperature: 0.7,
      maxTokens: 2000,
    });

    const cleanedContent = llmResult.content.replace(/\*\*/g, "").replace(/^#{1,4}\s/gm, "");
    const postCheck = postCheckSafety(cleanedContent);
    const finalReply = postCheck.modifiedContent || cleanedContent;

    // Save history
    await saveChatHistory(genericDoctorId, sessionId, "user", request.message, request.patientId || null, [], 0, 0, llmResult.model, 0, []);
    await saveChatHistory(genericDoctorId, sessionId, "assistant", finalReply, request.patientId || null, [], llmResult.tokensIn, llmResult.tokensOut, llmResult.model, Date.now() - startTime, []);

    return {
      reply: finalReply,
      sessionId,
      tokensIn: llmResult.tokensIn,
      tokensOut: llmResult.tokensOut,
      model: llmResult.model,
      latencyMs: Date.now() - startTime,
    };
  } catch (llmError: any) {
    console.error("[GenericChat] LLM error:", llmError?.message);
    return {
      reply: "죄송합니다. 현재 AI 서비스에 문제가 있습니다. 잠시 후 다시 시도해 주세요.",
      sessionId,
      tokensIn: 0,
      tokensOut: 0,
      model: "fallback-error",
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Generic Agent Chat Stream — SSE 스트리밍 버전
 */
export async function* genericChatStream(request: GenericChatRequest): AsyncGenerator<{ type: string; data: any }> {
  const startTime = Date.now();
  const sessionId = request.sessionId || uuidv4();

  const apiStatus = checkApiKeyStatus();
  if (!apiStatus.anyAvailable) {
    yield { type: "error", data: { message: "AI 서비스를 이용할 수 없습니다." } };
    return;
  }

  // Safety Pre-check
  const preCheck = preCheckSafety(request.message);
  if (!preCheck.isPass && preCheck.emergencyResponse) {
    yield { type: "message", data: { content: preCheck.emergencyResponse, isComplete: true } };
    return;
  }

  // Build system prompt
  let systemPrompt = GENERIC_SYSTEM_PROMPT;
  if (request.hospitalName) {
    systemPrompt += `\n\n## 병원 정보\n병원명: ${request.hospitalName}`;
  }
  if (request.hospitalInfo) {
    systemPrompt += `\n${request.hospitalInfo}`;
  }

  const genericDoctorId = `generic_${request.orgId || "system"}`;
  const chatHistory = await getChatHistory(genericDoctorId, sessionId, 50);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: request.message },
  ];

  yield { type: "status", data: { stage: "generating" } };

  // Save user message
  await saveChatHistory(genericDoctorId, sessionId, "user", request.message, request.patientId || null, [], 0, 0, "stream", 0, []);

  let fullContent = "";
  let assistantSaved = false;

  try {
    for await (const chunk of llmRouter.chatStream(messages, {
      temperature: 0.7,
      maxTokens: 2000,
    })) {
      const cleanedChunk = chunk.content.replace(/\*\*/g, "").replace(/^#{1,4}\s/gm, "");
      fullContent += cleanedChunk;
      yield {
        type: "message",
        data: { content: cleanedChunk, isComplete: chunk.isDone || false },
      };
    }

    const postCheck = postCheckSafety(fullContent);
    const finalReply = postCheck.modifiedContent || fullContent;

    await saveChatHistory(genericDoctorId, sessionId, "assistant", finalReply, request.patientId || null, [], 0, 0, "stream", Date.now() - startTime, []);
    assistantSaved = true;

    yield {
      type: "done",
      data: { sessionId, totalLatency: Date.now() - startTime },
    };
  } catch (llmError: any) {
    console.error("[GenericChat Stream] LLM error:", llmError?.message);
    yield { type: "error", data: { message: "응답 생성 중 오류가 발생했습니다." } };
  } finally {
    if (!assistantSaved && fullContent.length > 0) {
      saveChatHistory(genericDoctorId, sessionId, "assistant", fullContent + "\n\n(응답이 중단되었습니다)", request.patientId || null, [], 0, 0, "stream-partial", Date.now() - startTime, []).catch(() => {});
    }
  }
}

export async function approveLearnedConversation(
  conversationId: string,
  approvedBy: string
): Promise<{ success: boolean; ragDocumentId?: string }> {
  const conversation = await db.select()
    .from(agentLearnedConversations)
    .where(eq(agentLearnedConversations.id, conversationId))
    .limit(1);
  
  if (conversation.length === 0) {
    return { success: false };
  }
  
  const conv = conversation[0];
  
  if (conv.hasRiskExpression || conv.hasPatientPii) {
    return { success: false };
  }
  
  const ragDocumentId = uuidv4();
  
  await db.update(agentLearnedConversations)
    .set({
      isApproved: true,
      approvedBy,
      approvedAt: new Date(),
      promotedToRagDocumentId: ragDocumentId,
    })
    .where(eq(agentLearnedConversations.id, conversationId));
  
  return { success: true, ragDocumentId };
}

export async function getChatSessions(doctorId: string, limit: number = 20): Promise<Array<{
  sessionId: string;
  messageCount: number;
  lastMessage: string;
  lastMessageAt: Date;
}>> {
  const sessions = await db.select()
    .from(agentChatHistory)
    .where(eq(agentChatHistory.doctorId, doctorId))
    .orderBy(desc(agentChatHistory.createdAt));
  
  const sessionMap = new Map<string, {
    messageCount: number;
    lastMessage: string;
    lastMessageAt: Date;
  }>();
  
  for (const msg of sessions) {
    if (!sessionMap.has(msg.sessionId)) {
      sessionMap.set(msg.sessionId, {
        messageCount: 0,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
      });
    }
    const session = sessionMap.get(msg.sessionId)!;
    session.messageCount++;
  }
  
  return Array.from(sessionMap.entries())
    .map(([sessionId, data]) => ({ sessionId, ...data }))
    .slice(0, limit);
}

export async function getPendingApprovals(doctorId: string): Promise<Array<{
  id: string;
  question: string;
  answer: string;
  summary: string | null;
  sessionId: string;
  qaQualityScore: number;
  hasRagEvidence: boolean;
  createdAt: Date;
}>> {
  const pending = await db.select()
    .from(agentLearnedConversations)
    .where(
      and(
        eq(agentLearnedConversations.doctorId, doctorId),
        eq(agentLearnedConversations.isApproved, false),
        eq(agentLearnedConversations.hasRiskExpression, false),
        eq(agentLearnedConversations.hasPatientPii, false)
      )
    )
    .orderBy(desc(agentLearnedConversations.createdAt));

  return pending.map(p => ({
    id: p.id,
    question: p.question,
    answer: p.answer,
    summary: p.summary || null,
    sessionId: p.sessionId,
    qaQualityScore: p.qaQualityScore || 0,
    hasRagEvidence: p.hasRagEvidence ?? false,
    createdAt: p.createdAt,
  }));
}

export async function getApprovedConversations(doctorId: string): Promise<Array<{
  id: string;
  question: string;
  answer: string;
  summary: string | null;
  sessionId: string;
  qaQualityScore: number;
  approvedAt: Date | null;
}>> {
  const approved = await db.select()
    .from(agentLearnedConversations)
    .where(
      and(
        eq(agentLearnedConversations.doctorId, doctorId),
        eq(agentLearnedConversations.isApproved, true)
      )
    )
    .orderBy(desc(agentLearnedConversations.approvedAt));

  return approved.map(a => ({
    id: a.id,
    question: a.question,
    answer: a.answer,
    summary: a.summary || null,
    sessionId: a.sessionId,
    qaQualityScore: a.qaQualityScore || 0,
    approvedAt: a.approvedAt ? new Date(a.approvedAt) : null,
  }));
}

export async function batchApproveLearnedConversations(
  conversationIds: string[],
  approvedBy: string
): Promise<{ successCount: number; failedIds: string[] }> {
  const failedIds: string[] = [];
  let successCount = 0;

  for (const id of conversationIds) {
    const result = await approveLearnedConversation(id, approvedBy);
    if (result.success) {
      successCount++;
    } else {
      failedIds.push(id);
    }
  }

  return { successCount, failedIds };
}
