/**
 * Embedding Service - 텍스트 임베딩 생성
 * 
 * OpenAI 임베딩 모델 사용
 * 문서 청킹 및 배치 처리 포함
 */

import OpenAI from "openai";
import type { EmbeddingProvider, EmbeddingResult } from "./provider";

/**
 * TurboQuant-Inspired Embedding Configuration
 *
 * 3단계 최적화:
 * Stage 1: halfvec (float16) 저장 — pgvector halfvec 타입으로 메모리 50% 절감
 * Stage 2: dimensions 512 — OpenAI Matryoshka로 차원 축소, 메모리 추가 67% 절감
 * Stage 3: 2-tier search — coarse 256d + fine 512d reranking
 */
export const EMBEDDING_CONFIG = {
  /** Primary embedding dimension (Stage 2: 1536 → 512) */
  FULL_DIM: 512,
  /** Coarse search dimension (Stage 3: 256d for fast candidate retrieval) */
  COARSE_DIM: 256,
  /** Legacy dimension for backward compatibility */
  LEGACY_DIM: 1536,
  /** Model name */
  MODEL: "text-embedding-3-small",
} as const;

// PHI patterns matching openai.ts coverage: RRN, phone, Korean names
const PHI_PATTERNS = [
  /(\d{6})[-\s]?(\d{7})/,           // 주민번호
  /(\d{2,3})[-.\s]?(\d{3,4})[-.\s]?(\d{4})/, // 전화번호
];

// Common Korean titles that should NOT be flagged as PII
const SAFE_EMBEDDING_TITLES = new Set([
  "원장님", "선생님", "환자님", "보호자님", "어머님", "아버님",
  "부모님", "가족님", "고객님", "회원님", "사용자님", "담당자님",
  "간호사님", "약사님", "의사님", "교수님", "박사님", "관리자님",
]);

function checkEmbeddingPHI(text: string): void {
  for (const pattern of PHI_PATTERNS) {
    if (pattern.test(text)) {
      console.error("[Embedding PHI Guard] PHI 패턴 감지, 임베딩 차단");
      throw new Error("PHI_DETECTED: Embedding blocked - contains PII pattern");
    }
  }
  // Korean personal names + 님 (exclude common titles)
  const nameMatches = text.match(/[가-힣]{2,4}\s*님/g);
  if (nameMatches) {
    for (const match of nameMatches) {
      if (!SAFE_EMBEDDING_TITLES.has(match.replace(/\s/g, ""))) {
        console.error("[Embedding PHI Guard] 한국인 이름+님 패턴 감지, 임베딩 차단:", match);
        throw new Error("PHI_DETECTED: Embedding blocked - contains PII pattern");
      }
    }
  }
}

const directApiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: directApiKey || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  ...(directApiKey ? {} : { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL }),
});

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = "openai-embedding";
  private model: string;

  constructor(model: string = EMBEDDING_CONFIG.MODEL) {
    this.model = model;
  }

  /**
   * Generate embedding with specified dimensions (Stage 2: Matryoshka)
   * OpenAI text-embedding-3-small supports dimensions parameter natively
   */
  async embed(text: string, dimensions?: number): Promise<EmbeddingResult> {
    if (process.env.PII_BLOCK === "true") {
      checkEmbeddingPHI(text);
    }
    try {
      const response = await openai.embeddings.create({
        model: this.model,
        input: text.slice(0, 8000),
        dimensions: dimensions || EMBEDDING_CONFIG.FULL_DIM,
      });

      return {
        embedding: response.data[0].embedding,
        tokensUsed: response.usage?.total_tokens || 0,
        model: this.model,
      };
    } catch (error) {
      console.error("OpenAI embedding error:", { message: (error as Error).message });
      throw error;
    }
  }

  async embedBatch(texts: string[], dimensions?: number): Promise<EmbeddingResult[]> {
    const truncatedTexts = texts.map(t => t.slice(0, 8000));

    if (process.env.PII_BLOCK === "true") {
      for (const t of truncatedTexts) {
        checkEmbeddingPHI(t);
      }
    }
    try {
      const response = await openai.embeddings.create({
        model: this.model,
        input: truncatedTexts,
        dimensions: dimensions || EMBEDDING_CONFIG.FULL_DIM,
      });

      return response.data.map((d, i) => ({
        embedding: d.embedding,
        tokensUsed: Math.floor((response.usage?.total_tokens || 0) / texts.length),
        model: this.model,
      }));
    } catch (error) {
      console.error("OpenAI batch embedding error:", { message: (error as Error).message });
      throw error;
    }
  }

  /**
   * Stage 3: Generate coarse embedding (256d) for fast candidate retrieval
   */
  async embedCoarse(text: string): Promise<EmbeddingResult> {
    return this.embed(text, EMBEDDING_CONFIG.COARSE_DIM);
  }

  async embedCoarseBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return this.embedBatch(texts, EMBEDDING_CONFIG.COARSE_DIM);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await openai.embeddings.create({
        model: this.model,
        input: "test",
        dimensions: EMBEDDING_CONFIG.FULL_DIM,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export class EmbeddingRouter {
  private provider: OpenAIEmbeddingProvider;

  constructor() {
    this.provider = new OpenAIEmbeddingProvider();
  }

  /** Generate full-dimension embedding (512d) */
  async embed(text: string): Promise<EmbeddingResult> {
    return await this.provider.embed(text);
  }

  /** Generate full-dimension embeddings in batch (512d) */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return await this.provider.embedBatch(texts);
  }

  /** Stage 3: Generate coarse embedding (256d) for fast candidate retrieval */
  async embedCoarse(text: string): Promise<EmbeddingResult> {
    return await this.provider.embedCoarse(text);
  }

  /** Stage 3: Generate coarse embeddings in batch (256d) */
  async embedCoarseBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return await this.provider.embedCoarseBatch(texts);
  }

  /** Generate dual embeddings (512d full + 256d coarse) for storage */
  async embedDual(text: string): Promise<{ full: EmbeddingResult; coarse: EmbeddingResult }> {
    const [full, coarse] = await Promise.all([
      this.provider.embed(text),
      this.provider.embedCoarse(text),
    ]);
    return { full, coarse };
  }

  /** Generate dual embeddings in batch */
  async embedDualBatch(texts: string[]): Promise<{ full: EmbeddingResult[]; coarse: EmbeddingResult[] }> {
    const [full, coarse] = await Promise.all([
      this.provider.embedBatch(texts),
      this.provider.embedCoarseBatch(texts),
    ]);
    return { full, coarse };
  }

  /** Generate legacy 1536d embedding for backward compat with unmigrated rows */
  async embedLegacy(text: string): Promise<EmbeddingResult> {
    return await this.provider.embed(text, EMBEDDING_CONFIG.LEGACY_DIM);
  }

  async isAvailable(): Promise<boolean> {
    return await this.provider.isAvailable();
  }
}

export interface ChunkOptions {
  maxTokens?: number;
  overlap?: number;
  documentType?: "general" | "medical" | "auto";
}

const MEDICAL_SECTION_PATTERNS = [
  /(?:^|\n)\s*(?:■|▶|●|◆|○|□|▪|►|◈)\s*.+/g,
  /(?:^|\n)\s*(?:\d+[\.\)]\s*)?(?:혈액검사|일반혈액검사|생화학검사|혈청검사|소변검사|대변검사|간기능검사|신장기능검사|갑상선기능검사|지질검사|당뇨검사|빈혈검사|전해질검사|응고검사|종양표지자|감염검사|면역검사|심전도|흉부X선|복부초음파|위내시경|대장내시경|유방촬영|골밀도검사|안과검사|청력검사|폐기능검사|종합판정|판정|소견|결론|추가검사|권고사항|추적관찰|생활습관|식이요법|운동처방|약물치료)\s*[:\-]?\s*/gi,
  /(?:^|\n)\s*(?:검사항목|검사명|결과|참고치|단위|판정|정상범위|이상소견|기준치)\s*[:\|\-\t]/gi,
];

function detectMedicalDocument(text: string): boolean {
  const medicalKeywords = [
    "건강검진", "검진결과", "혈액검사", "소변검사", "생화학",
    "참고치", "정상범위", "판정", "이상소견", "종합판정",
    "건강진단", "검사결과", "진단서", "처방전", "의무기록",
    "mg/dL", "g/dL", "mmol/L", "IU/L", "mEq/L",
    "헤모글로빈", "혈당", "콜레스테롤", "크레아티닌", "AST", "ALT",
    "WBC", "RBC", "Hb", "Hct", "PLT", "BUN", "GFR",
  ];
  let matchCount = 0;
  const lowerText = text.toLowerCase();
  for (const kw of medicalKeywords) {
    if (lowerText.includes(kw.toLowerCase())) matchCount++;
  }
  return matchCount >= 3;
}

function splitMedicalSections(text: string): string[] {
  const sections: string[] = [];
  
  const sectionHeaders = /(?:^|\n)\s*(?:■|▶|●|◆|○|□|▪|►|◈|\d+[\.\)])\s*([^\n]+)/g;
  const medicalHeaders = /(?:^|\n)\s*(?:혈액검사|일반혈액검사|생화학검사|혈청검사|소변검사|대변검사|간기능검사|신장기능검사|갑상선기능검사|지질검사|당뇨검사|빈혈검사|전해질검사|응고검사|종양표지자|감염검사|면역검사|심전도|흉부X선|복부초음파|위내시경|대장내시경|유방촬영|골밀도검사|안과검사|청력검사|폐기능검사|종합판정|판정|소견|결론|추가검사|권고사항|추적관찰)[:\s\-]*/gi;
  
  const combinedPattern = new RegExp(
    `(${sectionHeaders.source}|${medicalHeaders.source})`,
    'gi'
  );
  
  const splits = text.split(combinedPattern).filter(s => s.trim().length > 0);
  
  if (splits.length <= 1) {
    const lines = text.split('\n');
    let currentSection = '';
    let currentHeader = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (currentSection.length > 50) {
          sections.push(currentHeader ? `${currentHeader}\n${currentSection}` : currentSection);
          currentSection = '';
          currentHeader = '';
        }
        continue;
      }
      
      const isHeader = /^(?:■|▶|●|◆|○|□|▪|►|◈|\d+[\.\)])\s/.test(trimmed) ||
        /^(?:혈액검사|일반혈액|생화학|소변검사|심전도|흉부|복부|종합판정|판정|소견|결론|권고)/i.test(trimmed);
      
      if (isHeader && currentSection.length > 0) {
        sections.push(currentHeader ? `${currentHeader}\n${currentSection}` : currentSection);
        currentSection = '';
        currentHeader = trimmed;
      } else if (isHeader) {
        currentHeader = trimmed;
      } else {
        currentSection += (currentSection ? '\n' : '') + trimmed;
      }
    }
    
    if (currentSection.trim().length > 0) {
      sections.push(currentHeader ? `${currentHeader}\n${currentSection}` : currentSection);
    }
    
    return sections.length > 0 ? sections : [text.trim()];
  }
  
  let currentSection = '';
  for (const split of splits) {
    const trimmed = split.trim();
    if (!trimmed) continue;
    
    if (combinedPattern.test(trimmed)) {
      if (currentSection.length > 0) {
        sections.push(currentSection.trim());
      }
      currentSection = trimmed;
      combinedPattern.lastIndex = 0;
    } else {
      currentSection += '\n' + trimmed;
    }
  }
  
  if (currentSection.trim().length > 0) {
    sections.push(currentSection.trim());
  }
  
  return sections.length > 0 ? sections : [text.trim()];
}

function splitIntoSemanticSegments(text: string, documentType?: "general" | "medical" | "auto"): string[] {
  const effectiveType = documentType || "auto";
  const isMedical = effectiveType === "medical" || (effectiveType === "auto" && detectMedicalDocument(text));
  
  if (isMedical) {
    const medSections = splitMedicalSections(text);
    if (medSections.length > 1) {
      return medSections;
    }
  }
  
  const segments: string[] = [];

  const sectionPattern = /\n\s*\[.+?\]\s*\n|\n\s*#{1,3}\s+.+|\n\s*={3,}\s*\n|\n\s*-{3,}\s*\n/g;
  const sectionSplits = text.split(sectionPattern);
  const sectionHeaders = text.match(sectionPattern) || [];

  if (sectionSplits.length <= 1) {
    const paragraphs = text.split(/\n\s*\n+/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.length > 0) {
        segments.push(trimmed);
      }
    }
    return segments;
  }

  for (let i = 0; i < sectionSplits.length; i++) {
    const header = i > 0 && sectionHeaders[i - 1] ? sectionHeaders[i - 1].trim() : '';
    const content = sectionSplits[i].trim();
    if (!content && !header) continue;

    const combined = header ? `${header}\n${content}` : content;

    const paragraphs = combined.split(/\n\s*\n+/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.length > 0) {
        segments.push(trimmed);
      }
    }
  }

  return segments;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const { maxTokens = 500, overlap: overlapTokens, documentType } = options;

  const overlapRatio = 0.2;
  const rawOverlap = overlapTokens ?? Math.round(maxTokens * overlapRatio);
  const effectiveOverlap = Math.min(rawOverlap, Math.floor(maxTokens * 0.4));

  const avgCharsPerToken = 4;
  const chunkSizeChars = maxTokens * avgCharsPerToken;
  const overlapSizeChars = effectiveOverlap * avgCharsPerToken;

  if (text.length <= chunkSizeChars) {
    return [text.trim()].filter(c => c.length > 0);
  }

  const segments = splitIntoSemanticSegments(text, documentType);

  if (segments.length === 0) {
    return [text.trim()].filter(c => c.length > 0);
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let prevTail = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (currentChunk.length === 0 && prevTail.length > 0) {
      currentChunk = prevTail;
    }

    const candidate = currentChunk.length > 0
      ? currentChunk + '\n\n' + segment
      : segment;

    if (candidate.length <= chunkSizeChars) {
      currentChunk = candidate;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());

        prevTail = currentChunk.length > overlapSizeChars
          ? currentChunk.slice(-overlapSizeChars).trim()
          : currentChunk.trim();
      }

      if (segment.length <= chunkSizeChars) {
        currentChunk = prevTail.length > 0
          ? prevTail + '\n\n' + segment
          : segment;

        if (currentChunk.length > chunkSizeChars) {
          currentChunk = segment;
        }
      } else {
        let start = 0;
        while (start < segment.length) {
          let end = start + chunkSizeChars;
          if (end < segment.length) {
            const searchStart = Math.max(start + Math.floor(chunkSizeChars * 0.5), start);
            const lastSentenceEnd = Math.max(
              segment.lastIndexOf('. ', end),
              segment.lastIndexOf('.\n', end),
              segment.lastIndexOf('\n', end)
            );
            if (lastSentenceEnd > searchStart) {
              end = lastSentenceEnd + 1;
            }
          } else {
            end = segment.length;
          }

          const piece = segment.slice(start, end).trim();
          if (piece.length > 0) {
            if (start === 0 && prevTail.length > 0) {
              const withOverlap = prevTail + '\n\n' + piece;
              chunks.push(withOverlap.length <= chunkSizeChars * 1.1
                ? withOverlap.trim()
                : piece);
            } else {
              chunks.push(piece);
            }
          }
          start = end - overlapSizeChars;
          if (start >= segment.length - overlapSizeChars) break;
        }
        prevTail = '';
        currentChunk = '';
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 0);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export const embeddingRouter = new EmbeddingRouter();
