# Town (타운) - Product Requirements Document

**Version**: 2.1
**Last Updated**: February 26, 2026
**Author**: Product Manager (town-hr-team)
**Status**: MVP Phase - Sprint Planning Complete

---

## Table of Contents

1. [Introduction & Overview](#1-introduction--overview)
2. [Goals & Objectives](#2-goals--objectives)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Module 1: Member/Org Management (구성원/조직 관리)](#4-module-1-memberorg-management)
5. [Module 2: Attendance Management (근태 관리)](#5-module-2-attendance-management)
6. [Module 3: E-Contracts (전자계약서)](#6-module-3-e-contracts)
7. [Module 4: Workflows/E-Approval (전자결재)](#7-module-4-workflowse-approval)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)
9. [Non-Goals (MVP Phase)](#9-non-goals-mvp-phase)
10. [Design System](#10-design-system)
11. [Technical Architecture](#11-technical-architecture)
12. [Data Model (Firestore Schema)](#12-data-model-firestore-schema)
13. [Korean-Specific Requirements](#13-korean-specific-requirements)
14. [Success Metrics](#14-success-metrics)
15. [Sprint Backlog](#15-sprint-backlog)
16. [Open Questions](#16-open-questions)

---

## 1. Introduction & Overview

### Product Vision

Town(타운)은 **IT 스타트업을 위한 사내 HR 관리 도구**입니다. flex.team에서 영감을 받아, 종이 기반의 수작업 HR 프로세스를 디지털화하고 근로기준법을 자동으로 준수하도록 설계되었습니다.

### Product Type

| 항목 | 설정 |
|------|------|
| **유형** | 사내 전용 HR 관리 도구 (Internal tool) |
| **대상** | 단일 IT 스타트업 회사 (NOT SaaS, 멀티테넌시 미지원) |
| **플랫폼** | Web only (반응형 웹 - 데스크톱, 태블릿, 모바일) |
| **언어** | 한국어 전용 (UI 및 모든 사용자 대면 텍스트) |

### MVP Scope: 4 Core Modules

| # | 모듈 | 설명 | 우선순위 |
|---|------|------|---------|
| 1 | **구성원/조직 관리** | 구성원 정보, 프로필, 조직도, 부서/팀, 권한 관리 | P0 |
| 2 | **근태 관리** | 출퇴근 기록, 연차/휴가, 52시간 모니터링 | P0 |
| 3 | **전자계약서** | 계약서 템플릿, 전자 서명, 계약 이력 | P1 |
| 4 | **워크플로우(전자결재)** | 결재 양식, 결재선, 결재 처리, 문서 보관 | P1 |

---

## 2. Goals & Objectives

### Strategic Goals

| Goal | 목표 | 측정 방법 |
|------|------|---------|
| **G1** | HR 업무 100% 디지털 전환 | 모든 MVP 기능 온라인 처리 가능 |
| **G2** | 근로기준법 자동 준수 (주 52시간, 연차) | 실시간 초과근무 경고, 자동 연차 부여 |
| **G3** | 계약 관리 효율화 | 계약 처리 시간 기존 대비 80% 단축 |
| **G4** | 승인 프로세스 표준화 | 결재 처리 시간 기존 대비 70% 단축 |

### Success Criteria

- HR 프로세스 디지털화율: 100%
- 주 52시간 준수율: 95% 이상
- 계약 처리 시간: 평균 1일 이내
- 결재 처리 시간: 평균 4시간 이내
- 시스템 응답 시간: 페이지 로드 2초 이내
- 구성원 만족도: 4.0/5.0 이상 (도입 3개월 후)

---

## 3. User Roles & Permissions

### 3-Tier RBAC Model

| 역할 | 한국어명 | 설명 | 주요 권한 |
|------|---------|------|----------|
| **Admin** | 관리자 | 시스템 전체 관리 | 모든 기능 접근, 설정 변경, 역할 관리 |
| **Manager** | 매니저 | HR + 팀 관리 통합 | 구성원 관리, 근태 관리, 계약 관리, 리포트, 휴가 승인 |
| **Employee** | 일반직원 | 기본 사용자 | 본인 정보 조회/수정, 출퇴근, 휴가 신청, 결재 요청 |

### Permission Matrix

| 기능 | Admin | Manager | Employee |
|------|-------|---------|----------|
| 회사 설정 | RW | - | - |
| 구성원 등록/수정 | RW | RW | 본인만 R |
| 부서/팀 관리 | RW | RW | R |
| 근태 정책 설정 | RW | RW | R |
| 출퇴근 기록 | RW | RW(수정) | 본인 RW |
| 휴가 승인 | RW | RW | - |
| 계약서 관리 | RW | RW | 본인만 R |
| 결재 양식 관리 | RW | R | R |
| 결재 처리 | RW | RW | 신청만 |
| 리포트 | RW | RW | 본인만 |

R = Read, W = Write, RW = Read/Write

---

## 4. Module 1: Member/Org Management (구성원/조직 관리)

### User Stories

#### US-001: Google OAuth 로그인

**Description**: As a 구성원(모든 역할), I want Google 계정으로 로그인할 수 있어야 하므로 빠르게 시스템에 접근하고 싶습니다.

**Acceptance Criteria**:
- [ ] Firebase Auth Google OAuth 프로바이더 통합
- [ ] 로그인 페이지 UI 구현 (Google 로그인 버튼, Town 로고)
- [ ] 회사 도메인 제한 옵션 (허용된 이메일 도메인만 로그인)
- [ ] 인증 실패 시 한국어 오류 메시지 표시
- [ ] 성공 시 대시보드로 자동 리다이렉트
- [ ] 로그아웃 기능 구현
- [ ] 유휴 30분 후 자동 로그아웃 (경고 팝업 포함)
- [ ] 브라우저에서 UI 확인 가능

**Dependencies**: None

---

#### US-002: 역할 기반 접근 제어 (RBAC)

**Description**: As a 관리자, I want 구성원의 역할에 따라 접근 가능한 기능을 제어하고 싶습니다.

**Acceptance Criteria**:
- [ ] 3개 역할 정의: Admin, Manager, Employee
- [ ] 각 역할별 권한 매트릭스 구현 (메뉴/기능별)
- [ ] 미인가 접근 시 403 페이지 표시 (한국어)
- [ ] Firestore 보안 규칙으로 데이터 레벨 접근 제어
- [ ] 역할 변경 이력 추적 (audit log)
- [ ] 권한 기반 UI 요소 표시/숨김

**Dependencies**: US-001

---

#### US-003: 회사 초기 설정 위저드

**Description**: As a 관리자, I want 처음 시스템 설정 시 회사 정보와 정책을 단계별로 입력하고 싶습니다.

**Acceptance Criteria**:
- [ ] 단계별 위저드 UI (회사정보 -> 근무정책 -> 조직구조 -> 초대)
- [ ] 회사명, 대표명, 사업자번호(XXX-XX-XXXXX 형식), 주소 입력
- [ ] 근무 유형 설정 (고정근무, 유연근무, 시차근무)
- [ ] 주간 근무시간 설정 (기본 40시간), 점심시간 설정
- [ ] 연차 정책 설정 (입사일 기준 / 회계연도 기준)
- [ ] 부서/팀 초기 생성
- [ ] 위저드 완료 전 다른 페이지 접근 차단
- [ ] 진행 상황 저장 (중간 이탈 시 이어서 진행 가능)

**Dependencies**: US-001, US-002

---

#### US-004: 메인 네비게이션 및 대시보드

**Description**: As a 모든 사용자, I want 직관적인 좌측 사이드바 네비게이션으로 각 모듈에 접근하고 싶습니다.

**Acceptance Criteria**:
- [ ] 좌측 고정 사이드바 (접기/펼치기 가능)
- [ ] 메뉴: 대시보드, 구성원, 근태, 계약서, 결재, 설정
- [ ] 역할별 메뉴 표시 (권한 없는 메뉴 숨김)
- [ ] 메인 대시보드: 오늘 출근 현황, 이번주 근무시간, 대기 중인 결재, 최근 활동
- [ ] 사용자 프로필 메뉴 (프로필 보기, 로그아웃)
- [ ] 현재 페이지 메뉴 하이라이트
- [ ] 반응형: 모바일에서 햄버거 메뉴로 전환 (768px 미만)
- [ ] 헤더: 현재 페이지 제목, 알림 아이콘, 프로필

**Dependencies**: US-001, US-002, US-003

---

#### US-005: 구성원 등록 및 프로필 관리

**Description**: As a 매니저, I want 구성원의 기본 정보를 등록하고 관리하고 싶습니다.

**Acceptance Criteria**:
- [ ] 구성원 정보 입력 폼: 이름, 이메일, 휴대폰(010-XXXX-XXXX), 직급, 부서, 입사일, 생년월일
- [ ] Firebase Storage에 프로필 사진 업로드 (JPG/PNG, 최대 5MB)
- [ ] 구성원 정보 수정 (매니저/관리자만)
- [ ] 구성원 상세 조회 페이지 (프로필 카드 형식)
- [ ] 상태 관리: 재직(active), 휴직(on_leave), 퇴사(resigned)
- [ ] 구성원 일괄 초대 (이메일 목록으로)
- [ ] 퇴사 처리 시 시스템 접근 자동 차단

**Dependencies**: US-001, US-002, US-003

---

#### US-006: 구성원 목록 조회 및 검색

**Description**: As a 매니저, I want 구성원을 다양한 조건으로 검색하고 필터링하고 싶습니다.

**Acceptance Criteria**:
- [ ] 구성원 목록 테이블 (이름, 직급, 부서, 상태, 입사일)
- [ ] 실시간 검색 (이름, 이메일, 부서명)
- [ ] 필터: 부서별, 직급별, 상태별 (재직/휴직/퇴사)
- [ ] 정렬: 이름(가나다순), 입사일 오름차순/내림차순
- [ ] 페이지네이션 (20명/페이지 기본)
- [ ] CSV 다운로드 (Admin/Manager만)

**Dependencies**: US-005

---

#### US-007: 부서/팀 관리

**Description**: As a 관리자, I want 부서와 팀을 생성하고 계층 구조를 설정하고 싶습니다.

**Acceptance Criteria**:
- [ ] 부서 CRUD (부서명, 부서장, 설명)
- [ ] 팀 CRUD (팀명, 팀장, 상위 부서)
- [ ] 부서-팀 2단계 계층 구조 관리
- [ ] 구성원을 부서/팀에 배치 (1인 1부서)
- [ ] 부서장/팀장 지정 및 변경
- [ ] 부서/팀 삭제 시 소속 구성원 처리 규칙 (미배치 상태로 전환)

**Dependencies**: US-005

---

#### US-008: 직급/직책 관리

**Description**: As a 매니저, I want 회사의 직급과 직책 체계를 정의하고 싶습니다.

**Acceptance Criteria**:
- [ ] 직급 마스터 관리 (신입, 주니어, 시니어, 리드, 매니저 등)
- [ ] 직책 마스터 관리 (개발자, 디자이너, PM, 마케터 등)
- [ ] 직급 순서(레벨) 설정
- [ ] 구성원에 직급/직책 할당
- [ ] 직급 변경 이력 추적

**Dependencies**: US-005

---

#### US-009: 조직도 시각화

**Description**: As a 모든 사용자, I want 전사 조직도를 트리 형태로 보고 싶습니다.

**Acceptance Criteria**:
- [ ] 트리 뷰: 회사 -> 부서 -> 팀 -> 구성원
- [ ] 노드 전개/축소
- [ ] 마우스 호버 시 구성원 미니 프로필 (이름, 직급, 프로필 사진)
- [ ] 클릭 시 상세 프로필 모달
- [ ] 부서별 색상 구분
- [ ] 반응형 (모바일에서 확대/축소 가능)

**Dependencies**: US-007

---

#### US-010: 신규 입사자 온보딩

**Description**: As a 매니저, I want 신규 입사자의 온보딩을 체크리스트로 관리하고 싶습니다.

**Acceptance Criteria**:
- [ ] 온보딩 체크리스트 템플릿 (계정 생성, 장비 지급, 보안교육 등)
- [ ] 입사자별 진행 상황 추적 (%)
- [ ] 담당자 배정
- [ ] 온보딩 완료 여부 추적
- [ ] 입사 첫날 자동 환영 알림

**Dependencies**: US-005, US-006

---

## 5. Module 2: Attendance Management (근태 관리)

### User Stories

#### US-011: 근무 정책 설정

**Description**: As a 관리자, I want 회사의 근무 정책을 설정하고 싶습니다.

**Acceptance Criteria**:
- [ ] 근무 유형 정의: 고정근무, 유연근무, 시차근무, 재택근무, 하이브리드
- [ ] 유형별 근무시간 설정 (예: 9시~18시, 10시~19시)
- [ ] 유연근무 범위 설정 (예: 코어타임 10시~16시)
- [ ] 주간 기본 근무시간 (기본 40시간)
- [ ] 점심시간 설정 (기본 12시~13시, 60분, 자동 제외)
- [ ] 정책 변경 이력 추적

**Dependencies**: US-003

---

#### US-012: 출퇴근 기록

**Description**: As a 구성원, I want 매일 출퇴근 시간을 버튼으로 기록하고 싶습니다.

**Acceptance Criteria**:
- [ ] 대시보드에 출근/퇴근 버튼 배치
- [ ] 출근 기록 시 현재 시간 자동 저장 (KST, Asia/Seoul)
- [ ] 퇴근 기록 시 현재 시간 자동 저장
- [ ] 기록 후 "출근 완료" / "퇴근 완료" 상태 표시
- [ ] 당일 기록 시간 실시간 표시 (출근 09:00, 현재 근무 X시간 Y분)
- [ ] 수정 불가 원칙 (매니저만 사유 기재 후 수정 가능)
- [ ] 출퇴근 기록 이력 조회 (일간/주간/월간)

**Dependencies**: US-004, US-011

---

#### US-013: 연차/휴가 정책 설정

**Description**: As a 매니저, I want 회사의 휴가 정책을 유형별로 설정하고 싶습니다.

**Acceptance Criteria**:
- [ ] 휴가 유형 정의: 연차, 반차(오전/오후), 병가, 생리휴가, 육아휴직, 특별휴가(경조사)
- [ ] 유형별 연간 허용 일수 설정
- [ ] 유형별 승인 규칙 (자동승인 또는 매니저 승인)
- [ ] 유형별 급여 지급 규칙 (유급/무급)
- [ ] 한국 근로기준법 기본값 자동 설정

**Dependencies**: US-003

---

#### US-014: 연차 자동 부여 (근로기준법 제60조)

**Description**: As a 시스템, I want 근로기준법에 따라 연차를 자동 부여하고 싶습니다.

**Acceptance Criteria**:
- [ ] 근로기준법 제60조 기준 연차 계산:
  - 입사 후 1년 미만: 월 1일씩 (최대 11일)
  - 1년 이상: 연 15일 (단, 직전 1년 출근율 80% 이상인 경우)
  - 3년 이상: 2년마다 1일 추가 (최대 25일)
- [ ] 부여 기준 선택: 입사일 기준 / 회계연도 기준
- [ ] 중도입사자 처리: 입사일~연말 기간 비례 계산 지원
- [ ] 80% 출근율 조건 검증 로직 (출근일수/소정근로일수)
- [ ] 자동 부여 실행 및 로그 기록
- [ ] 누적 현황: 부여/사용/잔여/소멸 추적
- [ ] 미사용 연차 소멸 처리 (연도 말 기준)
- [ ] 기존 연차 데이터 수동 입력 기능 (마이그레이션)
- [ ] 법적 면책 고지: "본 시스템의 연차 계산은 참고용이며, 정확한 계산은 매니저가 확인해야 합니다"

**MVP Scope Note (근로기준법 Edge Cases)**:
> 다음 항목은 MVP에서 **명시적으로 제외**합니다. 이유와 함께 Phase 2 로드맵에 포함합니다.
>
> | 제외 항목 | 이유 | Phase |
> |----------|------|-------|
> | 단시간 근로자(주 15시간 미만) 연차 제외 처리 | 대상 회사가 IT 스타트업(정규직 위주)이므로 MVP 대상 아님 | Phase 2 |
> | 단시간 근로자 비례 연차 계산 | 주 15~40시간 비례 계산 복잡성 | Phase 2 |
> | 연차사용촉진제도 (사용촉진 워크플로우) | 법정 사용촉진 절차(서면 통지 2회) 별도 모듈 필요 | Phase 2 |
> | 미사용 연차수당 자동 정산 | 급여정산 모듈 의존성 (Phase 2) | Phase 2 |
> | 수습기간 중 최저임금 90% 적용 | 급여정산 모듈 범위 | Phase 2 |
> | 80% 출근율 미달 시 자동 연차 미부여 | MVP에서는 매니저가 수동 조정. 자동화는 Phase 2 | Phase 2 |

**Dependencies**: US-013

---

#### US-015: 휴가 신청 및 승인

**Description**: As a 구성원, I want 휴가를 신청하고 승인 받고 싶습니다.

**Acceptance Criteria**:
- [ ] 휴가 신청 폼: 유형, 시작일, 종료일, 사유, 첨부파일
- [ ] 반차 지원 (오전반차, 오후반차)
- [ ] 잔여 연차 실시간 확인
- [ ] 중복 신청 방지 (이미 휴가인 날짜)
- [ ] 신청 시 매니저에게 알림
- [ ] 승인/반려 기능 (코멘트 포함)
- [ ] 승인 후 근무 캘린더에 자동 반영
- [ ] 신청 이력 추적

**Dependencies**: US-013, US-014

---

#### US-016: 주 52시간 초과근무 모니터링

**Description**: As a 시스템, I want 주간 근무시간을 자동 추적하여 52시간 초과를 경고하고 싶습니다.

**Acceptance Criteria**:
- [ ] 주 단위(월~일) 근무시간 자동 합산
- [ ] 기본 근무시간(40시간) + 연장근로(12시간) = 52시간 기준 적용
- [ ] 점심시간 자동 제외 계산
- [ ] 45시간 도달 시 사전 알림 (구성원)
- [ ] 48시간 도달 시 주의 알림 (구성원 + 매니저)
- [ ] 52시간 초과 시 경고 알림 (구성원 + 매니저 + 관리자)
- [ ] 주간 초과근무 현황 대시보드 (관리자용)
- [ ] 월간/연간 초과근무 추적
- [ ] 초과근무 기록 로깅
- [ ] 법적 면책 고지: 52시간 모니터링은 참고용이며, 법적 준수 여부는 매니저가 확인

**MVP Scope Note (52시간 Edge Cases)**:
> 다음 항목은 MVP에서 **명시적으로 제외**합니다.
>
> | 제외 항목 | 이유 | Phase |
> |----------|------|-------|
> | 회사 규모별 적용 차등 (5인 미만, 5~49인, 50인 이상) | MVP는 50인 이상 기준 단일 적용. 대상이 IT 스타트업(대부분 5인 이상)이므로 충분 | Phase 2 |
> | 선택적 근로시간제 (2주/3개월 단위 52시간 측정) | 유연근무제 측정 주기 변경은 복잡성 높음 | Phase 2 |
> | 탄력적 근로시간제 (3개월/6개월 단위 평균) | 유연근무제 유형별 별도 계산 로직 필요 | Phase 2 |
> | 야간근로(22시~06시) 별도 추적 및 가산 | 급여정산(150% 가산) 모듈과 연동 필요 | Phase 2 |
> | 휴일근로 가산 계산 (150%/200%) | 급여정산 모듈 범위 | Phase 2 |
> | 가산수당 중첩 계산 (야간+연장+휴일) | 급여정산 모듈 범위. 매우 복잡한 계산 로직 | Phase 2 |
> | 회사 규모 변경 시 자동 규칙 전환 | 드문 이벤트이므로 관리자 수동 설정으로 처리 | Phase 2 |

**Dependencies**: US-012

---

#### US-017: 근무 캘린더

**Description**: As a 구성원, I want 근무 일정을 캘린더로 보고 싶습니다.

**Acceptance Criteria**:
- [ ] 월간/주간 캘린더 뷰
- [ ] 색상 구분: 근무(파랑), 휴가(초록), 결근(빨강), 공휴일(회색)
- [ ] 한국 공휴일 자동 표시 (설날, 추석, 삼일절 등)
- [ ] 대체공휴일 반영
- [ ] 오늘 날짜 하이라이트
- [ ] 셀 클릭 시 상세 정보

**Dependencies**: US-012, US-015

---

#### US-018: 근태 대시보드

**Description**: As a 매니저, I want 팀 근태 현황을 한눈에 보고 싶습니다.

**Acceptance Criteria**:
- [ ] 개인 대시보드: 본인 출퇴근, 잔여 연차, 이번주 근무시간
- [ ] 팀 대시보드: 팀원 오늘 현황 (출근/미출근/휴가)
- [ ] 관리자 대시보드: 전사 현황, 초과근무 위험자
- [ ] 당일 출근 현황 실시간 갱신
- [ ] 필터: 부서별, 기간별

**Dependencies**: US-012, US-015, US-016

---

#### US-019: 근태 리포트

**Description**: As a 매니저, I want 근태 현황을 리포트로 생성하고 싶습니다.

**Acceptance Criteria**:
- [ ] 기간 선택: 월간, 분기, 연간
- [ ] 리포트 유형: 개인별, 팀별, 전사
- [ ] 포함 항목: 출근일수, 휴가일수, 초과근무시간, 결근
- [ ] PDF 생성 (깔끔한 한국어 서식)
- [ ] Excel 다운로드 (상세 데이터)
- [ ] 리포트 생성 이력 저장

**Dependencies**: US-018

---

## 6. Module 3: E-Contracts (전자계약서)

### User Stories

#### US-020: 계약서 템플릿 빌더

**Description**: As a 매니저, I want 자주 사용하는 계약서 템플릿을 만들고 싶습니다.

**Acceptance Criteria**:
- [ ] 리치 텍스트 에디터 (서식, 굵기, 정렬 지원)
- [ ] 변수 삽입: {{이름}}, {{직급}}, {{부서}}, {{입사일}}, {{연봉}} 등
- [ ] 사용 가능 변수 목록 사이드바
- [ ] 템플릿 저장 (이름, 설명, 카테고리)
- [ ] 기본 템플릿 제공: 근로계약서, 보안서약서, NDA
- [ ] 템플릿 수정/삭제/미리보기

**Dependencies**: US-001

---

#### US-021: 계약서 생성 및 발송

**Description**: As a 매니저, I want 템플릿에서 계약서를 생성하여 구성원에게 발송하고 싶습니다.

**Acceptance Criteria**:
- [ ] 템플릿 선택 -> 대상 구성원 선택
- [ ] 변수 자동 치환 (이름, 직급 등 구성원 정보)
- [ ] 추가 수정 가능
- [ ] 계약서 미리보기 (PDF 형식)
- [ ] 발송 (시스템 내 알림 + 이메일)
- [ ] 발송 이력 기록

**Dependencies**: US-020, US-005

---

#### US-022: 전자 서명

**Description**: As a 구성원, I want 계약서에 전자 서명하고 싶습니다.

**Acceptance Criteria**:
- [ ] 계약서 전문 조회 페이지
- [ ] 캔버스 기반 서명 입력 (마우스 + 터치 지원)
- [ ] 서명 지우기(Clear) 버튼
- [ ] 서명 이미지 저장 (PNG, Firebase Storage)
- [ ] 서명 시간 자동 기록 (KST)
- [ ] 감사 추적 기록: 서명 시각, IP 주소, User Agent, 문서 해시(SHA-256)
- [ ] 서명 완료 후 문서 불변성 보장 (서명 후 내용 수정 불가)
- [ ] 서명 완료 후 상태 변경 (대기 -> 완료)
- [ ] 서명 완료 시 양측에 알림
- [ ] 법적 고지 표시: "본 전자 서명은 간편 서명(전자서명법 제2조)이며, 공인인증 전자서명이 아닙니다. 법적 효력이 필요한 계약은 별도 확인이 필요합니다."

**MVP Scope Note (전자서명 법적 리스크)**:
> MVP의 전자 서명은 **간편 전자서명(전자서명법 제2조 제2호)** 수준입니다.
> 법적 동등성을 주장하지 않으며, 내부 편의 도구로 포지셔닝합니다.
>
> | 제외 항목 | 이유 | Phase |
> |----------|------|-------|
> | 공인인증 전자서명 연동 (OneSign, NiceCert 등) | 외부 인증 서비스 연동 비용 및 복잡성 | Phase 2 |
> | 본인인증 (휴대폰 인증, i-PIN) | 별도 인증 서비스 연동 필요 | Phase 2 |
> | 비대면 신원확인 (비대면 실명확인) | 금융 수준 인증 불필요 (사내 도구) | N/A |
>
> **위험 완화 조치 (MVP에 포함)**:
> - 서명 시 감사 추적(audit trail) 기록 필수
> - 서명 후 문서 해시 저장으로 무결성 검증 가능
> - UI에 법적 면책 고지 표시

**Dependencies**: US-021

---

#### US-023: 전자 직인 관리

**Description**: As a 관리자, I want 회사 직인을 등록하고 관리하고 싶습니다.

**Acceptance Criteria**:
- [ ] 직인 이미지 업로드 (PNG, JPG, 투명 배경 지원)
- [ ] 텍스트 기반 직인 생성 도구 (회사명 원형 직인)
- [ ] 직인 목록 관리 (회사직인, 대표직인)
- [ ] 직인 사용 권한 설정
- [ ] 직인 사용 이력 기록

**Dependencies**: US-001

---

#### US-024: 계약 이력 및 상태 추적

**Description**: As a 매니저, I want 모든 계약의 상태를 추적하고 싶습니다.

**Acceptance Criteria**:
- [ ] 계약 대시보드: 상태별 현황 (초안/발송/서명대기/완료/만료)
- [ ] 구성원별 계약 이력 타임라인
- [ ] 계약 문서 PDF 다운로드
- [ ] 계약 검색 (제목, 구성원명, 기간)
- [ ] 미서명 계약 알림 (발송 후 3일 경과 시)
- [ ] 계약 상태 변경 이력 로깅

**Dependencies**: US-022

---

## 7. Module 4: Workflows/E-Approval (전자결재)

### User Stories

#### US-025: 결재 양식 빌더

**Description**: As a 관리자, I want 결재 양식을 만들고 싶습니다.

**Acceptance Criteria**:
- [ ] 폼 빌더 UI (필드 추가/삭제/정렬)
- [ ] 필드 타입: 텍스트, 숫자, 드롭다운, 날짜, 체크박스, 파일업로드
- [ ] 필드 속성: 라벨, 필수 여부, 기본값, 플레이스홀더
- [ ] 양식 저장 (이름, 설명, 카테고리)
- [ ] 기본 양식 제공: 휴가신청서, 출장비정산, 구매요청, 업무보고
- [ ] 양식 미리보기/수정/삭제

**Dependencies**: US-001

---

#### US-026: 결재선 정의

**Description**: As a 관리자, I want 결재선을 설정하여 승인 흐름을 정의하고 싶습니다.

**Acceptance Criteria**:
- [ ] 결재선 생성 (이름, 설명)
- [ ] 결재자 선택: 특정 구성원 또는 역할 기반 (예: 직속 매니저)
- [ ] 결재 순서 설정: 순차 결재 (1 -> 2 -> 3)
- [ ] 결재 기한 설정 (기본 48시간)
- [ ] 결재자 위임 설정 (부재 시 대리 결재)
- [ ] 양식별 결재선 연동

**Dependencies**: US-025

---

#### US-027: 결재 문서 작성 및 제출

**Description**: As a 구성원, I want 결재 문서를 작성하여 제출하고 싶습니다.

**Acceptance Criteria**:
- [ ] 양식 선택 (카테고리별 표시)
- [ ] 양식 데이터 입력 (필드별 유효성 검사)
- [ ] 파일 첨부 (증빙 자료)
- [ ] 문서 미리보기
- [ ] 임시저장 기능
- [ ] 제출 시 결재선 첫 결재자에게 자동 전달
- [ ] 상태 변경: 작성중 -> 결재대기

**Dependencies**: US-025, US-026

---

#### US-028: 결재 처리 (승인/반려/보류)

**Description**: As a 결재자, I want 결재 요청을 처리하고 싶습니다.

**Acceptance Criteria**:
- [ ] 결재 대기함: 나에게 온 결재 목록
- [ ] 문서 상세 조회 (작성 내용, 첨부파일)
- [ ] 이전 결재자 의견 확인
- [ ] 승인 처리 (다음 결재자에게 자동 전달 또는 최종 완료)
- [ ] 반려 처리 (반려 사유 필수 입력, 신청자에게 알림)
- [ ] 보류 처리 (보류 사유, 보류 기한)
- [ ] 코멘트 입력
- [ ] 처리 시간 자동 기록

**Dependencies**: US-027

---

#### US-029: 결재 이력 및 문서 보관

**Description**: As a 관리자, I want 완료된 결재 문서를 보관하고 검색하고 싶습니다.

**Acceptance Criteria**:
- [ ] 결재 완료함 (승인/반려 완료 문서)
- [ ] 문서 검색 (제목, 작성자, 기간, 양식 유형)
- [ ] 결재 이력 상세 조회 (각 결재자 승인일시, 의견)
- [ ] 문서 PDF 다운로드
- [ ] 내가 작성한 문서 목록
- [ ] 내가 처리한 결재 목록

**Dependencies**: US-028

---

#### US-030: 결재 알림

**Description**: As a 결재자, I want 결재 요청이 오면 즉시 알림을 받고 싶습니다.

**Acceptance Criteria**:
- [ ] 인앱 알림 센터 (헤더의 알림 아이콘)
- [ ] 알림 유형: 결재요청, 결재완료, 반려, 보류
- [ ] 알림 클릭 시 해당 문서로 이동
- [ ] 읽음/읽지 않음 상태 관리
- [ ] 미읽 알림 배지 카운트
- [ ] 알림 삭제

**Dependencies**: US-028

---

## 8. Cross-Cutting Concerns

### CC-001: 인앱 알림 시스템

모든 모듈에서 공통으로 사용하는 알림 시스템:
- 결재 요청/처리 알림
- 휴가 신청/승인 알림
- 계약서 발송/서명 알림
- 52시간 초과 경고 알림
- 신규 입사자 환영 알림

### CC-002: 한국어 전용 UI

- 모든 텍스트 한국어
- 날짜 형식: YYYY년 MM월 DD일 (요일)
- 시간 형식: 오전/오후 HH시 MM분 또는 HH:MM
- 숫자 형식: 1,000 (천 단위 쉼표)
- 전화번호: 010-XXXX-XXXX
- 사업자번호: XXX-XX-XXXXX

### CC-003: 반응형 웹 레이아웃

| 화면 크기 | 너비 | 레이아웃 |
|----------|------|---------|
| Desktop | 1280px+ | 좌측 사이드바 고정 + 메인 컨텐츠 |
| Tablet | 768px~1279px | 사이드바 접힘 + 메인 컨텐츠 |
| Mobile | ~767px | 하단 네비게이션 또는 햄버거 메뉴 |

---

## 9. Non-Goals (MVP Phase)

MVP에서 명시적으로 제외되는 기능:

| 기능 | 이유 | 예정 Phase |
|------|------|-----------|
| 급여정산 (Payroll) | 복잡한 세무 규칙, 외부 시스템 연동 필요 | Phase 2 |
| 성과관리 (OKR/KPI) | 별도 복잡성 | Phase 2 |
| 비용관리 (Expense) | 결재와 별도 프로세스 | Phase 2 |
| 채용관리 (ATS) | 지원자 관리 별도 모듈 | Phase 2 |
| HR Analytics | 고급 분석, BI 대시보드 | Phase 2 |
| 외부 연동 (Slack, Calendar) | MVP 후 확장 | Phase 2 |
| 2FA 인증 | Google OAuth로 기본 보안 확보 | Phase 2 |
| 문서/증명서 발급 | 재직증명서, 경력증명서 | Phase 2 |
| 다국어 지원 | 한국어 전용 | Future |
| 멀티테넌시 | 단일 회사 전용 | N/A |
| 모바일 네이티브 앱 | 반응형 웹 대체 | 고려 중 |

---

## 10. Design System

### Technology

| 항목 | 설정값 |
|------|--------|
| **UI Framework** | shadcn/ui + Tailwind CSS |
| **Font** | Pretendard (fallback: Noto Sans KR) |
| **Primary Color** | Blue #2563EB |
| **Neutral** | Gray scale (50~950) |
| **Success** | #10B981 |
| **Warning** | #F59E0B |
| **Error** | #EF4444 |
| **Info** | #3B82F6 |

### Typography Scale

| 용도 | 크기 | Weight |
|------|------|--------|
| 페이지 제목 (H1) | 32px | 700 (Bold) |
| 섹션 제목 (H2) | 24px | 600 (SemiBold) |
| 소제목 (H3) | 20px | 600 |
| 본문 (Body) | 16px | 400 (Regular) |
| 라벨/버튼 | 14px | 500 (Medium) |
| 캡션 | 12px | 400 |

### Layout

- 좌측 사이드바(240px 고정, 접힘 시 64px) + 메인 컨텐츠 영역
- 헤더(64px): 페이지 제목 + 알림 + 프로필
- 메인: 최대 너비 1200px, 좌우 패딩 24px

### Component Patterns

- **테이블**: 정렬, 필터, 페이지네이션 (shadcn/ui DataTable)
- **폼**: Input, Select, DatePicker, Checkbox (shadcn/ui Form)
- **모달**: Dialog (확인/취소, X 닫기)
- **알림**: Toast (우하단), Banner (상단)
- **캘린더**: 월간/주간 뷰
- **트리뷰**: 조직도용 커스텀 컴포넌트

---

## 11. Technical Architecture

### Stack

| 계층 | 기술 |
|------|------|
| **Frontend** | Next.js 14+ (App Router), React 18 |
| **Language** | TypeScript 5+ |
| **State** | React Context + SWR (또는 TanStack Query) |
| **UI** | shadcn/ui + Tailwind CSS |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Auth (Google OAuth) |
| **Storage** | Firebase Storage |
| **Hosting** | Firebase Hosting |

### Key Technical Decisions

| 결정 사항 | 내용 |
|----------|------|
| Timezone | KST (Asia/Seoul) 고정 |
| 52시간 계산 | 월~일 기준, 매일 자정 주간 합산 체크 |
| 연차 계산 | 근로기준법 제60조 (입사일/회계연도 기준 선택) |
| 파일 업로드 | Firebase Storage, 최대 10MB |
| PDF 생성 | 클라이언트 사이드 (html2pdf 또는 jsPDF) |
| 실시간 업데이트 | Firestore onSnapshot (출퇴근, 알림) |

---

## 12. Data Model (Firestore Schema)

### Collection Structure

```
companies/{companyId}
  ├── name, representativeName, businessNumber, address, phone
  ├── workPolicy: { weeklyHours, workTypes[], lunchBreak }
  ├── leavePolicy: { ... }
  ├── setupCompleted: boolean
  │
  ├── departments/{deptId}
  │     └── name, headId, description, order
  │
  ├── teams/{teamId}
  │     └── name, leadId, departmentId, description
  │
  ├── members/{memberId}
  │     ├── name, email, phone, birthDate, joinDate
  │     ├── departmentId, teamId, positionId, rankId
  │     ├── role: 'admin' | 'manager' | 'employee'
  │     ├── status: 'active' | 'on_leave' | 'resigned'
  │     ├── profileImageUrl
  │     └── createdAt, updatedAt
  │
  ├── positions/{positionId}
  │     └── name, level, description
  │
  ├── ranks/{rankId}
  │     └── name, description
  │
  ├── attendance/{recordId}
  │     ├── memberId, date (YYYY-MM-DD)
  │     ├── checkInTime, checkOutTime (ISO 8601 with +09:00)
  │     ├── workMinutes, overtimeMinutes
  │     ├── status: 'present' | 'absent' | 'late' | 'leave' | 'half_leave'
  │     └── createdAt, updatedAt, modifiedBy
  │
  ├── leaves/{leaveId}
  │     ├── memberId, type, startDate, endDate
  │     ├── reason, attachmentUrl
  │     ├── status: 'pending' | 'approved' | 'rejected'
  │     ├── approverId, approvedAt, approverComment
  │     └── createdAt
  │
  ├── leaveBalances/{memberId}
  │     ├── year, totalGranted, used, remaining, expired
  │     └── history: [{ date, type, amount, reason }]
  │
  ├── contractTemplates/{templateId}
  │     ├── name, category, description
  │     ├── content (HTML/rich text with {{variables}})
  │     └── createdBy, createdAt, updatedAt
  │
  ├── contracts/{contractId}
  │     ├── templateId, recipientId, title, content
  │     ├── status: 'draft' | 'sent' | 'pending_sign' | 'signed' | 'expired'
  │     ├── sentAt, signedAt, expiresAt
  │     ├── signatureImageUrl, sealImageUrl
  │     └── createdBy, createdAt
  │
  ├── seals/{sealId}
  │     ├── name, type: 'company' | 'representative'
  │     ├── imageUrl, allowedRoles[]
  │     └── createdBy, createdAt
  │
  ├── approvalForms/{formId}
  │     ├── name, category, description
  │     ├── fields: [{ type, label, required, options }]
  │     ├── approvalLineId
  │     └── createdBy, createdAt
  │
  ├── approvalLines/{lineId}
  │     ├── name, description
  │     ├── steps: [{ order, approverId or role, deadline }]
  │     └── createdBy, createdAt
  │
  ├── approvalDocuments/{docId}
  │     ├── formId, submittedBy, title
  │     ├── data: { field values }, attachmentUrls[]
  │     ├── status: 'draft' | 'pending' | 'approved' | 'rejected' | 'on_hold'
  │     ├── currentStep, approvals: [{ approverId, decision, comment, timestamp }]
  │     └── submittedAt, completedAt, createdAt
  │
  └── notifications/{notificationId}
        ├── recipientId, type, title, message
        ├── link (대상 문서 경로)
        ├── read: boolean
        └── createdAt
```

### Firestore Security Rules (Core)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function getMember() { return get(/databases/$(database)/documents/companies/$(companyId)/members/$(request.auth.uid)); }
    function isAdmin() { return getMember().data.role == 'admin'; }
    function isManager() { return getMember().data.role in ['admin', 'manager']; }

    match /companies/{companyId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();

      match /members/{memberId} {
        allow read: if isAuthenticated();
        allow write: if isManager();
        allow update: if request.auth.uid == memberId
          && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['profileImageUrl', 'phone']);
      }

      match /attendance/{recordId} {
        allow read: if isAuthenticated();
        allow create: if request.auth.uid == request.resource.data.memberId;
        allow update: if isManager();
      }
    }
  }
}
```

---

## 13. Korean-Specific Requirements

### 근로기준법 (Labor Standards Act) Compliance

| 항목 | 법 조항 | 시스템 구현 |
|------|---------|-----------|
| **주 52시간 제한** | 근로기준법 제50조, 제53조 | 주 40시간 기본 + 연장 12시간, 실시간 모니터링 |
| **연차 자동 부여** | 근로기준법 제60조 | 입사일 기준 자동 계산 및 부여 |
| **생리휴가** | 근로기준법 제73조 | 월 1일 무급 생리휴가 (신청 시 승인 불요) |
| **육아휴직** | 남녀고용평등법 제19조 | 최대 1년, 상태 관리 |
| **연장근로 수당** | 근로기준법 제56조 | (Phase 2 급여정산에서 처리) |

### 한국 공휴일 (관공서의 공휴일에 관한 규정)

시스템에 기본 등록되는 공휴일:
- 1월 1일 (신정)
- 설날 (음력 1.1 전후 3일)
- 3월 1일 (삼일절)
- 5월 5일 (어린이날)
- 부처님 오신 날 (음력 4.8)
- 6월 6일 (현충일)
- 8월 15일 (광복절)
- 추석 (음력 8.15 전후 3일)
- 10월 3일 (개천절)
- 10월 9일 (한글날)
- 12월 25일 (크리스마스)
- 대체공휴일 자동 적용

### 한국 비즈니스 관행

- 직급 체계: 사원 -> 대리 -> 과장 -> 차장 -> 부장 -> 이사 -> 상무 -> 전무 -> 부사장 -> 사장
- IT 스타트업 직급: 인턴 -> 주니어 -> 시니어 -> 리드 -> 매니저 -> 디렉터 -> VP -> C-Level
- 호칭: 이름 + 님 (예: 김철수님)
- 사업자번호 형식: XXX-XX-XXXXX (10자리)

### Korean Labor Law Edge Cases: MVP vs Phase 2 Scope Decision

> **원칙**: MVP는 **정규직 풀타임 직원, 50인 이상 IT 스타트업** 기준으로 설계합니다.
> 복잡한 edge case는 명시적으로 Phase 2로 스코프 아웃하되, 데이터 모델은 확장 가능하게 설계합니다.
> 모든 법적 계산에는 "참고용" 면책 고지를 표시합니다.

#### MVP에 포함되는 근로기준법 항목

| 법 조항 | 구현 내용 | 비고 |
|---------|----------|------|
| **제60조 연차휴가** | 기본 연차 계산 (1년 미만 월 1일, 1년 이상 15일, 3년+ 가산) | 정규직 풀타임 기준 |
| **제60조 출근율 80%** | 출근율 계산 로직 포함, 미달 시 매니저에게 알림 | 자동 미부여가 아닌 매니저 수동 조정 |
| **제50조 주 40시간** | 기본 근무시간 40시간 설정 | 고정 |
| **제53조 연장근로 12시간** | 주 52시간(40+12) 초과 모니터링 | 주 단위 경고 |
| **제73조 생리휴가** | 월 1일 무급, 신청 시 승인 불요 | 자동 승인 처리 |
| **관공서 공휴일 규정** | 한국 공휴일 + 대체공휴일 | 연간 자동 업데이트 |

#### Phase 2로 명시적 제외 (근거 포함)

| 항목 | 법 조항 | 제외 이유 | 위험도 |
|------|---------|----------|--------|
| **단시간 근로자 (주 15시간 미만)** | 제18조 | IT 스타트업에서 드문 고용 형태. 연차/퇴직금 적용 제외 대상이라 별도 로직 필요 | LOW |
| **단시간 근로자 비례 연차** | 제18조, 제60조 | (주 근무시간/40) * 15일 비례 계산 + 반올림 규칙 불확실 | MEDIUM |
| **선택적 근로시간제** | 제52조 | 2주/1개월/3개월 정산 기간별 52시간 측정 주기 변경. 별도 계산 엔진 필요 | HIGH |
| **탄력적 근로시간제** | 제51조 | 3개월/6개월 단위 평균 근무시간 계산. 주별이 아닌 기간별 초과 판단 | HIGH |
| **연차사용촉진제도** | 제61조 | 법정 촉진 절차(서면 통지 2회 + 사용 계획 요구). 별도 워크플로우 모듈 | MEDIUM |
| **미사용 연차수당 자동 정산** | 제60조 제5항 | 급여정산 모듈 의존. 촉진제도 이행 여부에 따라 지급 의무 변동 | HIGH |
| **야간근로 가산수당** | 제56조 | 22시~06시 야간근로 50% 가산. 급여정산 모듈 범위 | MEDIUM |
| **휴일근로 가산수당** | 제56조 | 8시간 이내 150%, 초과 200%. 급여정산 모듈 범위 | MEDIUM |
| **가산수당 중첩 계산** | 제56조 | 야간+연장+휴일 중첩 시 최대 250%. 매우 복잡한 로직 | HIGH |
| **회사 규모별 적용 차등** | 부칙 | 5인 미만/5~49인/50인 이상 규칙 차이. MVP는 50인 이상 단일 적용 | LOW |
| **수습기간 임금 감액** | 제35조 | 3개월 수습 중 최저임금 90% 적용. 급여정산 범위 | LOW |

#### 데이터 모델 확장성 조치

Phase 2 기능을 위해 MVP 데이터 모델에 **미리 포함하는 필드**:

```
members/{memberId}:
  employmentType: 'full_time' | 'part_time' | 'contract'  // MVP는 full_time만 사용
  weeklyContractHours: 40  // MVP는 40 고정, Phase 2에서 단시간 근로자용
  probationEndDate: Date | null  // 수습기간 종료일
  companySize: number  // 회사 규모 (규칙 적용 기준)

attendance/{recordId}:
  isNightWork: boolean  // 야간근로 여부 (22시~06시)
  isHolidayWork: boolean  // 휴일근로 여부
  // Phase 2에서 가산수당 계산용

companies/{companyId}:
  workPolicy:
    flexibleWorkType: 'none' | 'selective' | 'flexible'  // MVP는 'none'만
    settlementPeriodWeeks: 1  // MVP는 1주 고정, Phase 2에서 2주/3개월 등
```

#### 법적 면책 고지 (MVP 필수 포함)

모든 법적 계산 관련 화면에 다음 문구를 표시:

> **참고**: 본 시스템의 근태/연차 계산은 참고 목적이며, 실제 법적 준수 여부는 매니저 및 노무사가 확인해야 합니다. 정확한 계산은 개별 근로계약 및 취업규칙에 따라 달라질 수 있습니다.

표시 위치:
- 연차 잔여 현황 페이지 하단
- 주 52시간 모니터링 대시보드 하단
- 근태 리포트 PDF 하단
- 전자 서명 페이지 상단

---

## 14. Success Metrics

### Quantitative

| 메트릭 | 목표 | 측정 도구 |
|--------|------|----------|
| 페이지 로드 | < 2초 | Lighthouse |
| Lighthouse Performance | 90+ | Lighthouse |
| Lighthouse Accessibility | 90+ | Lighthouse |
| Firestore 쿼리 지연 | < 100ms (P95) | Firebase Console |
| 에러율 | < 0.1% | Firebase Crashlytics |
| 시스템 가용성 | 99.5%+ | Firebase Monitoring |

### Qualitative

| 메트릭 | 목표 | 시점 |
|--------|------|------|
| 구성원 만족도 | 4.0/5.0+ | 도입 3개월 후 |
| HR 프로세스 디지털화 | 100% | 런칭 후 1개월 |
| 주 52시간 준수율 | 95%+ | 운영 중 |

---

## 15. Sprint Backlog

### Sprint Overview

| Sprint | 기간 | 핵심 목표 | 포함 모듈 |
|--------|------|----------|----------|
| **Sprint 1** | Week 1-2 | Foundation + Auth + Layout | 공통 인프라 |
| **Sprint 2** | Week 2-3 | Member/Org Management | Module 1 |
| **Sprint 3** | Week 3-4 | Attendance Basic | Module 2 (기본) |
| **Sprint 4** | Week 4-5 | Attendance Advanced + E-Contract | Module 2 (고급) + Module 3 |
| **Sprint 5** | Week 5-6 | Workflow/Approval + Polish | Module 4 + 통합 |

---

### Sprint 1: Foundation + Auth + Layout (Week 1-2)

**Goal**: 프로젝트 기반 구축, 인증, 핵심 레이아웃 완성

| Task ID | 태스크 | User Story | 담당 | 우선순위 |
|---------|--------|-----------|------|---------|
| S1-01 | Next.js 14 프로젝트 초기화 (App Router, TypeScript) | - | Infra | P0 |
| S1-02 | Firebase 프로젝트 생성 및 SDK 연동 | - | Infra | P0 |
| S1-03 | Tailwind CSS + shadcn/ui 설정 | - | Infra | P0 |
| S1-04 | Pretendard 웹폰트 설정 | - | Design | P0 |
| S1-05 | Firestore 초기 스키마 생성 (companies, members) | - | Backend | P0 |
| S1-06 | Firebase Auth Google OAuth 구현 | US-001 | Auth | P0 |
| S1-07 | 로그인 페이지 UI | US-001 | Frontend | P0 |
| S1-08 | RBAC 미들웨어 구현 (3역할) | US-002 | Auth | P0 |
| S1-09 | Firestore 보안 규칙 (기본) | US-002 | Backend | P0 |
| S1-10 | 403 접근 거부 페이지 | US-002 | Frontend | P1 |
| S1-11 | 좌측 사이드바 네비게이션 구현 | US-004 | Frontend | P0 |
| S1-12 | 헤더 컴포넌트 (제목, 프로필, 알림 아이콘) | US-004 | Frontend | P0 |
| S1-13 | 메인 레이아웃 (사이드바 + 헤더 + 컨텐츠) | US-004 | Frontend | P0 |
| S1-14 | 반응형 레이아웃 (모바일 햄버거 메뉴) | US-004 | Frontend | P1 |
| S1-15 | 대시보드 페이지 (기본 구조, 빈 위젯) | US-004 | Frontend | P1 |
| S1-16 | 유휴 시간 자동 로그아웃 (30분) | US-001 | Auth | P2 |

**Sprint 1 완료 기준**:
- Google OAuth 로그인/로그아웃 동작
- RBAC 기반 메뉴 표시/숨김 동작
- 사이드바 + 헤더 + 컨텐츠 레이아웃 완성
- 반응형 동작 (모바일/데스크톱)

---

### Sprint 2: Member/Org Management (Week 2-3)

**Goal**: 구성원 등록/조회, 부서/팀 관리, 조직도

| Task ID | 태스크 | User Story | 담당 | 우선순위 |
|---------|--------|-----------|------|---------|
| S2-01 | 회사 초기 설정 위저드 UI (4단계) | US-003 | Frontend | P0 |
| S2-02 | 위저드 데이터 저장 (Firestore) | US-003 | Backend | P0 |
| S2-03 | 구성원 등록 폼 (신규 등록) | US-005 | Frontend | P0 |
| S2-04 | 프로필 사진 업로드 (Firebase Storage) | US-005 | Backend | P0 |
| S2-05 | 구성원 상세 조회 페이지 | US-005 | Frontend | P0 |
| S2-06 | 구성원 목록 테이블 (검색/필터/정렬) | US-006 | Frontend | P0 |
| S2-07 | 구성원 CSV 다운로드 | US-006 | Frontend | P2 |
| S2-08 | 부서 CRUD UI + Firestore | US-007 | Full | P0 |
| S2-09 | 팀 CRUD UI + Firestore | US-007 | Full | P0 |
| S2-10 | 직급/직책 마스터 관리 | US-008 | Full | P1 |
| S2-11 | 조직도 트리 뷰 컴포넌트 | US-009 | Frontend | P1 |
| S2-12 | 신규 입사자 온보딩 체크리스트 | US-010 | Full | P2 |
| S2-13 | 구성원 일괄 초대 (이메일) | US-005 | Full | P2 |

**Sprint 2 완료 기준**:
- 구성원 CRUD 전체 동작
- 부서/팀 관리 동작
- 조직도 시각화 동작
- 검색/필터 동작

---

### Sprint 3: Attendance Basic (Week 3-4)

**Goal**: 출퇴근 기록, 휴가 정책, 휴가 신청/승인

| Task ID | 태스크 | User Story | 담당 | 우선순위 |
|---------|--------|-----------|------|---------|
| S3-01 | 근무 정책 설정 UI (근무유형, 시간) | US-011 | Full | P0 |
| S3-02 | 출퇴근 버튼 컴포넌트 (대시보드) | US-012 | Frontend | P0 |
| S3-03 | 출퇴근 기록 Firestore 저장 (KST) | US-012 | Backend | P0 |
| S3-04 | 근무시간 자동 계산 (점심시간 제외) | US-012 | Backend | P0 |
| S3-05 | 출퇴근 기록 이력 조회 | US-012 | Frontend | P0 |
| S3-06 | 연차/휴가 정책 설정 UI | US-013 | Full | P0 |
| S3-07 | 연차 자동 부여 로직 (근로기준법 60조) | US-014 | Backend | P0 |
| S3-08 | 잔여 연차 조회 | US-014 | Frontend | P0 |
| S3-09 | 휴가 신청 폼 (반차 포함) | US-015 | Frontend | P0 |
| S3-10 | 휴가 승인/반려 워크플로우 | US-015 | Full | P0 |
| S3-11 | 한국 공휴일 데이터 설정 | US-017 | Backend | P1 |

**Sprint 3 완료 기준**:
- 출퇴근 기록 동작 (KST 시간)
- 근무시간 자동 계산 동작
- 연차 자동 부여 동작 (근로기준법)
- 휴가 신청/승인 동작

---

### Sprint 4: Attendance Advanced + E-Contract (Week 4-5)

**Goal**: 52시간 모니터링, 근무 캘린더, 계약서 기본 기능

| Task ID | 태스크 | User Story | 담당 | 우선순위 |
|---------|--------|-----------|------|---------|
| S4-01 | 주 52시간 모니터링 로직 | US-016 | Backend | P0 |
| S4-02 | 초과근무 경고 알림 UI | US-016 | Frontend | P0 |
| S4-03 | 근무 캘린더 (월간/주간 뷰) | US-017 | Frontend | P1 |
| S4-04 | 근태 대시보드 (개인/팀/전사) | US-018 | Frontend | P1 |
| S4-05 | 근태 리포트 (PDF/Excel) | US-019 | Full | P2 |
| S4-06 | 계약서 템플릿 빌더 (리치 에디터) | US-020 | Frontend | P0 |
| S4-07 | 기본 계약서 템플릿 데이터 | US-020 | Backend | P0 |
| S4-08 | 계약서 생성 및 발송 | US-021 | Full | P0 |
| S4-09 | 캔버스 기반 전자 서명 | US-022 | Frontend | P0 |
| S4-10 | 서명 저장 및 계약 상태 변경 | US-022 | Backend | P0 |
| S4-11 | 전자 직인 관리 | US-023 | Full | P2 |
| S4-12 | 계약 이력 및 상태 추적 | US-024 | Full | P1 |

**Sprint 4 완료 기준**:
- 52시간 초과근무 경고 동작
- 근무 캘린더 표시 동작
- 계약서 생성/발송/서명 전체 플로우 동작

---

### Sprint 5: Workflow/Approval + Polish (Week 5-6)

**Goal**: 전자결재 전체 플로우, 통합 테스트, 마무리

| Task ID | 태스크 | User Story | 담당 | 우선순위 |
|---------|--------|-----------|------|---------|
| S5-01 | 결재 양식 빌더 UI | US-025 | Frontend | P0 |
| S5-02 | 기본 결재 양식 데이터 | US-025 | Backend | P0 |
| S5-03 | 결재선 정의 UI | US-026 | Full | P0 |
| S5-04 | 결재 문서 작성 및 제출 | US-027 | Full | P0 |
| S5-05 | 결재 처리 (승인/반려/보류) | US-028 | Full | P0 |
| S5-06 | 결재 이력 및 문서 보관 | US-029 | Full | P0 |
| S5-07 | 인앱 알림 센터 구현 | US-030 | Full | P0 |
| S5-08 | Firestore 보안 규칙 완성 | CC | Backend | P0 |
| S5-09 | 대시보드 위젯 연동 (출근, 결재, 휴가) | US-004 | Frontend | P1 |
| S5-10 | 전체 통합 테스트 | QA | QA | P0 |
| S5-11 | 성능 최적화 (Firestore 인덱싱) | - | Backend | P1 |
| S5-12 | Firebase Hosting 배포 설정 | - | Infra | P0 |
| S5-13 | 사용자 가이드 (기본) | - | Doc | P2 |

**Sprint 5 완료 기준**:
- 결재 전체 플로우 동작 (작성 -> 제출 -> 승인/반려)
- 알림 시스템 동작
- 전체 모듈 통합 동작
- 프로덕션 배포 준비 완료

---

## 16. Open Questions

### 기술 관련

1. **전자 서명 법적 효력**: 현재 "간편 서명"으로 법적 효력 미보장. 전자서명법 준수 수준 결정 필요.
2. **Firebase 비용**: Spark Plan(무료)으로 MVP 운영 가능 여부. 예상 DAU 기준 비용 산정 필요.
3. **기존 데이터 마이그레이션**: 현재 Excel/종이 데이터 범위 파악 및 마이그레이션 전략.
4. **근태 위치 검증**: GPS 기반 출근 인증 필요 여부 (사생활 이슈).

### 운영 관련

5. **알림 정책**: 초과근무 경고 빈도 (실시간 vs 일 1회), 알림 피로도 조절.
6. **결재 기한**: 기본 처리 기한 (24시간? 48시간?), 기한 초과 시 에스컬레이션.
7. **데이터 보관**: 결재 문서, 근태 기록 보관 기간 (법적 요구사항 확인).
8. **권한 세분화**: ~~Manager 역할 세분화 필요 여부 (팀장 vs 부서장).~~ **해결됨** -- 3-tier로 단순화 (Admin/Manager/Employee)

---

**Document End**

- 총 사용자 스토리: 30개 (US-001 ~ US-030)
- 총 스프린트: 5개 (6주)
- 총 태스크: 66개
- 핵심 모듈: 4개
