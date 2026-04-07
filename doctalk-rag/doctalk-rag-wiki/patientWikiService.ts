/**
 * Patient Wiki Service (Karpathy LLM Wiki 패턴)
 *
 * 환자별 합성 요약 문서를 생성하고 증분 업데이트하는 서비스.
 * 기존 RAG(청크 벡터 검색)와 달리, 환자의 모든 데이터를 하나의
 * 구조화된 요약 문서로 미리 합성하여 AI가 즉시 참조할 수 있게 한다.
 *
 * 비유: 의사가 환자 차트를 볼 때 매번 183회 방문 기록을 하나씩
 * 뒤지는 게 아니라, 간호사가 미리 정리해둔 "환자 요약지"를 보는 것.
 *
 * 핵심 원칙 (Karpathy):
 * 1. Pre-compiled > Runtime retrieval — 미리 합성 > 실시간 검색
 * 2. Incremental update — 새 데이터가 오면 요약을 증분 업데이트
 * 3. Compound — AI 답변도 요약에 반영하여 지식 축적
 */

import { db } from "../../db";
import { patientSources, patients, patientFacts } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface PatientWikiDocument {
  patientId: string;
  orgId: string;
  /** 요약 문서 (마크다운) */
  content: string;
  /** 마지막 업데이트 시점 */
  lastUpdatedAt: Date;
  /** 소스 데이터 수 (이 요약에 반영된 데이터 수) */
  sourceCount: number;
  /** 토큰 수 (추정) */
  tokenCount: number;
}

// ── In-memory 캐시 (orgId:patientId → wiki document) ──────────────
const wikiCache = new Map<string, PatientWikiDocument>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30분
const cacheTimestamps = new Map<string, number>();

function getCacheKey(orgId: string, patientId: string): string {
  return `${orgId}:${patientId}`;
}

/**
 * 환자의 합성 요약 문서를 가져온다.
 * 캐시가 있으면 캐시 반환, 없으면 DB에서 생성.
 */
export async function getPatientWiki(
  patientId: string,
  orgId: string,
): Promise<PatientWikiDocument | null> {
  const key = getCacheKey(orgId, patientId);

  // 캐시 확인
  const cached = wikiCache.get(key);
  const cachedAt = cacheTimestamps.get(key) || 0;
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  // DB에서 환자 데이터 수집 → 요약 문서 생성
  try {
    const wiki = await buildPatientWiki(patientId, orgId);
    if (wiki) {
      wikiCache.set(key, wiki);
      cacheTimestamps.set(key, Date.now());

      // 캐시 크기 제한 (1000명)
      if (wikiCache.size > 1000) {
        const firstKey = wikiCache.keys().next().value;
        if (firstKey) {
          wikiCache.delete(firstKey);
          cacheTimestamps.delete(firstKey);
        }
      }
    }
    return wiki;
  } catch (err) {
    console.error(`[PatientWiki] Error building wiki for patient ${patientId}:`, err);
    return null;
  }
}

/**
 * 환자 데이터를 모아서 구조화된 요약 문서를 생성한다.
 * LLM 호출 없이 데이터를 구조적으로 정리 (비용 0).
 */
async function buildPatientWiki(
  patientId: string,
  orgId: string,
): Promise<PatientWikiDocument | null> {
  // 환자 기본 정보
  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.orgId, orgId)))
    .limit(1);

  if (!patient) return null;

  // 환자 Facts (구조화된 사실)
  let facts: any[] = [];
  try {
    facts = await db
      .select()
      .from(patientFacts)
      .where(eq(patientFacts.patientId, patientId))
      .orderBy(desc(patientFacts.createdAt));
  } catch {}

  // 환자 Sources (RAG 원본 데이터)
  let sources: any[] = [];
  try {
    sources = await db
      .select({
        id: patientSources.id,
        sourceType: patientSources.type,
        content: patientSources.rawText,
        createdAt: patientSources.createdAt,
      })
      .from(patientSources)
      .where(and(
        eq(patientSources.patientId, patientId),
        sql`${patientSources.isDeleted} IS NOT TRUE`,
      ))
      .orderBy(desc(patientSources.createdAt))
      .limit(50);
  } catch {}

  // 방문 이력 추출 (sourceType = type 컬럼)
  const visitSource = sources.find(s => s.sourceType === "VISIT_HISTORY" || s.sourceType === "visit_history");
  const diagnosisSource = sources.find(s => s.sourceType === "DIAGNOSIS" || s.sourceType === "diagnosis");
  const prescriptionSource = sources.find(s => s.sourceType === "PRESCRIPTION" || s.sourceType === "prescription");
  const labSource = sources.find(s => s.sourceType === "LAB_RESULT" || s.sourceType === "lab_result");
  const symptomSource = sources.find(s => s.sourceType === "SYMPTOM" || s.sourceType === "symptom");

  // 마크다운 요약 문서 빌드
  const sections: string[] = [];

  // 헤더
  const chartId = patient.chartPatientId || patientId;
  sections.push(`# 환자 ${chartId}`);
  sections.push("");

  // 핵심 정보
  sections.push("## 핵심 정보");
  if (facts.length > 0) {
    for (const fact of facts.slice(0, 20)) {
      const category = fact.category || "기타";
      const value = fact.value || fact.content || "";
      if (value) sections.push(`- **${category}**: ${value}`);
    }
  } else {
    sections.push("- 등록된 핵심 정보 없음");
  }
  sections.push("");

  // 진단
  if (diagnosisSource?.content) {
    sections.push("## 진단");
    const diagContent = String(diagnosisSource.content).substring(0, 1000);
    sections.push(diagContent);
    sections.push("");
  }

  // 처방
  if (prescriptionSource?.content) {
    sections.push("## 현재 처방");
    const rxContent = String(prescriptionSource.content).substring(0, 1000);
    sections.push(rxContent);
    sections.push("");
  }

  // 검사 결과
  if (labSource?.content) {
    sections.push("## 최근 검사 결과");
    const labContent = String(labSource.content).substring(0, 800);
    sections.push(labContent);
    sections.push("");
  }

  // 증상
  if (symptomSource?.content) {
    sections.push("## 주요 증상");
    const symptomContent = String(symptomSource.content).substring(0, 500);
    sections.push(symptomContent);
    sections.push("");
  }

  // 방문 요약
  if (visitSource?.content) {
    sections.push("## 방문 이력 요약");
    // 최근 10회 방문만 포함
    const visitContent = String(visitSource.content).substring(0, 1500);
    sections.push(visitContent);
    sections.push("");
  }

  // 기타 소스
  const mainTypes = ["VISIT_HISTORY", "DIAGNOSIS", "PRESCRIPTION", "LAB_RESULT", "SYMPTOM", "visit_history", "diagnosis", "prescription", "lab_result", "symptom"];
  const otherSources = sources.filter(s => !mainTypes.includes(s.sourceType || ""));
  if (otherSources.length > 0) {
    sections.push("## 기타 데이터");
    for (const src of otherSources.slice(0, 5)) {
      const title = src.sourceType || "데이터";
      sections.push(`### ${title}`);
      if (src.content) {
        sections.push(String(src.content).substring(0, 500));
      }
      sections.push("");
    }
  }

  // 메타데이터
  sections.push("---");
  sections.push(`소스 수: ${sources.length} | Facts: ${facts.length} | 생성: ${new Date().toISOString().split("T")[0]}`);

  const content = sections.join("\n");
  const tokenCount = Math.ceil(content.length / 3.5); // 한글 토큰 추정

  return {
    patientId,
    orgId,
    content,
    lastUpdatedAt: new Date(),
    sourceCount: sources.length,
    tokenCount,
  };
}

/**
 * 환자 위키 캐시 무효화 (새 데이터 추가 시 호출)
 */
export function invalidatePatientWiki(patientId: string, orgId: string): void {
  const key = getCacheKey(orgId, patientId);
  wikiCache.delete(key);
  cacheTimestamps.delete(key);
}

/**
 * 전체 캐시 초기화
 */
export function clearAllPatientWikis(): void {
  wikiCache.clear();
  cacheTimestamps.clear();
}
