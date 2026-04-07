/**
 * RAG Retriever - 다중 인덱스 검색 서비스
 * 
 * 검색 우선순위:
 * 1순위: Doctor Persona RAG (의사 고유 진료/상담/처방 패턴)
 * 2순위: Clinic Policy RAG (병원 안내/진료시간/검사준비/가격정책)
 * 3순위: Patient Context (해당 환자 소스 업로드/EMR 요약) - 권한 있을 때만
 * 4순위: Approved Learned QA (승인된 대화 지식)
 * 
 * 설정은 ragConfig 테이블에서 동적으로 로드되며 5분간 캐싱됩니다.
 */

import { db } from "../../db";
import { ragDocuments, doctorKnowledge, agentLearnedConversations, patientFacts, ragConfig } from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { embeddingRouter, cosineSimilarity, EMBEDDING_CONFIG } from "../llm/embedding";
import { embeddingToVectorLiteral } from "../../services/pgvectorMigration";
import { encryptionService } from "../../services/encryptionService";
import OpenAI from "openai";

// ==================== Dynamic RAG Configuration ====================

interface RagConfigCache {
  sourcePriority: Record<string, number>;
  confidenceThresholds: { HIGH: number; MEDIUM: number; LOW: number; MIN_RELIABLE_SOURCES: number };
  keywordThresholds: { HIGH: number; MEDIUM: number; LOW: number };
  tierLimits: Record<string, { limit: number; minScore: number }>;
  lastLoaded: number;
}

// Default values (fallback if DB not initialized)
const DEFAULT_SOURCE_PRIORITY: Record<string, number> = {
  PERSONA: 100,
  POLICY: 80,
  EMR: 70,
  UPLOAD: 60,
  LEARNED_QA: 50,
  FAQ_CARD: 40,
};

const DEFAULT_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.5,
  MEDIUM: 0.3,
  LOW: 0.05,
  MIN_RELIABLE_SOURCES: 2,
};

const DEFAULT_KEYWORD_THRESHOLDS = {
  HIGH: 0.30,
  MEDIUM: 0.15,
  LOW: 0.03,
};

const DEFAULT_TIER_LIMITS: Record<string, { limit: number; minScore: number }> = {
  PERSONA: { limit: 5, minScore: 0 },
  POLICY: { limit: 4, minScore: 0.05 },
  EMR: { limit: 8, minScore: 0 },
  UPLOAD: { limit: 4, minScore: 0.1 },
  LEARNED_QA: { limit: 3, minScore: 0.15 },
  FAQ_CARD: { limit: 3, minScore: 0.15 },
  OTHER: { limit: 3, minScore: 0.2 },
};

// Config cache (5 minute TTL)
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let configCache: RagConfigCache | null = null;

async function loadRagConfig(): Promise<RagConfigCache> {
  // Return cached config if still valid
  if (configCache && Date.now() - configCache.lastLoaded < CONFIG_CACHE_TTL) {
    return configCache;
  }
  
  try {
    const configs = await db.select().from(ragConfig);
    
    const configMap = new Map<string, any>();
    for (const cfg of configs) {
      configMap.set(cfg.configKey, cfg.configValue);
    }
    
    configCache = {
      sourcePriority: configMap.get("SOURCE_PRIORITY") || DEFAULT_SOURCE_PRIORITY,
      confidenceThresholds: configMap.get("CONFIDENCE_THRESHOLDS") || DEFAULT_CONFIDENCE_THRESHOLDS,
      keywordThresholds: configMap.get("KEYWORD_THRESHOLDS") || DEFAULT_KEYWORD_THRESHOLDS,
      tierLimits: configMap.get("TIER_LIMITS") || DEFAULT_TIER_LIMITS,
      lastLoaded: Date.now(),
    };
    
    console.log("[RAG Config] Loaded from database");
    return configCache;
  } catch (error) {
    console.log("[RAG Config] Failed to load from DB, using defaults:", error);
    return {
      sourcePriority: DEFAULT_SOURCE_PRIORITY,
      confidenceThresholds: DEFAULT_CONFIDENCE_THRESHOLDS,
      keywordThresholds: DEFAULT_KEYWORD_THRESHOLDS,
      tierLimits: DEFAULT_TIER_LIMITS,
      lastLoaded: Date.now(),
    };
  }
}

// Force refresh config cache (called when config is updated via admin)
export function invalidateRagConfigCache(): void {
  configCache = null;
  console.log("[RAG Config] Cache invalidated");
}

// Get current config (for API responses)
export async function getRagConfigSnapshot(): Promise<Omit<RagConfigCache, 'lastLoaded'>> {
  const config = await loadRagConfig();
  return {
    sourcePriority: config.sourcePriority,
    confidenceThresholds: config.confidenceThresholds,
    keywordThresholds: config.keywordThresholds,
    tierLimits: config.tierLimits,
  };
}

// ==================== Type Definitions ====================

export interface RagSource {
  id: string;
  sourceType: string;
  title: string;
  content: string;
  embedding: number[];
  priority: number;
  score?: number;
}

export interface RetrievalResult {
  sources: RagSource[];
  query: string;
  queryEmbedding: number[];
  totalFound: number;
  confidenceMetrics: ConfidenceMetrics;
  usedKeywordFallback: boolean;
}

export interface ConfidenceMetrics {
  maxScore: number;
  avgScore: number;
  highConfidenceCount: number;
  isReliable: boolean;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
}

export interface RetrievalOptions {
  doctorId: string;
  orgId: string;
  patientId?: string;
  includePatientContext?: boolean;
  topK?: number;
  enableQueryExpansion?: boolean;
}

let _qeClient: any = null;
let _qeFailCount = 0;
let _qeLastFailTime = 0;
const QE_CIRCUIT_BREAK_THRESHOLD = 3;
const QE_CIRCUIT_BREAK_COOLDOWN = 60000;

function getQEClient() {
  if (!_qeClient) {
    _qeClient = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      timeout: 5000,
    });
  }
  return _qeClient;
}

async function expandQuery(query: string): Promise<string[]> {
  if (!query || query.length < 3) return [query];
  if (_qeFailCount >= QE_CIRCUIT_BREAK_THRESHOLD && Date.now() - _qeLastFailTime < QE_CIRCUIT_BREAK_COOLDOWN) {
    return [query];
  }
  try {
    const client = getQEClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `의료/건강 맥락에서 다음 질문을 검색용으로 확장하세요. 원본 질문의 의미를 유지하면서 관련 의학 용어, 동의어를 포함한 2-3개의 변형 질문을 줄바꿈으로 출력하세요. 원본도 포함하세요.\n\n질문: "${query}"` }],
      max_tokens: 200,
      temperature: 0.3,
    });
    _qeFailCount = 0;
    const text = response.choices?.[0]?.message?.content || "";
    const expanded = text.split("\n").map((l: string) => l.replace(/^\d+[\.\)\-]\s*/, "").trim()).filter((l: string) => l.length > 2);
    if (expanded.length > 0) {
      console.log(`[QueryExpansion] "${query}" → ${expanded.length} variants`);
      return expanded.slice(0, 3);
    }
  } catch (err: any) {
    _qeFailCount++;
    _qeLastFailTime = Date.now();
    console.warn(`[QueryExpansion] Failed (${_qeFailCount}/${QE_CIRCUIT_BREAK_THRESHOLD}):`, err?.message);
  }
  return [query];
}

// 키워드 기반 점수 계산 (임베딩 fallback용) - 한국어 지원 개선
function calculateKeywordScore(query: string, content: string, title: string): number {
  const queryLower = query.toLowerCase();
  const searchText = `${title} ${content}`.toLowerCase();
  
  // 공백으로 분리 + 한국어를 위한 2-gram 생성
  const spaceTokens = queryLower.split(/\s+/).filter(kw => kw.length > 1);
  const ngrams: string[] = [];
  
  // 2-gram 생성 (한국어에서 공백 없이 붙어있는 단어 처리)
  for (const token of spaceTokens) {
    if (token.length >= 2) {
      for (let i = 0; i <= token.length - 2; i++) {
        ngrams.push(token.slice(i, i + 2));
      }
    }
  }
  
  const keywords = Array.from(new Set([...spaceTokens, ...ngrams]));
  if (keywords.length === 0) return 0.15; // 낮은 기본 점수
  
  let matchCount = 0;
  for (const kw of keywords) {
    if (searchText.includes(kw)) matchCount++;
  }
  
  // 키워드 fallback은 0.4 이하로 제한 (cosine similarity 대비 신뢰도 낮음)
  const rawScore = matchCount / keywords.length;
  return Math.min(rawScore * 0.8, 0.4);
}

/**
 * TurboQuant 2-Tier Vector Search for rag_documents
 * Stage 3: coarse (256d halfvec) → fine (512d halfvec) reranking
 * Fallback: legacy 1536d vector if v2 columns not populated
 */
async function vectorSearchRagDocuments(
  queryVecs: { full: string; coarse: string; legacy?: string },
  doctorId: string,
  limit: number,
  sourcePriority: Record<string, number>,
  orgId: string
): Promise<RagSource[]> {
  try {
    // Check if v2 embeddings exist
    const hasV2 = await checkV2Available("rag_documents", doctorId, orgId);

    let results;
    if (hasV2) {
      // Stage 3: 2-tier search — coarse retrieve → fine rerank
      const coarseLimit = Math.min(limit * 3, 150); // 3x candidates from coarse
      results = await db.execute(sql`
        WITH coarse_candidates AS (
          SELECT id, source_type, title, content,
            1 - (embedding_coarse <=> ${queryVecs.coarse}::halfvec) as coarse_sim
          FROM rag_documents
          WHERE doctor_id = ${doctorId}
            AND org_id = ${orgId}
            AND status = 'ACTIVE'
            AND embedding_coarse IS NOT NULL
          ORDER BY embedding_coarse <=> ${queryVecs.coarse}::halfvec
          LIMIT ${coarseLimit}
        )
        SELECT c.id, c.source_type, c.title, c.content,
          1 - (r.embedding_v2 <=> ${queryVecs.full}::halfvec) as similarity
        FROM coarse_candidates c
        JOIN rag_documents r ON r.id = c.id
        WHERE r.embedding_v2 IS NOT NULL
        ORDER BY r.embedding_v2 <=> ${queryVecs.full}::halfvec
        LIMIT ${limit}
      `);
    } else {
      // Fallback: legacy 1536d
      const legacyVec = queryVecs.legacy || queryVecs.full;
      results = await db.execute(sql`
        SELECT id, source_type, title, content,
          1 - (embedding_vec <=> ${legacyVec}::vector) as similarity
        FROM rag_documents
        WHERE doctor_id = ${doctorId}
          AND org_id = ${orgId}
          AND status = 'ACTIVE'
          AND embedding_vec IS NOT NULL
        ORDER BY embedding_vec <=> ${legacyVec}::vector
        LIMIT ${limit}
      `);
    }

    return ((results as any).rows || []).map((row: any) => ({
      id: row.id,
      sourceType: row.source_type || "UPLOAD",
      title: row.title,
      content: row.content,
      embedding: [],
      priority: sourcePriority[row.source_type || "UPLOAD"] || 50,
      score: parseFloat(row.similarity) || 0,
    }));
  } catch (error) {
    console.error("[RAG] pgvector search failed for rag_documents:", error);
    return [];
  }
}

function decryptContentIfNeeded(content: string, encryptedContent: string | null, isEncrypted: boolean): string {
  if (!isEncrypted || !encryptedContent) return content;
  if (content && content !== "[암호화됨]" && content !== "[암호화된 콘텐츠]") return content;
  try {
    if (encryptionService.isEnabled()) {
      return encryptionService.decryptPii(encryptedContent);
    }
  } catch (err) {
    console.warn("[RAG] Failed to decrypt knowledge content:", err);
  }
  return content;
}

/**
 * TurboQuant 2-Tier Vector Search for doctor_knowledge
 */
async function vectorSearchDoctorKnowledge(
  queryVecs: { full: string; coarse: string; legacy?: string },
  doctorId: string,
  limit: number,
  sourcePriority: Record<string, number>,
  metadataFilters?: { sourceType?: string; sectionId?: string; organSystem?: string; severityTag?: string },
  orgId?: string
): Promise<RagSource[]> {
  try {
    // Build parameterized metadata filters (no string interpolation — SQL injection prevention)
    let baseWhere = sql`doctor_id = ${doctorId}
        AND (is_deleted = false OR is_deleted IS NULL)`;

    // orgId 필터 — 데이터 격리 원칙: 같은 org의 지식만 검색 (CRITICAL: 필수)
    if (orgId) {
      baseWhere = sql`${baseWhere} AND org_id = ${orgId}`;
    } else {
      console.warn("[RAG] vectorSearchDoctorKnowledge called without orgId — data isolation may be compromised");
    }

    if (metadataFilters?.sourceType) {
      baseWhere = sql`${baseWhere} AND source_type = ${metadataFilters.sourceType}`;
    }
    if (metadataFilters?.sectionId) {
      baseWhere = sql`${baseWhere} AND metadata->>'section_id' = ${metadataFilters.sectionId}`;
    }
    if (metadataFilters?.organSystem) {
      baseWhere = sql`${baseWhere} AND metadata->>'organ_system' = ${metadataFilters.organSystem}`;
    }
    if (metadataFilters?.severityTag) {
      baseWhere = sql`${baseWhere} AND metadata->>'severity_tag' = ${metadataFilters.severityTag}`;
    }

    const hasV2 = await checkV2Available("doctor_knowledge", doctorId, orgId);

    let results;
    if (hasV2) {
      // Stage 3: 2-tier — coarse 256d → fine 512d
      const coarseLimit = Math.min(limit * 3, 200);
      results = await db.execute(sql`
        WITH coarse_candidates AS (
          SELECT id
          FROM doctor_knowledge
          WHERE ${baseWhere}
            AND embedding_coarse IS NOT NULL
          ORDER BY embedding_coarse <=> ${queryVecs.coarse}::halfvec
          LIMIT ${coarseLimit}
        )
        SELECT dk.id, dk.source_type, dk.title, dk.content, dk.encrypted_content, dk.is_encrypted, dk.metadata,
          1 - (dk.embedding_v2 <=> ${queryVecs.full}::halfvec) as similarity
        FROM coarse_candidates c
        JOIN doctor_knowledge dk ON dk.id = c.id
        WHERE dk.embedding_v2 IS NOT NULL
        ORDER BY dk.embedding_v2 <=> ${queryVecs.full}::halfvec
        LIMIT ${limit}
      `);
    } else {
      // Fallback: legacy 1536d
      const legacyVec = queryVecs.legacy || queryVecs.full;
      results = await db.execute(sql`
        SELECT id, source_type, title, content, encrypted_content, is_encrypted, metadata,
          1 - (embedding_vec <=> ${legacyVec}::vector) as similarity
        FROM doctor_knowledge
        WHERE ${baseWhere}
          AND embedding_vec IS NOT NULL
        ORDER BY embedding_vec <=> ${legacyVec}::vector
        LIMIT ${limit}
      `);
    }

    return ((results as any).rows || []).map((row: any) => {
      const st = row.source_type || '';
      let sourceType = 'FAQ_CARD';
      let priority = sourcePriority.FAQ_CARD || 40;
      if (st === 'PERSONA') { sourceType = 'PERSONA'; priority = sourcePriority.PERSONA || 100; }
      else if (st === 'EMR' || st === 'PATIENT') { sourceType = 'EMR'; priority = sourcePriority.EMR || 70; }
      else if (st === 'UPLOAD') { sourceType = 'UPLOAD'; priority = sourcePriority.UPLOAD || 60; }
      else if (st === 'FILE' || st === 'FILE_RAW' || st === 'HEALTH_CHECKUP') { sourceType = 'UPLOAD'; priority = sourcePriority.UPLOAD || 60; }
      const decryptedContent = decryptContentIfNeeded(row.content, row.encrypted_content, row.is_encrypted === true);

      const metadata = row.metadata || {};
      let metadataBoost = 1.0;
      if (metadata.chunk_type === 'NARRATIVE_SUMMARY' || metadata.chunk_type === 'LAB_ABNORMAL_SUMMARY') {
        metadataBoost = 1.1;
      }
      if (metadata.severity_tag === 'abnormal') {
        metadataBoost *= 1.05;
      }

      return {
        id: row.id,
        sourceType,
        title: row.title,
        content: decryptedContent,
        embedding: [],
        priority,
        score: (parseFloat(row.similarity) || 0) * metadataBoost,
      };
    });
  } catch (error) {
    console.error("[RAG] pgvector search failed for doctor_knowledge:", error);
    return [];
  }
}

/**
 * TurboQuant 2-Tier Vector Search for learned QA
 * orgId 필터 필수 — 데이터 격리 원칙 (CRITICAL)
 */
async function vectorSearchLearnedQA(
  queryVecs: { full: string; coarse: string; legacy?: string },
  doctorId: string,
  limit: number,
  sourcePriority: Record<string, number>,
  orgId?: string
): Promise<RagSource[]> {
  try {
    if (!orgId) {
      console.warn("[RAG] vectorSearchLearnedQA called without orgId — data isolation may be compromised");
    }
    const hasV2 = await checkV2Available("agent_learned_conversations", doctorId, orgId);

    let results;
    if (hasV2) {
      const coarseLimit = Math.min(limit * 3, 100);
      results = await db.execute(sql`
        WITH coarse_candidates AS (
          SELECT id
          FROM agent_learned_conversations
          WHERE doctor_id = ${doctorId}
            ${orgId ? sql`AND org_id = ${orgId}` : sql``}
            AND is_approved = true
            AND embedding_coarse IS NOT NULL
          ORDER BY embedding_coarse <=> ${queryVecs.coarse}::halfvec
          LIMIT ${coarseLimit}
        )
        SELECT alc.id, alc.question, alc.answer,
          1 - (alc.embedding_v2 <=> ${queryVecs.full}::halfvec) as similarity
        FROM coarse_candidates c
        JOIN agent_learned_conversations alc ON alc.id = c.id
        WHERE alc.embedding_v2 IS NOT NULL
        ORDER BY alc.embedding_v2 <=> ${queryVecs.full}::halfvec
        LIMIT ${limit}
      `);
    } else {
      const legacyVec = queryVecs.legacy || queryVecs.full;
      results = await db.execute(sql`
        SELECT id, question, answer,
          1 - (embedding_vec <=> ${legacyVec}::vector) as similarity
        FROM agent_learned_conversations
        WHERE doctor_id = ${doctorId}
          ${orgId ? sql`AND org_id = ${orgId}` : sql``}
          AND is_approved = true
          AND embedding_vec IS NOT NULL
        ORDER BY embedding_vec <=> ${legacyVec}::vector
        LIMIT ${limit}
      `);
    }

    return ((results as any).rows || []).map((row: any) => ({
      id: row.id,
      sourceType: "LEARNED_QA",
      title: (row.question || "").slice(0, 100),
      content: `Q: ${row.question}\nA: ${row.answer}`,
      embedding: [],
      priority: sourcePriority.LEARNED_QA || 50,
      score: parseFloat(row.similarity) || 0,
    }));
  } catch (error) {
    console.error("[RAG] pgvector search failed for learned_conversations:", error);
    return [];
  }
}

// --- TurboQuant Helper: Check if v2 embeddings are available ---
const _v2AvailCache = new Map<string, { available: boolean; checkedAt: number }>();
const V2_CHECK_TTL = 5 * 60 * 1000; // 5 minutes

/** Invalidate v2 availability cache (call after migration batch) */
export function invalidateV2Cache(): void {
  _v2AvailCache.clear();
}

async function checkV2Available(table: string, doctorId: string, orgId?: string): Promise<boolean> {
  const cacheKey = `${table}:${doctorId}:${orgId || ''}`;
  const cached = _v2AvailCache.get(cacheKey);
  if (cached && Date.now() - cached.checkedAt < V2_CHECK_TTL) {
    return cached.available;
  }

  try {
    // Parameterized query — no string interpolation for user-controlled values
    let result;
    if (orgId) {
      result = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM ${sql.raw(table)}
        WHERE doctor_id = ${doctorId}
          AND org_id = ${orgId}
          AND embedding_v2 IS NOT NULL
        LIMIT 1
      `);
    } else {
      result = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM ${sql.raw(table)}
        WHERE doctor_id = ${doctorId}
          AND embedding_v2 IS NOT NULL
        LIMIT 1
      `);
    }
    const count = parseInt((result as any).rows?.[0]?.cnt || '0');
    const available = count > 0;
    _v2AvailCache.set(cacheKey, { available, checkedAt: Date.now() });
    return available;
  } catch {
    return false;
  }
}

async function fallbackKeywordSearch(
  query: string,
  doctorId: string,
  sourcePriority: Record<string, number>,
  metadataFilters?: { sourceType?: string; sectionId?: string; organSystem?: string; severityTag?: string },
  orgId?: string
): Promise<RagSource[]> {
  const allSources: RagSource[] = [];
  const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  
  if (queryTokens.length === 0) return allSources;
  
  const likePatterns = queryTokens.slice(0, 5);
  
  const ragLikeConditions = likePatterns.map(t => 
    sql`(LOWER(${ragDocuments.title}) LIKE ${'%' + t + '%'} OR LOWER(${ragDocuments.content}) LIKE ${'%' + t + '%'})`
  );
  const ragWhereConditions: any[] = [
    eq(ragDocuments.doctorId, doctorId),
    eq(ragDocuments.status, "ACTIVE"),
  ];
  if (orgId) {
    ragWhereConditions.push(eq(ragDocuments.orgId, orgId));
  }
  if (ragLikeConditions.length > 0) {
    ragWhereConditions.push(sql`(${sql.join(ragLikeConditions, sql` OR `)})`);
  }
  
  const ragDocs = await db.select({
    id: ragDocuments.id,
    sourceType: ragDocuments.sourceType,
    title: ragDocuments.title,
    content: ragDocuments.content,
  }).from(ragDocuments).where(
    and(...ragWhereConditions)
  ).limit(200);
  for (const doc of ragDocs) {
    allSources.push({
      id: doc.id,
      sourceType: doc.sourceType || "UPLOAD",
      title: doc.title,
      content: doc.content,
      embedding: [],
      priority: sourcePriority[doc.sourceType || "UPLOAD"] || 50,
      score: calculateKeywordScore(query, doc.content, doc.title),
    });
  }
  
  const knowledgeLikeConditions = likePatterns.map(t => 
    sql`(LOWER(${doctorKnowledge.title}) LIKE ${'%' + t + '%'} OR LOWER(${doctorKnowledge.content}) LIKE ${'%' + t + '%'})`
  );
  const knowledgeWhereConditions: any[] = [
    eq(doctorKnowledge.doctorId, doctorId),
    eq(doctorKnowledge.isDeleted, false),
  ];
  if (orgId) {
    knowledgeWhereConditions.push(eq(doctorKnowledge.orgId, orgId));
  }
  if (knowledgeLikeConditions.length > 0) {
    knowledgeWhereConditions.push(sql`(${sql.join(knowledgeLikeConditions, sql` OR `)})`);
  }
  if (metadataFilters?.sourceType) {
    knowledgeWhereConditions.push(sql`${doctorKnowledge.sourceType} = ${metadataFilters.sourceType}`);
  }
  if (metadataFilters?.organSystem) {
    knowledgeWhereConditions.push(sql`${doctorKnowledge.metadata}->>'organ_system' = ${metadataFilters.organSystem}`);
  }
  if (metadataFilters?.severityTag) {
    knowledgeWhereConditions.push(sql`${doctorKnowledge.metadata}->>'severity_tag' = ${metadataFilters.severityTag}`);
  }
  
  const doctorKnowledgeDocs = await db.select({
    id: doctorKnowledge.id,
    sourceType: doctorKnowledge.sourceType,
    title: doctorKnowledge.title,
    content: doctorKnowledge.content,
    encryptedContent: doctorKnowledge.encryptedContent,
    isEncrypted: doctorKnowledge.isEncrypted,
  }).from(doctorKnowledge).where(
    and(...knowledgeWhereConditions)
  ).limit(500);
  
  for (const doc of doctorKnowledgeDocs) {
    const st = doc.sourceType || "FAQ_CARD";
    const mappedPriority = sourcePriority[st] || sourcePriority.FAQ_CARD || 40;
    const decryptedContent = decryptContentIfNeeded(doc.content, doc.encryptedContent || null, doc.isEncrypted === true);
    allSources.push({
      id: doc.id,
      sourceType: st,
      title: doc.title,
      content: decryptedContent,
      embedding: [],
      priority: mappedPriority,
      score: calculateKeywordScore(query, decryptedContent, doc.title),
    });
  }
  
  const qaLikeConditions = likePatterns.map(t => 
    sql`(LOWER(${agentLearnedConversations.question}) LIKE ${'%' + t + '%'} OR LOWER(${agentLearnedConversations.answer}) LIKE ${'%' + t + '%'})`
  );
  const qaWhereConditions = [
    eq(agentLearnedConversations.doctorId, doctorId),
    eq(agentLearnedConversations.isApproved, true),
  ];
  if (qaLikeConditions.length > 0) {
    qaWhereConditions.push(sql`(${sql.join(qaLikeConditions, sql` OR `)})`);
  }
  
  const learnedQA = await db.select().from(agentLearnedConversations).where(
    and(...qaWhereConditions)
  ).limit(200);
  for (const qa of learnedQA) {
    allSources.push({
      id: qa.id,
      sourceType: "LEARNED_QA",
      title: qa.question.slice(0, 100),
      content: `Q: ${qa.question}\nA: ${qa.answer}`,
      embedding: [],
      priority: sourcePriority.LEARNED_QA || 50,
      score: calculateKeywordScore(query, `Q: ${qa.question}\nA: ${qa.answer}`, qa.question),
    });
  }
  
  return allSources;
}

let _rerankClient: any = null;
let _rerankFailCount = 0;
let _rerankLastFailTime = 0;
const RERANK_CIRCUIT_BREAK_THRESHOLD = 3;
const RERANK_CIRCUIT_BREAK_COOLDOWN = 120000;
const RERANK_MAX_CANDIDATES = 12;
const RERANK_MIN_SOURCES = 3;

function getRerankClient() {
  if (!_rerankClient) {
    _rerankClient = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      timeout: 10000,
    });
  }
  return _rerankClient;
}

async function rerankWithLLM(query: string, sources: RagSource[]): Promise<RagSource[]> {
  if (sources.length < RERANK_MIN_SOURCES) return sources;
  if (_rerankFailCount >= RERANK_CIRCUIT_BREAK_THRESHOLD && Date.now() - _rerankLastFailTime < RERANK_CIRCUIT_BREAK_COOLDOWN) {
    return sources;
  }

  const candidates = sources.slice(0, RERANK_MAX_CANDIDATES);
  const rest = sources.slice(RERANK_MAX_CANDIDATES);

  try {
    const client = getRerankClient();
    const candidateList = candidates.map((s, i) => {
      let desc = `[${i}] ${s.title}\n${s.content.slice(0, 300)}`;
      if ((s as any).metadata) {
        const m = (s as any).metadata;
        if (m.chunk_type) desc += `\n[type: ${m.chunk_type}]`;
        if (m.severity_tag) desc += ` [severity: ${m.severity_tag}]`;
        if (m.organ_system) desc += ` [organ: ${m.organ_system}]`;
      }
      return desc;
    }).join("\n\n");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `의료/건강 질의에 대한 검색 결과를 관련성 순으로 재정렬하세요.

질의: "${query}"

검색 결과:
${candidateList}

위 결과를 질의와의 관련성이 높은 순서로 인덱스만 JSON 배열로 출력하세요.
예: [2, 0, 5, 1, 3, 4]

가장 관련 높은 결과부터 나열하세요.`
      }],
      max_tokens: 200,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    _rerankFailCount = 0;
    const text = response.choices?.[0]?.message?.content || "";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\d,\s]+\]/);
      if (match) parsed = { order: JSON.parse(match[0]) };
    }

    const order: number[] = Array.isArray(parsed) ? parsed : (parsed?.order || parsed?.ranking || parsed?.indices || []);
    if (!Array.isArray(order) || order.length === 0) return sources;

    const validOrder = order.filter(i => typeof i === "number" && i >= 0 && i < candidates.length);
    if (validOrder.length < 2) return sources;

    const reranked: RagSource[] = [];
    const usedIndices = new Set<number>();

    for (const idx of validOrder) {
      if (!usedIndices.has(idx)) {
        const s = candidates[idx];
        s.score = Math.max(s.score || 0, 0.01) * (1 + (validOrder.length - reranked.length) * 0.02);
        reranked.push(s);
        usedIndices.add(idx);
      }
    }

    for (let i = 0; i < candidates.length; i++) {
      if (!usedIndices.has(i)) reranked.push(candidates[i]);
    }

    console.log(`[RAG-Rerank] Reranked ${reranked.length} candidates for query: "${query.slice(0, 40)}"`);
    return [...reranked, ...rest];
  } catch (err: any) {
    _rerankFailCount++;
    _rerankLastFailTime = Date.now();
    console.warn(`[RAG-Rerank] Failed (${_rerankFailCount}/${RERANK_CIRCUIT_BREAK_THRESHOLD}):`, err?.message);
    return sources;
  }
}

export async function retrieveMultiIndex(
  query: string,
  options: RetrievalOptions
): Promise<RetrievalResult> {
  const { doctorId, orgId, patientId, includePatientContext = false, topK = 50, enableQueryExpansion = false } = options;
  
  const ragSettings = await loadRagConfig();
  const SOURCE_PRIORITY = ragSettings.sourcePriority;
  
  const queries = enableQueryExpansion ? await expandQuery(query) : [query];
  const primaryQuery = queries[0];
  
  let queryEmbedding: number[] = [];
  let queryCoarseEmbedding: number[] = [];
  let queryLegacyEmbedding: number[] = [];
  let useKeywordSearch = false;

  try {
    // TurboQuant: Generate dual embeddings (512d full + 256d coarse) in parallel
    // Also generate legacy 1536d for backward compat with unmigrated rows
    const [dualResult, legacyResult] = await Promise.all([
      embeddingRouter.embedDual(primaryQuery),
      embeddingRouter.embedLegacy(primaryQuery),
    ]);
    queryEmbedding = dualResult.full.embedding;
    queryCoarseEmbedding = dualResult.coarse.embedding;
    queryLegacyEmbedding = legacyResult.embedding;
  } catch (embeddingError: any) {
    console.log("[RAG] Embedding failed, falling back to keyword search:", embeddingError?.message);
    useKeywordSearch = true;
  }

  let allSources: RagSource[] = [];

  if (!useKeywordSearch && queryEmbedding.length > 0) {
    const queryVecs = {
      full: embeddingToVectorLiteral(queryEmbedding),
      coarse: embeddingToVectorLiteral(queryCoarseEmbedding),
      legacy: embeddingToVectorLiteral(queryLegacyEmbedding),
    };
    const perTableLimit = Math.ceil(topK * 1.5);

    const [ragResults, knowledgeResults, qaResults, keywordResults] = await Promise.all([
      vectorSearchRagDocuments(queryVecs, doctorId, perTableLimit, SOURCE_PRIORITY, orgId),
      vectorSearchDoctorKnowledge(queryVecs, doctorId, perTableLimit, SOURCE_PRIORITY, undefined, orgId),
      vectorSearchLearnedQA(queryVecs, doctorId, perTableLimit, SOURCE_PRIORITY, orgId),
      fallbackKeywordSearch(query, doctorId, SOURCE_PRIORITY, undefined, orgId),
    ]);
    
    const vectorSources = [...ragResults, ...knowledgeResults, ...qaResults];
    
    const VECTOR_WEIGHT = 0.7;
    const KEYWORD_WEIGHT = 0.3;
    
    const keywordScoreMap = new Map<string, number>();
    for (const kwSource of keywordResults) {
      keywordScoreMap.set(kwSource.id, kwSource.score || 0);
    }
    
    const seenIds = new Set<string>();
    for (const vs of vectorSources) {
      const vectorScore = vs.score || 0;
      const kwScore = keywordScoreMap.get(vs.id) || 0;
      vs.score = (vectorScore * VECTOR_WEIGHT) + (kwScore * KEYWORD_WEIGHT);
      
      if (vs.content) {
        const hasAbnormalQuery = /이상|비정상|높|낮|경계|주의|abnormal/i.test(query);
        const hasAbnormalContent = /이상|⚠️|비정상|높음|낮음|경계|주의|abnormal/i.test(vs.content);
        if (hasAbnormalQuery && hasAbnormalContent) {
          vs.score = Math.min(vs.score * 1.15, 1.0);
        }
      }
      
      allSources.push(vs);
      seenIds.add(vs.id);
    }
    
    for (const kwSource of keywordResults) {
      if (!seenIds.has(kwSource.id)) {
        kwSource.score = (kwSource.score || 0) * KEYWORD_WEIGHT;
        allSources.push(kwSource);
        seenIds.add(kwSource.id);
      }
    }
    
    if (enableQueryExpansion && queries.length > 1) {
      for (const expandedQ of queries.slice(1)) {
        try {
          const [expDual, expLeg] = await Promise.all([
            embeddingRouter.embedDual(expandedQ),
            embeddingRouter.embedLegacy(expandedQ),
          ]);
          if (expDual.full.embedding.length > 0) {
            const expVecs = {
              full: embeddingToVectorLiteral(expDual.full.embedding),
              coarse: embeddingToVectorLiteral(expDual.coarse.embedding),
              legacy: embeddingToVectorLiteral(expLeg.embedding),
            };
            const [er, ek, eq2] = await Promise.all([
              vectorSearchRagDocuments(expVecs, doctorId, 10, SOURCE_PRIORITY, orgId),
              vectorSearchDoctorKnowledge(expVecs, doctorId, 10, SOURCE_PRIORITY, undefined, orgId),
              vectorSearchLearnedQA(expVecs, doctorId, 5, SOURCE_PRIORITY, orgId),
            ]);
            for (const s of [...er, ...ek, ...eq2]) {
              if (!seenIds.has(s.id)) {
                s.score = (s.score || 0) * 0.85;
                allSources.push(s);
                seenIds.add(s.id);
              }
            }
          }
        } catch {}
      }
    }
    
  } else {
    allSources = await fallbackKeywordSearch(query, doctorId, SOURCE_PRIORITY, undefined, orgId);
  }
  
  if (includePatientContext && patientId) {
    const factConditions = [
      eq(patientFacts.patientId, patientId),
      eq(patientFacts.isArchived, false),
    ];
    if (orgId) {
      factConditions.push(eq((patientFacts as any).orgId, orgId));
    }
    const facts = await db.select().from(patientFacts).where(
      and(...factConditions)
    ).limit(20);
    
    for (const fact of facts) {
      allSources.push({
        id: fact.id,
        sourceType: "EMR",
        title: `${fact.factType}: ${fact.code || ""}`,
        content: fact.description,
        embedding: [],
        priority: SOURCE_PRIORITY.EMR || 70,
        score: 0.5,
      });
    }
  }
  
  const tieredSources = enforcePriorityTiers(allSources, topK, ragSettings.tierLimits);
  
  const rerankedSources = await rerankWithLLM(query, tieredSources);
  
  const confidenceMetrics = calculateConfidenceMetrics(
    rerankedSources, 
    useKeywordSearch, 
    ragSettings.confidenceThresholds, 
    ragSettings.keywordThresholds
  );
  
  return {
    sources: rerankedSources,
    query,
    queryEmbedding,
    totalFound: allSources.length,
    confidenceMetrics,
    usedKeywordFallback: useKeywordSearch,
  };
}

function calculateConfidenceMetrics(
  sources: RagSource[], 
  isKeywordMode: boolean = false,
  confidenceThresholds: { HIGH: number; MEDIUM: number; LOW: number; MIN_RELIABLE_SOURCES: number } = DEFAULT_CONFIDENCE_THRESHOLDS,
  keywordThresholds: { HIGH: number; MEDIUM: number; LOW: number } = DEFAULT_KEYWORD_THRESHOLDS
): ConfidenceMetrics {
  if (sources.length === 0) {
    return {
      maxScore: 0,
      avgScore: 0,
      highConfidenceCount: 0,
      isReliable: false,
      confidenceLevel: "INSUFFICIENT",
    };
  }
  
  const scores = sources.map(s => s.score || 0);
  const maxScore = Math.max(...scores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // 키워드 모드에서는 관대한 임계값 적용 (Replit AI 임베딩 미지원 대응)
  const thresholds = isKeywordMode ? keywordThresholds : confidenceThresholds;
  
  const highConfidenceCount = scores.filter(s => s >= thresholds.MEDIUM).length;
  
  let confidenceLevel: ConfidenceMetrics["confidenceLevel"];
  if (maxScore >= thresholds.HIGH && highConfidenceCount >= confidenceThresholds.MIN_RELIABLE_SOURCES) {
    confidenceLevel = "HIGH";
  } else if (maxScore >= thresholds.MEDIUM) {
    confidenceLevel = "MEDIUM";
  } else if (maxScore >= thresholds.LOW) {
    confidenceLevel = "LOW";
  } else {
    confidenceLevel = "INSUFFICIENT";
  }
  
  // 키워드 모드에서는 최대 MEDIUM까지만 허용
  if (isKeywordMode && confidenceLevel === "HIGH") {
    confidenceLevel = "MEDIUM";
  }
  
  const isReliable = confidenceLevel === "HIGH" || confidenceLevel === "MEDIUM";
  
  return {
    maxScore,
    avgScore,
    highConfidenceCount,
    isReliable,
    confidenceLevel,
  };
}

function enforcePriorityTiers(
  sources: RagSource[], 
  topK: number,
  tierLimits: Record<string, { limit: number; minScore: number }> = DEFAULT_TIER_LIMITS
): RagSource[] {
  const tierOrder = ["PERSONA", "POLICY", "EMR", "UPLOAD", "LEARNED_QA", "FAQ_CARD", "OTHER"];
  
  const tierConfig = tierLimits;
  
  const tiers: Record<string, RagSource[]> = {};
  tierOrder.forEach(t => { tiers[t] = []; });
  
  for (const source of sources) {
    const type = source.sourceType;
    if (tiers[type]) {
      tiers[type].push(source);
    } else {
      tiers.OTHER.push(source);
    }
  }
  
  Object.keys(tiers).forEach(key => {
    const config = tierConfig[key] || { minScore: 0.1 };
    tiers[key] = tiers[key]
      .filter(s => (s.score || 0) >= config.minScore || s.sourceType === "EMR")
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  });
  
  const result: RagSource[] = [];
  
  for (const tier of tierOrder) {
    const config = tierConfig[tier];
    const tierSources = tiers[tier].slice(0, config.limit);
    result.push(...tierSources);
    
    if (result.length >= topK) {
      break;
    }
  }
  
  return result.slice(0, topK);
}

export async function retrieveBySourceType(
  doctorId: string,
  sourceType: string,
  limit: number = 10
): Promise<RagSource[]> {
  const ragSettings = await loadRagConfig();
  const docs = await db.select().from(ragDocuments).where(
    and(
      eq(ragDocuments.doctorId, doctorId),
      eq(ragDocuments.sourceType, sourceType as any),
      eq(ragDocuments.status, "ACTIVE")
    )
  ).limit(limit);
  
  return docs.map(doc => ({
    id: doc.id,
    sourceType: doc.sourceType || sourceType,
    title: doc.title,
    content: doc.content,
    embedding: doc.embedding as number[] || [],
    priority: ragSettings.sourcePriority[sourceType] || 50,
  }));
}

export async function getSourceStats(doctorId: string): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  
  const ragDocs = await db.select().from(ragDocuments).where(
    and(
      eq(ragDocuments.doctorId, doctorId),
      eq(ragDocuments.status, "ACTIVE")
    )
  );
  
  for (const doc of ragDocs) {
    const type = doc.sourceType || "UPLOAD";
    stats[type] = (stats[type] || 0) + 1;
  }
  
  const learnedQA = await db.select().from(agentLearnedConversations).where(
    and(
      eq(agentLearnedConversations.doctorId, doctorId),
      eq(agentLearnedConversations.isApproved, true)
    )
  );
  stats["LEARNED_QA"] = learnedQA.length;
  
  return stats;
}
