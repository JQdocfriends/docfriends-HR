# Doctalk RAG + Patient Wiki (Karpathy LLM Wiki 패턴)

## 아키텍처

```
환자 데이터 → 청크 + 합성 요약 문서(Wiki) → 쿼리 시 Wiki 먼저 참조 → 벡터 fallback → AI 답변
```

## 핵심 파일

| 파일 | 역할 |
|------|------|
| `patientWikiService.ts` | 환자별 합성 요약 문서 생성/캐시/증분 업데이트 |
| `patientContextService.ts` | AI 대화 시 환자 컨텍스트 빌드 (Wiki 우선 → facts/sources fallback) |
| `ragService.ts` | 벡터DB 검색 (pgvector, multi-index, reranking) |
| `knowledgePipeline.ts` | 데이터 → 청크 → 임베딩 → 벡터DB 저장 |
| `embedding.ts` | OpenAI text-embedding-3-small 임베딩 |

## Karpathy LLM Wiki 패턴 적용

1. **Pre-compiled > Runtime retrieval**: 환자 데이터를 미리 합성 요약 문서로 정리
2. **Incremental update**: 새 데이터 → `invalidatePatientWiki()` → 다음 쿼리에 자동 재생성
3. **Compound**: AI 답변(상담 요약)을 patient_sources에 저장 → 다음 Wiki에 반영
4. **Index-first**: Wiki가 있으면 벡터 검색 스킵 (속도 + 정확도 향상)
5. **BM25 + Vector + Reranking**: 하이브리드 검색 (의학 용어 정확 매칭)

## 다른 프로덕트에서 사용하려면

1. `patientWikiService.ts`의 `buildPatientWiki()` 함수를 도메인에 맞게 수정
2. DB 테이블: `patient_sources`, `patient_facts` → 도메인 데이터 테이블로 교체
3. `getPatientWiki(entityId, scopeId)` → `getEntityWiki(entityId, scopeId)`
4. 임베딩: `text-embedding-3-small` (1536차원, 한국어 성능 우수)
5. 벡터DB: pgvector + HNSW 인덱스

## 기술 스택

- Embedding: OpenAI text-embedding-3-small
- Vector DB: PostgreSQL + pgvector 0.8.0
- Chunking: 카테고리별 분리 (진단/처방/검사/증상/방문)
- Retrieval: Multi-index + Reranking
- Safety: Pre/Post check layer

## 라이선스

닥프렌즈 내부 사용 전용
