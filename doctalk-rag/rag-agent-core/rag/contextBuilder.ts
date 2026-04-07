/**
 * Context Builder - 토큰 예산 기반 컨텍스트 구성
 * 
 * RAG 검색 결과를 토큰 예산에 맞춰 Top-K로 구성
 * Citations(출처) 정보 포함
 */

import type { RagSource } from "./retriever";

export interface ContextOptions {
  maxTokens?: number;
  includeCitations?: boolean;
  formatStyle?: "compact" | "detailed";
}

export interface BuiltContext {
  context: string;
  citations: Citation[];
  tokensUsed: number;
  sourcesUsed: number;
}

export interface Citation {
  id: string;
  sourceType: string;
  title: string;
  relevanceScore: number;
}

const DEFAULT_OPTIONS: ContextOptions = {
  maxTokens: 3000,
  includeCitations: true,
  formatStyle: "compact",
};

function estimateTokens(text: string): number {
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const numbers = (text.match(/\d+/g) || []).length;
  
  return Math.ceil(koreanChars * 0.5 + englishWords + numbers * 0.5);
}

function formatSourceCompact(source: RagSource, index: number): string {
  return `[${index + 1}] ${source.title}\n${source.content.slice(0, 500)}${source.content.length > 500 ? "..." : ""}`;
}

function formatSourceDetailed(source: RagSource, index: number): string {
  return `---
[출처 ${index + 1}] ${source.sourceType}
제목: ${source.title}
내용: ${source.content}
---`;
}

/**
 * Reorder sources to mitigate "lost-in-the-middle" effect.
 * LLMs attend more strongly to content at the start and end of context.
 * Strategy: Place top 20% at start, bottom 20% next, middle 60% last.
 */
function reorderForAttention(sources: RagSource[]): RagSource[] {
  if (sources.length <= 3) return sources;

  const topCount = Math.max(1, Math.ceil(sources.length * 0.2));
  const bottomCount = Math.max(1, Math.ceil(sources.length * 0.2));

  const gold = sources.slice(0, topCount);
  const bronze = sources.slice(sources.length - bottomCount);
  const middle = sources.slice(topCount, sources.length - bottomCount);

  return [...gold, ...bronze, ...middle];
}

export function buildContext(
  sources: RagSource[],
  options: ContextOptions = {}
): BuiltContext {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const citations: Citation[] = [];
  const contextParts: string[] = [];
  let totalTokens = 0;
  let sourcesUsed = 0;

  const headerText = "## 참고 자료 (RAG 검색 결과)\n\n";
  totalTokens += estimateTokens(headerText);
  contextParts.push(headerText);

  // Reorder sources so most-relevant content is at start and end (not buried in middle)
  const reordered = reorderForAttention(sources);

  for (let i = 0; i < reordered.length; i++) {
    const source = reordered[i];

    const formattedSource = opts.formatStyle === "detailed"
      ? formatSourceDetailed(source, i)
      : formatSourceCompact(source, i);

    const sourceTokens = estimateTokens(formattedSource);

    if (totalTokens + sourceTokens > opts.maxTokens!) {
      break;
    }

    contextParts.push(formattedSource);
    totalTokens += sourceTokens;
    sourcesUsed++;

    if (opts.includeCitations) {
      citations.push({
        id: source.id,
        sourceType: source.sourceType,
        title: source.title,
        relevanceScore: source.score || 0,
      });
    }
  }

  if (sourcesUsed === 0) {
    const noDataMessage = "참고할 수 있는 자료가 없습니다. 일반적인 의료 지식을 바탕으로 안내해드립니다.";
    contextParts.push(noDataMessage);
    totalTokens += estimateTokens(noDataMessage);
  }

  return {
    context: contextParts.join("\n\n"),
    citations,
    tokensUsed: totalTokens,
    sourcesUsed,
  };
}

export function buildCitationFooter(citations: Citation[]): string {
  if (citations.length === 0) {
    return "";
  }
  
  const lines = citations.map((c, i) => 
    `[${i + 1}] ${c.sourceType}: ${c.title}`
  );
  
  return `\n\n---\n참고 출처:\n${lines.join("\n")}`;
}

export function formatInlineCitations(citations: Citation[], style: "numbered" | "superscript" = "numbered"): string {
  if (citations.length === 0) {
    return "";
  }
  
  if (style === "superscript") {
    return citations.map((_, i) => `[${i + 1}]`).join("");
  }
  
  return citations.map((_, i) => `[${i + 1}]`).join(" ");
}

export interface InlineCitationContext {
  sourceMap: Map<string, number>;
  getIndex: (sourceId: string) => number;
  format: (sourceId: string) => string;
}

export function createInlineCitationContext(citations: Citation[]): InlineCitationContext {
  const sourceMap = new Map<string, number>();
  citations.forEach((c, i) => sourceMap.set(c.id, i + 1));
  
  return {
    sourceMap,
    getIndex: (sourceId: string) => sourceMap.get(sourceId) || 0,
    format: (sourceId: string) => {
      const index = sourceMap.get(sourceId);
      return index ? `[${index}]` : "";
    },
  };
}

export function buildInlineCitationPromptGuide(inlineCitationEnabled: boolean): string {
  if (!inlineCitationEnabled) {
    return "";
  }
  
  return `
## 인용 형식 안내
응답 시 참고한 출처에 대해 해당 문장 끝에 [1], [2] 형식으로 인용 번호를 표시해주세요.
예시: "당뇨병 환자에게 메트포르민이 권장됩니다[1]."
모든 주장에는 가능한 한 출처 번호를 포함해주세요.
`;
}

export function trimToTokenBudget(text: string, maxTokens: number): string {
  let tokens = estimateTokens(text);
  
  if (tokens <= maxTokens) {
    return text;
  }
  
  const ratio = maxTokens / tokens;
  const targetLength = Math.floor(text.length * ratio * 0.9);
  
  return text.slice(0, targetLength) + "...";
}
