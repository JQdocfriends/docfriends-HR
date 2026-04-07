/**
 * RAG Reranker - BM25 + Vector Hybrid 재랭킹 + Optional LLM Reranking
 * 
 * 전략:
 * 1차: pgvector cosine similarity Top 50 + keyword hybrid
 * 2차: rerank Top 12 (BM25 + vector hybrid)
 * 3차(선택): LLM rerank Top 6~8 (gpt-4o-mini 기반 관련성 재평가)
 * 최종: 컨텍스트 Top 6~10 (토큰 예산 기반)
 */

import type { RagSource } from "./retriever";
import OpenAI from "openai";

export interface RerankOptions {
  topK?: number;
  vectorWeight?: number;
  bm25Weight?: number;
  priorityWeight?: number;
}

const DEFAULT_OPTIONS: RerankOptions = {
  topK: 12,
  vectorWeight: 0.5,
  bm25Weight: 0.3,
  priorityWeight: 0.2,
};

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function calculateTF(terms: string[], doc: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const term of terms) {
    const count = doc.filter(t => t === term).length;
    tf.set(term, count / (doc.length || 1));
  }
  return tf;
}

function calculateIDF(term: string, docs: string[][]): number {
  const containingDocs = docs.filter(d => d.includes(term)).length;
  if (containingDocs === 0) return 0;
  return Math.log((docs.length + 1) / (containingDocs + 1)) + 1;
}

function bm25Score(
  queryTerms: string[],
  docTerms: string[],
  allDocTerms: string[][],
  k1: number = 1.5,
  b: number = 0.75
): number {
  const avgDocLength = allDocTerms.reduce((sum, d) => sum + d.length, 0) / allDocTerms.length || 1;
  let score = 0;
  
  for (const term of queryTerms) {
    const termFreq = docTerms.filter(t => t === term).length;
    const idf = calculateIDF(term, allDocTerms);
    const numerator = termFreq * (k1 + 1);
    const denominator = termFreq + k1 * (1 - b + b * (docTerms.length / avgDocLength));
    score += idf * (numerator / denominator);
  }
  
  return score;
}

export function rerank(
  query: string,
  sources: RagSource[],
  options: RerankOptions = {}
): RagSource[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (sources.length === 0) {
    return [];
  }
  
  const queryTerms = tokenize(query);
  const docTerms = sources.map(s => tokenize(`${s.title} ${s.content}`));
  
  const maxVectorScore = Math.max(...sources.map(s => s.score || 0), 0.001);
  const bm25Scores = sources.map((s, i) => bm25Score(queryTerms, docTerms[i], docTerms));
  const maxBm25Score = Math.max(...bm25Scores, 0.001);
  const maxPriority = Math.max(...sources.map(s => s.priority || 0), 1);
  
  const rankedSources = sources.map((source, i) => {
    const normalizedVector = (source.score || 0) / maxVectorScore;
    const normalizedBm25 = bm25Scores[i] / maxBm25Score;
    const normalizedPriority = (source.priority || 0) / maxPriority;
    
    const combinedScore = 
      opts.vectorWeight! * normalizedVector +
      opts.bm25Weight! * normalizedBm25 +
      opts.priorityWeight! * normalizedPriority;
    
    return {
      ...source,
      score: combinedScore,
    };
  });
  
  return rankedSources
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, opts.topK);
}

export function diversifyResults(
  sources: RagSource[],
  maxPerType: number = 3
): RagSource[] {
  const typeCount: Record<string, number> = {};
  const diversified: RagSource[] = [];
  
  for (const source of sources) {
    const type = source.sourceType;
    const currentCount = typeCount[type] || 0;
    
    if (currentCount < maxPerType) {
      diversified.push(source);
      typeCount[type] = currentCount + 1;
    }
  }
  
  return diversified;
}

export async function llmRerank(
  query: string,
  sources: RagSource[],
  topK: number = 6
): Promise<RagSource[]> {
  if (sources.length <= topK) return sources;
  
  const candidates = sources.slice(0, Math.min(sources.length, 15));
  
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[RAG-Rerank] No OpenAI API key available, skipping LLM rerank");
    return candidates.slice(0, topK);
  }
  
  try {
    const openai = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      timeout: 15000,
    });
    
    const docsForPrompt = candidates.map((s, i) => {
      const contentPreview = (s.content || "").substring(0, 300);
      return `[${i}] 제목: ${s.title || "없음"}\n유형: ${s.sourceType}\n내용: ${contentPreview}`;
    }).join("\n---\n");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `당신은 의료 문서 관련성 평가 전문가입니다. 사용자 질문에 가장 관련성 높은 문서를 선택하세요.
결과는 반드시 JSON 배열로만 응답하세요. 관련성 높은 순서대로 문서 인덱스를 나열합니다.
예: [2, 0, 5, 1]
최대 ${topK}개만 선택하세요. 관련 없는 문서는 제외하세요.`,
        },
        {
          role: "user",
          content: `질문: ${query}\n\n후보 문서:\n${docsForPrompt}`,
        },
      ],
    });
    
    const text = response.choices[0]?.message?.content?.trim() || "";
    const jsonMatch = text.match(/\[[\d\s,]+\]/);
    
    if (!jsonMatch) {
      console.log("[RAG-Rerank] LLM rerank failed to parse response, using original order");
      return candidates.slice(0, topK);
    }
    
    const indices: number[] = JSON.parse(jsonMatch[0]);
    const reranked: RagSource[] = [];
    const seen = new Set<number>();
    
    for (const idx of indices) {
      if (idx >= 0 && idx < candidates.length && !seen.has(idx)) {
        const source = candidates[idx];
        source.score = 1.0 - (reranked.length * 0.1);
        reranked.push(source);
        seen.add(idx);
      }
      if (reranked.length >= topK) break;
    }
    
    if (reranked.length < topK) {
      for (let i = 0; i < candidates.length && reranked.length < topK; i++) {
        if (!seen.has(i)) {
          reranked.push(candidates[i]);
        }
      }
    }
    
    console.log(`[RAG-Rerank] LLM reranked ${candidates.length} candidates → ${reranked.length} results`);
    return reranked;
    
  } catch (error: any) {
    console.log("[RAG-Rerank] LLM rerank failed, using BM25 ranking:", error?.message);
    return candidates.slice(0, topK);
  }
}
