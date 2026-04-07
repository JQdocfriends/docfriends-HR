# RAG 기반 AI Agent — 핵심 소스코드

닥톡AI Agent에서 추출한 RAG(Retrieval-Augmented Generation) 기반 AI Agent 핵심 모듈입니다.

## 구조

```
llm/                    # LLM Provider Layer
├── embedding.ts        # OpenAI text-embedding-3-small (512d/256d/1536d)
├── provider.ts         # AI 응답 생성 (Gemini flash / OpenAI GPT)
├── gemini.ts           # Google Gemini SDK wrapper
├── openai.ts           # OpenAI SDK wrapper
└── router.ts           # LLM 라우팅 (모델 선택)

rag/                    # RAG Engine
├── retriever.ts        # 벡터 검색 (pgvector HNSW, 2-tier coarse→fine)
├── agentChatService.ts # AI Agent 채팅 (SSE 스트리밍)
├── contextBuilder.ts   # 컨텍스트 블록 생성 (1500토큰 예산)
├── patientContextService.ts # 환자별 대화 메모리
├── reranker.ts         # 검색 결과 재정렬
├── safety.ts           # PHI Guard (민감 정보 차단)
└── pubmedService.ts    # PubMed 의학 논문 검색

knowledgePipeline.ts    # 지식 청킹 + 임베딩 + 벡터DB 저장
pgvectorMigration.ts    # TurboQuant 3단계 벡터 최적화 (halfvec 512d + coarse 256d)
consultationSummaryService.ts # 상담 자동 요약 (Gemini flash)
hospitalAutoFillService.ts    # HIRA 공공 API 병원 정보 자동 채우기
schema.ts               # Drizzle ORM 스키마 (타입 참조용)
```

## 핵심 기술

1. **TurboQuant**: halfvec(512d) + coarse(256d) + 2-tier 검색으로 벡터 검색 최적화
2. **Wall RAG**: orgId + doctorId 기반 데이터 격리 (의사별 지식 분리)
3. **SSE 스트리밍**: AI 응답을 실시간 스트리밍으로 전달
4. **PHI Guard**: 환자 개인정보 자동 감지 및 차단
5. **Multi-LLM**: Gemini flash(기본) + OpenAI GPT(fallback) 자동 전환

## 의존성

- PostgreSQL + pgvector 0.8.0
- OpenAI API (embedding)
- Google Gemini API (chat)
- Drizzle ORM

## 다른 프로젝트에서 사용하려면

1. `llm/` + `rag/` 폴더를 프로젝트에 복사
2. `knowledgePipeline.ts`로 지식 데이터를 벡터화
3. `retriever.ts`로 검색
4. `agentChatService.ts`로 AI 응답 생성
5. DB 스키마는 `schema.ts` 참조하여 필요한 테이블만 생성
