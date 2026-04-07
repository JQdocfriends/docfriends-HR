/**
 * PubMed Service - External Medical Database Integration
 * 
 * Provides search and retrieval from NCBI PubMed API for evidence-based medical references.
 * Uses the public E-utilities API (no API key required for basic usage).
 */

export interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  pubDate: string;
  abstract: string;
  doi?: string;
  url: string;
}

export interface PubMedSearchResult {
  articles: PubMedArticle[];
  totalFound: number;
  query: string;
  searchTimeMs: number;
}

const PUBMED_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const MAX_RESULTS = 5;
const TIMEOUT_MS = 10000;

export async function searchPubMed(query: string, maxResults = MAX_RESULTS): Promise<PubMedSearchResult> {
  const startTime = Date.now();
  
  try {
    const searchUrl = `${PUBMED_BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;
    
    const searchResponse = await fetchWithTimeout(searchUrl, TIMEOUT_MS);
    const searchData = await searchResponse.json();
    
    const pmids: string[] = searchData.esearchresult?.idlist || [];
    
    if (pmids.length === 0) {
      return {
        articles: [],
        totalFound: 0,
        query,
        searchTimeMs: Date.now() - startTime,
      };
    }
    
    const summaryUrl = `${PUBMED_BASE_URL}/esummary.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=json`;
    const summaryResponse = await fetchWithTimeout(summaryUrl, TIMEOUT_MS);
    const summaryData = await summaryResponse.json();
    
    const articles: PubMedArticle[] = [];
    
    for (const pmid of pmids) {
      const article = summaryData.result?.[pmid];
      if (article) {
        articles.push({
          pmid,
          title: article.title || "Untitled",
          authors: (article.authors || []).map((a: any) => a.name).slice(0, 3),
          journal: article.source || "",
          pubDate: article.pubdate || "",
          abstract: "",
          doi: extractDoi(article.elocationid || ""),
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        });
      }
    }
    
    return {
      articles,
      totalFound: parseInt(searchData.esearchresult?.count || "0", 10),
      query,
      searchTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[PubMed] Search error:", error);
    return {
      articles: [],
      totalFound: 0,
      query,
      searchTimeMs: Date.now() - startTime,
    };
  }
}

export async function getAbstracts(pmids: string[]): Promise<Map<string, string>> {
  const abstracts = new Map<string, string>();
  
  if (pmids.length === 0) return abstracts;
  
  try {
    const fetchUrl = `${PUBMED_BASE_URL}/efetch.fcgi?db=pubmed&id=${pmids.join(",")}&rettype=abstract&retmode=xml`;
    const response = await fetchWithTimeout(fetchUrl, TIMEOUT_MS);
    const xmlText = await response.text();
    
    for (const pmid of pmids) {
      const abstractMatch = xmlText.match(new RegExp(`<PMID[^>]*>${pmid}</PMID>[\\s\\S]*?<AbstractText[^>]*>([\\s\\S]*?)</AbstractText>`, "i"));
      if (abstractMatch) {
        abstracts.set(pmid, cleanAbstract(abstractMatch[1]));
      }
    }
  } catch (error) {
    console.error("[PubMed] Fetch abstracts error:", error);
  }
  
  return abstracts;
}

export function formatPubMedCitation(article: PubMedArticle, index: number): string {
  const authorsStr = article.authors.length > 0 
    ? article.authors.slice(0, 2).join(", ") + (article.authors.length > 2 ? " et al." : "")
    : "Unknown authors";
  
  return `[${index}] ${authorsStr}. "${article.title}" ${article.journal} (${article.pubDate}). PMID: ${article.pmid}`;
}

export function formatInlineCitation(article: PubMedArticle, index: number): string {
  return `[${index}]`;
}

function extractDoi(elocationId: string): string | undefined {
  const match = elocationId.match(/doi:\s*(10\.\S+)/i);
  return match ? match[1] : undefined;
}

function cleanAbstract(rawAbstract: string): string {
  return rawAbstract
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1000);
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export function buildMedicalQuery(userQuery: string): string {
  const koreanToEnglish: Record<string, string> = {
    "당뇨": "diabetes mellitus",
    "고혈압": "hypertension",
    "암": "cancer neoplasm",
    "심장병": "cardiovascular disease",
    "폐렴": "pneumonia",
    "천식": "asthma",
    "관절염": "arthritis",
    "위염": "gastritis",
    "우울증": "depression",
    "두통": "headache migraine",
    "허리통증": "low back pain",
    "골다공증": "osteoporosis",
    "갑상선": "thyroid",
    "간염": "hepatitis",
    "신장": "kidney renal",
  };
  
  let translatedQuery = userQuery;
  for (const [korean, english] of Object.entries(koreanToEnglish)) {
    translatedQuery = translatedQuery.replace(new RegExp(korean, "g"), english);
  }
  
  return translatedQuery.trim();
}
