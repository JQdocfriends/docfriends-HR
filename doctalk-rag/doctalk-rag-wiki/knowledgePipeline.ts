import { storage } from "../storage";
import { createHash } from "crypto";
import { embeddingRouter, chunkText } from "../ai/llm/embedding";
import type { Patient, PatientSource, DoctorKnowledge } from "@shared/schema";
import { parseHealthCheckupPdfWithVision, buildSectionChunks, isHealthCheckupFilename, type HealthCheckupParseResult } from "./healthCheckupPdfParser";
import { ObjectStorageService } from "../replit_integrations/object_storage/objectStorage";

export type KnowledgeSourceType = 
  | "EMR" 
  | "FILE" 
  | "FILE_RAW" 
  | "VACCINATION" 
  | "HEALTH_CHECKUP" 
  | "DIAGNOSIS" 
  | "MEDIA" 
  | "FAQ_CARD" 
  | "PERSONA" 
  | "POLICY"
  | "TEXT"
  | "EXCEL"
  | "YOUTUBE"
  | "GDRIVE"
  | "PATIENT"
  | "FLASHCARD"
  | "CHAT_UPLOAD";

export interface ParsedKnowledge {
  doctorId: string;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  title: string;
  content: string;
  contentHash: string;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
  skipChunking?: boolean;
}

export interface KnowledgePipelineResult {
  processed: number;
  skipped: number;
  errors: number;
  details: Array<{
    title: string;
    status: "success" | "duplicate" | "error";
    message?: string;
  }>;
}

export interface KnowledgeStats {
  total: number;
  bySourceType: Record<KnowledgeSourceType, number>;
  embeddedCount: number;
  lastUpdated: Date | null;
}

export interface ALSKnowledgeScore {
  score: number;
  maxScore: number;
  breakdown: {
    emr: { count: number; score: number; weight: number };
    file: { count: number; score: number; weight: number };
    vaccination: { count: number; score: number; weight: number };
    healthCheckup: { count: number; score: number; weight: number };
    diagnosis: { count: number; score: number; weight: number };
    media: { count: number; score: number; weight: number };
  };
  tips: string[];
}

const ALS_WEIGHTS: Record<KnowledgeSourceType, number> = {
  EMR: 1.0,
  DIAGNOSIS: 1.0,
  FILE: 0.8,
  FILE_RAW: 0.4,
  HEALTH_CHECKUP: 0.7,
  VACCINATION: 0.5,
  MEDIA: 0.3,
  FAQ_CARD: 0.6,
  PERSONA: 0.9,
  POLICY: 0.7,
  TEXT: 0.6,
  EXCEL: 0.7,
  YOUTUBE: 0.4,
  GDRIVE: 0.5,
  PATIENT: 0.8,
  FLASHCARD: 0.6,
  CHAT_UPLOAD: 0.7,
};

function createContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").substring(0, 32);
}

export class EMRParser {
  static extractFromPatient(patient: Patient, doctorId: string): ParsedKnowledge[] {
    const items: ParsedKnowledge[] = [];
    const diagnosisCodes = patient.diagnosisCodes || [];
    const drugCodes = patient.drugCodes || [];

    const pid = patient.chartPatientId || patient.patientKey || patient.id;

    if (diagnosisCodes.length > 0) {
      const content = `환자 ${pid}의 진단 기록:\n- 진단 코드: ${diagnosisCodes.join(", ")}\n- 마지막 방문: ${patient.lastVisitAt ? new Date(patient.lastVisitAt).toLocaleDateString("ko-KR") : "기록 없음"}`;
      items.push({
        doctorId,
        sourceType: "DIAGNOSIS",
        sourceId: `patient:${patient.id}:diagnosis`,
        title: `[진단] ${pid} 환자 진단 코드`,
        content,
        contentHash: createContentHash(content),
        metadata: { patientId: patient.id },
      });
    }

    if (drugCodes.length > 0) {
      const content = `환자 ${pid}의 처방 기록:\n- 처방 약물: ${drugCodes.join(", ")}\n- 마지막 방문: ${patient.lastVisitAt ? new Date(patient.lastVisitAt).toLocaleDateString("ko-KR") : "기록 없음"}`;
      items.push({
        doctorId,
        sourceType: "EMR",
        sourceId: `patient:${patient.id}:prescription`,
        title: `[처방] ${pid} 환자 처방 기록`,
        content,
        contentHash: createContentHash(content),
        metadata: { patientId: patient.id },
      });
    }

    return items;
  }

  static extractFromPatientSource(source: PatientSource, patientDisplayId: string, doctorId: string): ParsedKnowledge[] {
    const items: ParsedKnowledge[] = [];

    if (source.analysisStatus === "completed" && source.normalizedJson) {
      const normalized = source.normalizedJson as Record<string, unknown>;
      const aiSummary = normalized.aiSummary as string | undefined;
      const aiRecommendations = normalized.aiRecommendations as string | undefined;

      if (aiSummary) {
        items.push({
          doctorId,
          sourceType: "EMR",
          sourceId: `source:${source.id}:summary`,
          title: `[분석] ${patientDisplayId} 환자 AI 분석 요약`,
          content: `환자 ${patientDisplayId}의 의무기록 AI 분석:\n${aiSummary}`,
          contentHash: createContentHash(aiSummary),
          metadata: { sourceId: source.id },
        });
      }

      if (aiRecommendations) {
        items.push({
          doctorId,
          sourceType: "EMR",
          sourceId: `source:${source.id}:recommendations`,
          title: `[권장사항] ${patientDisplayId} 환자 AI 권장사항`,
          content: `환자 ${patientDisplayId}에 대한 AI 권장사항:\n${aiRecommendations}`,
          contentHash: createContentHash(aiRecommendations),
          metadata: { sourceId: source.id },
        });
      }

      const medicalInfo = normalized.medicalInfo as Record<string, unknown> | undefined;
      if (medicalInfo) {
        const diagnoses = medicalInfo.diagnoses as string[] | undefined;
        const medications = medicalInfo.medications as string[] | undefined;

        if (diagnoses && diagnoses.length > 0) {
          const content = `환자 ${patientDisplayId}의 문서에서 추출된 진단 정보:\n${diagnoses.map(d => `- ${d}`).join("\n")}`;
          items.push({
            doctorId,
            sourceType: "DIAGNOSIS",
            sourceId: `source:${source.id}:diagnoses`,
            title: `[진단] ${patientDisplayId} 환자 문서 기반 진단`,
            content,
            contentHash: createContentHash(content),
            metadata: { sourceId: source.id },
          });
        }

        if (medications && medications.length > 0) {
          const content = `환자 ${patientDisplayId}의 문서에서 추출된 처방 정보:\n${medications.map(m => `- ${m}`).join("\n")}`;
          items.push({
            doctorId,
            sourceType: "EMR",
            sourceId: `source:${source.id}:medications`,
            title: `[처방] ${patientDisplayId} 환자 문서 기반 처방`,
            content,
            contentHash: createContentHash(content),
            metadata: { sourceId: source.id },
          });
        }
      }
    }

    return items;
  }
}

export class VaccinationParser {
  static extractFromPatient(patient: Patient, doctorId: string): ParsedKnowledge[] {
    const items: ParsedKnowledge[] = [];
    const vaccinations = (patient.vaccinationHistory || []) as Array<{
      vaccineName?: string;
      date?: string;
      doseNumber?: number;
    }>;

    if (vaccinations.length > 0) {
      const vacPid = patient.chartPatientId || patient.patientKey || patient.id;
      const content = `환자 ${vacPid}의 접종 기록:\n${vaccinations.map(v => 
        `- ${v.vaccineName || "백신"}: ${v.date || "날짜 미상"} (${v.doseNumber || 1}차)`
      ).join("\n")}`;

      items.push({
        doctorId,
        sourceType: "VACCINATION",
        sourceId: `patient:${patient.id}:vaccination`,
        title: `[접종] ${patient.chartPatientId || patient.patientKey || patient.id} 환자 접종 기록`,
        content,
        contentHash: createContentHash(content),
        metadata: { patientId: patient.id },
      });
    }

    return items;
  }
}

export class HealthCheckupParser {
  static extractFromPatient(patient: Patient, doctorId: string): ParsedKnowledge[] {
    const items: ParsedKnowledge[] = [];
    const checkups = (patient.healthCheckupHistory || []) as Array<{
      date?: string;
      results?: Record<string, unknown>;
      summary?: string;
    }>;
    
    for (const checkup of checkups) {
      const date = checkup.date;
      const results = checkup.results;

      if (results || checkup.summary) {
        const hcPid = patient.chartPatientId || patient.patientKey || patient.id;
      let contentLines = [`환자 ${hcPid}의 건강검진 결과 (${date || "날짜 미상"}):`];
        
        if (results) {
          contentLines.push(...Object.entries(results).map(([key, value]) => `- ${key}: ${value}`));
        }
        
        if (checkup.summary) {
          contentLines.push(`\n요약: ${checkup.summary}`);
        }
        
        const content = contentLines.join("\n");
        
        items.push({
          doctorId,
          sourceType: "HEALTH_CHECKUP",
          sourceId: `patient:${patient.id}:healthcheckup:${date || 'unknown'}`,
          title: `[건강검진] ${hcPid} 환자 검진 결과`,
          content,
          contentHash: createContentHash(content),
          metadata: { patientId: patient.id, checkupDate: date },
        });
      }
    }

    return items;
  }
}

export class MediaParser {
  static parseMediaContent(
    filename: string,
    mimeType: string,
    extractedText: string,
    doctorId: string
  ): ParsedKnowledge[] {
    const items: ParsedKnowledge[] = [];

    if (extractedText && extractedText.length > 50) {
      items.push({
        doctorId,
        sourceType: "MEDIA",
        sourceId: `media:${createContentHash(filename + extractedText)}`,
        title: `[미디어] ${filename}`,
        content: extractedText,
        contentHash: createContentHash(extractedText),
        metadata: { filename, mimeType },
      });
    }

    return items;
  }
}

export class KnowledgePipeline {
  private doctorId: string;
  private orgId: string;

  constructor(doctorId: string, orgId: string) {
    this.doctorId = doctorId;
    this.orgId = orgId;
  }

  async processKnowledgeItem(item: ParsedKnowledge): Promise<{
    status: "success" | "duplicate" | "error";
    message?: string;
    id?: string;
  }> {
    try {
      // #9: orgId 검증 가드 — 환자 데이터 학습 시 orgId 일치 확인
      if (item.metadata?.patientId && this.orgId) {
        try {
          const { db } = await import("../db");
          const { patients } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");
          const [patient] = await db.select({ orgId: patients.orgId })
            .from(patients)
            .where(eq(patients.id, item.metadata.patientId as string))
            .limit(1);
          if (patient && patient.orgId && patient.orgId !== this.orgId) {
            console.warn(`[KnowledgePipeline] BLOCKED: Patient ${(item.metadata.patientId as string).slice(0, 8)} org (${patient.orgId}) != doctor org (${this.orgId})`);
            return { status: "error", message: "Cross-org patient data blocked" };
          }
        } catch (guardErr) {
          console.warn('[KnowledgePipeline] orgId guard check failed, proceeding:', guardErr);
        }
      }

      const contentHash = item.contentHash && item.contentHash.length > 0
        ? item.contentHash
        : createContentHash(item.content);
      
      const isDuplicate = await this.checkDuplicate(contentHash);
      if (isDuplicate) {
        return { status: "duplicate", message: "Content already exists" };
      }

      // 같은 org 내에서만 임베딩 재사용 허용 (데이터 격리 원칙)
      const existingFromOtherDoctors = await storage.getAnyDoctorKnowledgeByContentHash(contentHash);
      const donorWithEmbedding = existingFromOtherDoctors.find(
        k => k.doctorId !== item.doctorId && k.orgId === this.orgId && Array.isArray(k.embedding) && (k.embedding as number[]).length === 1536
      );

      if (donorWithEmbedding) {
        const cloned = await storage.cloneDoctorKnowledgeForDoctor(
          donorWithEmbedding.doctorId, item.doctorId, contentHash, this.orgId
        );
        if (cloned > 0) {
          console.log(`[KnowledgePipeline] Reused ${cloned} embeddings from doctor ${donorWithEmbedding.doctorId.slice(0, 8)} for: ${item.title}`);
          return { status: "success", message: `Reused ${cloned} embeddings from existing doctor` };
        }
      }

      const chunks = item.skipChunking ? [item.content] : chunkText(item.content, { maxTokens: 500 });
      
      const EMBED_BATCH_SIZE = 20;
      const allEmbeddings: number[][] = new Array(chunks.length).fill(null as any);
      
      for (let batchStart = 0; batchStart < chunks.length; batchStart += EMBED_BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + EMBED_BATCH_SIZE, chunks.length);
        const batchChunks = chunks.slice(batchStart, batchEnd);
        
        try {
          const results = await embeddingRouter.embedBatch(batchChunks);
          for (let j = 0; j < results.length; j++) {
            allEmbeddings[batchStart + j] = results[j].embedding;
          }
        } catch (batchError) {
          console.warn(`[KnowledgePipeline] Batch embedding failed, retrying individually for chunks ${batchStart}-${batchEnd}`);
          for (let j = 0; j < batchChunks.length; j++) {
            try {
              const singleResult = await embeddingRouter.embed(batchChunks[j]);
              allEmbeddings[batchStart + j] = singleResult.embedding;
            } catch (singleError) {
              console.warn(`[KnowledgePipeline] Individual embedding failed for chunk ${batchStart + j}, will store without embedding`);
              allEmbeddings[batchStart + j] = [];
            }
          }
        }
      }
      
      for (let i = 0; i < allEmbeddings.length; i++) {
        if (allEmbeddings[i] === null) allEmbeddings[i] = [];
      }
      
      const bulkRecords = chunks.map((chunk, i) => ({
        orgId: this.orgId,
        doctorId: item.doctorId,
        sourceType: item.sourceType,
        sourceId: chunks.length > 1 ? `${item.sourceId}:chunk${i}` : item.sourceId,
        title: chunks.length > 1 ? `${item.title} (${i + 1}/${chunks.length})` : item.title,
        content: chunk,
        contentHash: i === 0 ? contentHash : createContentHash(chunk),
        embedding: allEmbeddings[i],
        chunkIndex: i,
        metadata: { ...item.metadata, totalChunks: chunks.length },
      }));

      await storage.addDoctorKnowledgeBulk(bulkRecords);

      console.log(`[KnowledgePipeline] Processed: ${item.title} (${chunks.length} chunks, batch embed + bulk insert)`);
      return { status: "success" };

    } catch (error) {
      console.error(`[KnowledgePipeline] Error processing ${item.title}:`, error);
      return { 
        status: "error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  private async checkDuplicate(contentHash: string): Promise<boolean> {
    const existing = await storage.getDoctorKnowledgeByContentHash(this.doctorId, contentHash);
    return existing !== null;
  }

  async runFullLearning(): Promise<KnowledgePipelineResult> {
    console.log(`[KnowledgePipeline] Starting full learning for doctor ${this.doctorId}`);
    
    const result: KnowledgePipelineResult = {
      processed: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    try {
      const patients = await storage.getAllPatients(this.orgId);
      console.log(`[KnowledgePipeline] Processing ${patients.length} patients`);

      for (const patient of patients) {
        const emrItems = EMRParser.extractFromPatient(patient, this.doctorId);
        const vaccinationItems = VaccinationParser.extractFromPatient(patient, this.doctorId);
        const healthCheckupItems = HealthCheckupParser.extractFromPatient(patient, this.doctorId);
        
        const patientSources = await storage.getPatientSources(patient.id);
        const sourceItems = patientSources.flatMap(source => 
          EMRParser.extractFromPatientSource(source, patient.chartPatientId || patient.patientKey || patient.id, this.doctorId)
        );

        const allItems = [...emrItems, ...vaccinationItems, ...healthCheckupItems, ...sourceItems];

        for (const item of allItems) {
          const processResult = await this.processKnowledgeItem(item);
          
          if (processResult.status === "success") {
            result.processed++;
          } else if (processResult.status === "duplicate") {
            result.skipped++;
          } else {
            result.errors++;
          }

          result.details.push({
            title: item.title,
            status: processResult.status,
            message: processResult.message,
          });
        }
      }

      console.log(`[KnowledgePipeline] Completed: ${result.processed} processed, ${result.skipped} skipped, ${result.errors} errors`);
    } catch (error) {
      console.error("[KnowledgePipeline] Fatal error during learning:", error);
      result.errors++;
    }

    return result;
  }

  async getKnowledgeStats(): Promise<KnowledgeStats> {
    const knowledge = await storage.getDoctorKnowledge(this.doctorId, this.orgId);
    
    const bySourceType: Record<KnowledgeSourceType, number> = {
      EMR: 0,
      FILE: 0,
      FILE_RAW: 0,
      VACCINATION: 0,
      HEALTH_CHECKUP: 0,
      DIAGNOSIS: 0,
      MEDIA: 0,
      FAQ_CARD: 0,
      PERSONA: 0,
      POLICY: 0,
      TEXT: 0,
      EXCEL: 0,
      YOUTUBE: 0,
      GDRIVE: 0,
      PATIENT: 0,
      FLASHCARD: 0,
      CHAT_UPLOAD: 0,
    };

    let embeddedCount = 0;
    let lastUpdated: Date | null = null;

    for (const item of knowledge) {
      const sourceType = item.sourceType as KnowledgeSourceType;
      if (bySourceType[sourceType] !== undefined) {
        bySourceType[sourceType]++;
      }
      
      if (Array.isArray(item.embedding) && item.embedding.length > 0) {
        embeddedCount++;
      }

      const itemDate = new Date(item.createdAt);
      if (!lastUpdated || itemDate > lastUpdated) {
        lastUpdated = itemDate;
      }
    }

    return {
      total: knowledge.length,
      bySourceType,
      embeddedCount,
      lastUpdated,
    };
  }

  async calculateALSKnowledgeScore(): Promise<ALSKnowledgeScore> {
    const stats = await this.getKnowledgeStats();
    
    const calculateTypeScore = (count: number, weight: number, maxItems: number = 50): number => {
      const normalizedCount = Math.min(count, maxItems);
      return (normalizedCount / maxItems) * 100 * weight;
    };

    const breakdown = {
      emr: { 
        count: stats.bySourceType.EMR, 
        score: calculateTypeScore(stats.bySourceType.EMR, ALS_WEIGHTS.EMR), 
        weight: ALS_WEIGHTS.EMR 
      },
      file: { 
        count: stats.bySourceType.FILE + stats.bySourceType.FILE_RAW, 
        score: calculateTypeScore(stats.bySourceType.FILE, ALS_WEIGHTS.FILE), 
        weight: ALS_WEIGHTS.FILE 
      },
      vaccination: { 
        count: stats.bySourceType.VACCINATION, 
        score: calculateTypeScore(stats.bySourceType.VACCINATION, ALS_WEIGHTS.VACCINATION, 30), 
        weight: ALS_WEIGHTS.VACCINATION 
      },
      healthCheckup: { 
        count: stats.bySourceType.HEALTH_CHECKUP, 
        score: calculateTypeScore(stats.bySourceType.HEALTH_CHECKUP, ALS_WEIGHTS.HEALTH_CHECKUP, 30), 
        weight: ALS_WEIGHTS.HEALTH_CHECKUP 
      },
      diagnosis: { 
        count: stats.bySourceType.DIAGNOSIS, 
        score: calculateTypeScore(stats.bySourceType.DIAGNOSIS, ALS_WEIGHTS.DIAGNOSIS), 
        weight: ALS_WEIGHTS.DIAGNOSIS 
      },
      media: { 
        count: stats.bySourceType.MEDIA, 
        score: calculateTypeScore(stats.bySourceType.MEDIA, ALS_WEIGHTS.MEDIA, 20), 
        weight: ALS_WEIGHTS.MEDIA 
      },
    };

    const totalScore = Object.values(breakdown).reduce((sum, item) => sum + item.score, 0);
    const maxPossibleScore = Object.values(breakdown).reduce((sum, item) => sum + 100 * item.weight, 0);
    const normalizedScore = Math.min((totalScore / maxPossibleScore) * 100, 100);

    const tips: string[] = [];
    if (stats.bySourceType.EMR < 10) tips.push("EMR 차트 데이터를 더 학습시키면 AI 정확도가 높아집니다.");
    if (stats.bySourceType.FILE < 5) tips.push("의료 문서 파일을 업로드하여 지식을 확장하세요.");
    if (stats.bySourceType.VACCINATION === 0) tips.push("접종 기록을 추가하면 예방접종 관련 상담이 개선됩니다.");
    if (stats.bySourceType.HEALTH_CHECKUP === 0) tips.push("건강검진 데이터를 연동하여 검진 상담 품질을 높이세요.");

    return {
      score: Math.round(normalizedScore * 10) / 10,
      maxScore: 100,
      breakdown,
      tips,
    };
  }
}

export interface IngestPatientSourceToRagParams {
  patientId: string;
  sourceId: string;
  content?: string;
  doctorId: string;
  orgId: string;
  sourceLabel?: string;
}

export async function ingestPatientSourceToRag(params: IngestPatientSourceToRagParams): Promise<{ status: "success" | "skipped" | "error"; message?: string }> {
  const { patientId, sourceId, doctorId, orgId, sourceLabel } = params;
  let content = params.content;

  try {
    if (!content || content.trim().length === 0) {
      const source = await storage.getPatientSourceById(sourceId);
      if (!source) {
        return { status: "skipped", message: "Source not found" };
      }

      content = source.rawText || "";

      if (!content && source.normalizedJson) {
        const normalized = source.normalizedJson as Record<string, unknown>;
        const parts: string[] = [];
        if (normalized.aiSummary) parts.push(String(normalized.aiSummary));
        if (normalized.extractedText) parts.push(String(normalized.extractedText));
        if (normalized.summary) parts.push(String(normalized.summary));
        if (normalized.diagnoses && Array.isArray(normalized.diagnoses)) {
          parts.push(`진단: ${(normalized.diagnoses as string[]).join(", ")}`);
        }
        if (normalized.prescriptions && Array.isArray(normalized.prescriptions)) {
          parts.push(`처방: ${(normalized.prescriptions as string[]).join(", ")}`);
        }
        content = parts.join("\n");
      }
    }

    if (!content || content.trim().length < 20) {
      return { status: "skipped", message: "Insufficient content for RAG vectorization" };
    }

    const pipeline = new KnowledgePipeline(doctorId, orgId);
    const label = sourceLabel || `patient-source-${sourceId}`;
    const trimmedContent = content.slice(0, 50000);
    const parsedKnowledge: ParsedKnowledge = {
      doctorId,
      sourceType: "PATIENT",
      sourceId: `patient-${patientId}-source-${sourceId}`,
      title: label,
      content: trimmedContent,
      contentHash: createContentHash(trimmedContent),
    };

    const result = await pipeline.processKnowledgeItem(parsedKnowledge);
    console.log(`[RAG-Ingest] ${label}: ${result.status} (patientId=${patientId}, sourceId=${sourceId})`);
    return { status: result.status === "success" ? "success" : result.status === "duplicate" ? "skipped" : "error", message: result.message };
  } catch (error) {
    console.error(`[RAG-Ingest] Failed for sourceId=${sourceId}:`, error);
    return { status: "error", message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function runKnowledgeLearning(doctorId: string, orgId: string): Promise<KnowledgePipelineResult> {
  const pipeline = new KnowledgePipeline(doctorId, orgId);
  return await pipeline.runFullLearning();
}

export async function getKnowledgeStats(doctorId: string, orgId: string): Promise<KnowledgeStats> {
  const pipeline = new KnowledgePipeline(doctorId, orgId);
  return await pipeline.getKnowledgeStats();
}

export async function getALSKnowledgeScore(doctorId: string, orgId: string): Promise<ALSKnowledgeScore> {
  const pipeline = new KnowledgePipeline(doctorId, orgId);
  return await pipeline.calculateALSKnowledgeScore();
}

export interface ChatUploadKnowledgeParams {
  doctorId: string;
  orgId: string;
  fileId: string;
  filename: string;
  content: string;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

export async function processChatUploadToKnowledge(params: ChatUploadKnowledgeParams): Promise<KnowledgePipelineResult> {
  const { doctorId, orgId, fileId, filename, content, mimeType, metadata } = params;
  
  const result: KnowledgePipelineResult = {
    processed: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };
  
  if (!content || content.trim().length === 0) {
    result.errors++;
    result.details.push({
      title: filename,
      status: "error",
      message: "파일에서 추출된 내용이 없습니다.",
    });
    return result;
  }
  
  try {
    const chunks = chunkText(content, { maxTokens: 500 });
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const contentHash = createContentHash(chunk);
      const sourceId = chunks.length > 1 ? `${fileId}_chunk_${i}` : fileId;
      
      const existingKnowledge = await storage.getDoctorKnowledge(doctorId, orgId);
      const duplicate = existingKnowledge.find(
        (k) => k.contentHash === contentHash && k.sourceType === "CHAT_UPLOAD"
      );
      
      if (duplicate) {
        result.skipped++;
        result.details.push({
          title: `${filename} (청크 ${i + 1}/${chunks.length})`,
          status: "duplicate",
          message: "이미 학습된 콘텐츠입니다.",
        });
        continue;
      }
      
      let embedding: number[] | null = null;
      try {
        const embeddingResult = await embeddingRouter.embed(chunk);
        embedding = embeddingResult.embedding;
      } catch (embeddingError) {
        console.error("[ChatUpload] Embedding error:", embeddingError);
      }
      
      const knowledge = {
        doctorId,
        sourceType: "CHAT_UPLOAD",
        sourceId,
        title: chunks.length > 1 ? `${filename} (${i + 1}/${chunks.length})` : filename,
        content: chunk,
        contentHash,
        embedding: embedding as unknown as number[] | null,
        chunkIndex: i,
        metadata: {
          mimeType,
          totalChunks: chunks.length,
          originalFilename: filename,
          ...metadata,
        },
      };
      
      await storage.addDoctorKnowledge(knowledge);
      result.processed++;
      result.details.push({
        title: `${filename} (청크 ${i + 1}/${chunks.length})`,
        status: "success",
      });
    }
    
    console.log(`[ChatUpload] Processed ${result.processed} chunks from ${filename}`);
  } catch (error) {
    console.error("[ChatUpload] Error processing file:", error);
    result.errors++;
    result.details.push({
      title: filename,
      status: "error",
      message: error instanceof Error ? error.message : "파일 처리 중 오류 발생",
    });
  }
  
  return result;
}

export async function batchReEmbedKnowledge(batchSize: number = 50): Promise<{ updated: number; failed: number; remaining: number }> {
  const { db } = await import("../db");
  const { doctorKnowledge: dkTable } = await import("@shared/schema");
  const { sql, isNull } = await import("drizzle-orm");

  const rows = await db.select({ id: dkTable.id, content: dkTable.content })
    .from(dkTable)
    .where(sql`${dkTable.isDeleted} = false AND embedding_v2 IS NULL`)
    .limit(batchSize);

  if (rows.length === 0) {
    const totalRemaining = await db.select({ count: sql<number>`count(*)` })
      .from(dkTable)
      .where(sql`${dkTable.isDeleted} = false AND embedding_v2 IS NULL`);
    return { updated: 0, failed: 0, remaining: Number(totalRemaining[0]?.count || 0) };
  }

  let updated = 0;
  let failed = 0;

  const EMBED_CHUNK = 20;
  for (let i = 0; i < rows.length; i += EMBED_CHUNK) {
    const chunk = rows.slice(i, i + EMBED_CHUNK);
    const texts = chunk.map(r => (r.content || '').slice(0, 8000));

    try {
      // TurboQuant: Generate dual embeddings (512d + 256d) alongside legacy 1536d
      const { full: fullResults, coarse: coarseResults } = await embeddingRouter.embedDualBatch(texts);
      for (let j = 0; j < fullResults.length; j++) {
        const fullEmb = fullResults[j].embedding;
        const coarseEmb = coarseResults[j].embedding;
        if (fullEmb && fullEmb.length > 0) {
          try {
            const fullVec = `[${fullEmb.join(",")}]`;
            const coarseVec = `[${coarseEmb.join(",")}]`;
            // Store v2 (512d halfvec) + coarse (256d halfvec) — parameterized query
            await db.execute(sql`
              UPDATE doctor_knowledge SET
                embedding = ${JSON.stringify(fullEmb)}::jsonb,
                embedding_v2 = ${fullVec}::halfvec,
                embedding_coarse = ${coarseVec}::halfvec
              WHERE id = ${chunk[j].id}
            `);
            updated++;
          } catch {
            failed++;
          }
        } else {
          failed++;
        }
      }
    } catch {
      for (const row of chunk) {
        try {
          const { full, coarse } = await embeddingRouter.embedDual((row.content || '').slice(0, 8000));
          if (full.embedding && full.embedding.length > 0) {
            const fullVec = `[${full.embedding.join(",")}]`;
            const coarseVec = `[${coarse.embedding.join(",")}]`;
            await db.execute(sql`
              UPDATE doctor_knowledge SET
                embedding = ${JSON.stringify(full.embedding)}::jsonb,
                embedding_v2 = ${fullVec}::halfvec,
                embedding_coarse = ${coarseVec}::halfvec
              WHERE id = ${row.id}
            `);
            updated++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }
    }
  }

  const totalRemaining = await db.select({ count: sql<number>`count(*)` })
    .from(dkTable)
    .where(sql`${dkTable.isDeleted} = false AND embedding_v2 IS NULL`);

  return { updated, failed, remaining: Number(totalRemaining[0]?.count || 0) };
}

export interface RevectorizeResult {
  status: "success" | "error" | "skipped";
  message: string;
  chunksCreated: number;
  sectionsFound: number;
  abnormalCount: number;
  totalTestCount: number;
}

async function downloadFileBufferFromObjectStorage(rawFileUrl: string): Promise<Buffer> {
  if (!rawFileUrl) {
    throw new Error("No file URL provided");
  }

  const storageService = new ObjectStorageService();

  // Normalize to /objects/ path
  let objectPath = rawFileUrl;
  if (!objectPath.startsWith("/objects/")) {
    objectPath = storageService.normalizeObjectEntityPath(rawFileUrl);
  }

  const result = await storageService.downloadObjectAsBuffer(objectPath);
  if (!result) {
    throw new Error(`File not found in object storage: ${rawFileUrl}`);
  }

  return result.buffer;
}

export async function revectorizeHealthCheckupSource(params: {
  sourceId: string;
  patientId: string;
  doctorId: string;
  orgId: string;
}): Promise<RevectorizeResult> {
  const { sourceId, patientId, doctorId, orgId } = params;

  try {
    const source = await storage.getPatientSourceById(sourceId);
    if (!source) {
      return { status: "skipped", message: "Source not found", chunksCreated: 0, sectionsFound: 0, abnormalCount: 0, totalTestCount: 0 };
    }

    if (!source.rawFileUrl) {
      return { status: "skipped", message: "No file URL available for re-processing", chunksCreated: 0, sectionsFound: 0, abnormalCount: 0, totalTestCount: 0 };
    }

    const filename = source.originalFilename || "health_checkup.pdf";
    const isPdf = filename.toLowerCase().endsWith(".pdf") || (source.type || "").toLowerCase().includes("pdf");
    if (!isPdf) {
      return { status: "skipped", message: "Source is not a PDF file", chunksCreated: 0, sectionsFound: 0, abnormalCount: 0, totalTestCount: 0 };
    }
    console.log(`[Revectorize] Downloading file: ${source.rawFileUrl} (${filename})`);

    const fileBuffer = await downloadFileBufferFromObjectStorage(source.rawFileUrl);
    console.log(`[Revectorize] Downloaded ${(fileBuffer.length / 1024).toFixed(1)}KB`);

    const checkupResult = await parseHealthCheckupPdfWithVision(fileBuffer, filename);
    if (!checkupResult.success || checkupResult.rawStructuredText.length === 0) {
      return {
        status: "error",
        message: checkupResult.error || "Vision extraction returned no data",
        chunksCreated: 0,
        sectionsFound: 0,
        abnormalCount: 0,
        totalTestCount: 0,
      };
    }

    const productionChunks = checkupResult.productionChunks || buildSectionChunks(checkupResult);
    const isProduction = !!checkupResult.productionChunks;
    console.log(`[Revectorize] Created ${productionChunks.length} ${isProduction ? 'production' : 'legacy'} chunks from ${checkupResult.sections.length} sections`);

    const { db } = await import("../db");
    const { doctorKnowledge: dkTable, patientSources: psTable } = await import("@shared/schema");
    const { eq, and, or, like, sql } = await import("drizzle-orm");

    const oldSourcePattern = `patient-${patientId}-source-${sourceId}%`;
    const oldChunks = await db.select({ id: dkTable.id, sourceId: dkTable.sourceId })
      .from(dkTable)
      .where(and(
        eq(dkTable.doctorId, doctorId),
        like(dkTable.sourceId, oldSourcePattern),
        eq(dkTable.isDeleted, false),
      ));

    if (oldChunks.length > 0) {
      console.log(`[Revectorize] Soft-deleting ${oldChunks.length} old chunks for sourceId=${sourceId}`);
      await db.update(dkTable)
        .set({ isDeleted: true })
        .where(and(
          eq(dkTable.doctorId, doctorId),
          like(dkTable.sourceId, oldSourcePattern),
        ));
    }

    const pipeline = new KnowledgePipeline(doctorId, orgId);
    let chunksCreated = 0;

    for (let i = 0; i < productionChunks.length; i++) {
      const chunk = productionChunks[i];
      const chunkMeta = chunk.metadata as any;
      const chunkType = chunkMeta.chunk_type || chunkMeta.sectionType || "UNKNOWN";
      const sectionName = chunkMeta.section_name || chunkMeta.sectionName || chunkType;
      const categoryGroup = chunkMeta.category_group || '';
      
      const chunkTypeLabel = chunkType === 'LAB_GROUP_SUMMARY' ? '검사군요약'
        : chunkType === 'LAB_ABNORMAL_SUMMARY' ? '이상치요약'
        : chunkType === 'NARRATIVE_SUMMARY' ? '판독요약'
        : chunkType === 'NARRATIVE_DETAIL' ? '세부소견'
        : chunkType;

      const parsedKnowledge: ParsedKnowledge = {
        doctorId,
        sourceType: "HEALTH_CHECKUP",
        sourceId: `patient-${patientId}-source-${sourceId}:hc-${chunkType}-${i}`,
        title: `[건강검진/${categoryGroup}] ${sectionName} - ${chunkTypeLabel}`,
        content: chunk.content,
        contentHash: createContentHash(chunk.content + `-revec-${Date.now()}`),
        skipChunking: true,
        metadata: {
          ...chunkMeta,
          patientId,
          sourceId,
          revectorized: true,
          revectorizedAt: new Date().toISOString(),
          pipelineVersion: isProduction ? "production-v2" : "legacy-v1",
        },
      };

      const result = await pipeline.processKnowledgeItem(parsedKnowledge);
      if (result.status === "success") {
        chunksCreated++;
      } else {
        console.log(`[Revectorize] Chunk ${i} result: ${result.status} - ${result.message}`);
      }
    }

    const labRowCount = checkupResult.structuredData?.lab_rows?.length || 0;
    await db.update(psTable)
      .set({
        rawText: checkupResult.rawStructuredText.slice(0, 50000),
        analysisStatus: "completed",
        normalizedJson: {
          ...(typeof source.normalizedJson === 'object' && source.normalizedJson !== null ? source.normalizedJson : {}),
          vectorized: chunksCreated > 0,
          vectorChunkCount: chunksCreated,
          vectorizedAt: new Date().toISOString(),
          pipelineVersion: isProduction ? "production-v2" : "legacy-v1",
          labRowCount,
          healthCheckupData: {
            sections: checkupResult.sections.map((s: any) => s.sectionName),
            abnormalCount: checkupResult.abnormalCount,
            totalTestCount: checkupResult.totalTestCount,
            institution: checkupResult.institution,
            checkupDate: checkupResult.checkupDate,
            labRows: checkupResult.structuredData?.lab_rows || [],
          },
        },
      })
      .where(eq(psTable.id, sourceId));

    console.log(`[Revectorize] Completed: ${chunksCreated} production chunks (${oldChunks.length} old soft-deleted), ${labRowCount} labRows, ${checkupResult.abnormalCount} abnormal items`);

    return {
      status: "success",
      message: `Successfully revectorized with ${chunksCreated} production-v2 chunks from ${checkupResult.sections.length} sections (${oldChunks.length} old chunks replaced)`,
      chunksCreated,
      sectionsFound: checkupResult.sections.length,
      abnormalCount: checkupResult.abnormalCount,
      totalTestCount: checkupResult.totalTestCount,
    };
  } catch (error: any) {
    console.error(`[Revectorize] Error for sourceId=${sourceId}:`, error);
    return {
      status: "error",
      message: error?.message || "Unknown error",
      chunksCreated: 0,
      sectionsFound: 0,
      abnormalCount: 0,
      totalTestCount: 0,
    };
  }
}
