# Town (타운) HR - Task Breakdown

> Auto-generated task list derived from PRD.md, ARCHITECTURE.md, and gap analysis.
> Each task = 1 atomic PR. Ordered by dependency and priority.

## Status Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |

## Current State (Baseline)

- **Build**: Passing
- **Tests**: 325 passing
- **Routes**: 49 generated (was 24 at baseline)
- **Existing pages**: 49 implemented (`page.tsx` files)
- **All 35 tasks**: COMPLETE

### Already Implemented

| Route | Page | Status |
|-------|------|--------|
| `/` | Root redirect | Done |
| `/login` | Auth login | Done |
| `/dashboard` | Main dashboard (static) | Done (needs live data) |
| `/members` | Member list | Done |
| `/members/[id]` | Member detail | Done |
| `/members/new` | Member registration | Done |
| `/organization` | Org overview | Done |
| `/organization/chart` | Org chart | Done |
| `/attendance` | Attendance overview | Done |
| `/attendance/records` | Attendance records | Done |
| `/attendance/leave` | Leave management | Done |
| `/attendance/leave/request` | Leave request form | Done |
| `/contracts` | Contract list | Done |
| `/contracts/[id]` | Contract detail/sign | Done |
| `/contracts/new` | Contract creation | Done |
| `/contracts/templates` | Template management | Done |
| `/workflows` | Workflow inbox | Done |
| `/workflows/[id]` | Workflow detail | Done |
| `/workflows/new` | Document submission | Done |

### Missing Pages (from `menus.ts` gap analysis)

| Route | Menu Label | Assigned Task |
|-------|-----------|---------------|
| `/members/invite` | 일괄 초대 | TASK-008 |
| `/members/[id]/edit` | (from detail page) | TASK-007 |
| `/organization/departments` | 부서/팀 관리 | TASK-005 |
| `/organization/positions` | 직급/직책 관리 | TASK-006 |
| `/organization/roles` | 권한 관리 | TASK-009 |
| `/attendance/clock` | 출퇴근 | TASK-014 |
| `/attendance/calendar` | 근무 캘린더 | TASK-013 |
| `/attendance/overtime` | 초과근무 모니터링 | TASK-012 |
| `/attendance/reports` | 리포트 | TASK-015 |
| `/contracts/seals` | 직인 관리 | TASK-018 |
| `/contracts/history` | 계약 이력 | TASK-019 |
| `/workflows/submit` | 결재 신청 | TASK-022 |
| `/workflows/forms` | 양식 관리 | TASK-020 |
| `/workflows/policies` | 결재선 관리 | TASK-021 |
| `/workflows/archive` | 문서 보관함 | TASK-024 |
| `/notifications` | 알림 | TASK-028 |
| `/settings` | 일반 설정 | TASK-002 |
| `/settings/company` | 회사 정보 | TASK-002 |
| `/settings/work-policy` | 근무 정책 | TASK-003 |
| `/settings/leave-policy` | 휴가 정책 | TASK-004 |

---

## Phase A: Infrastructure & Settings (Blocking)

> These tasks must complete first. Other phases depend on company settings and policies.

---

### TASK-001: Company setup wizard (4-step onboarding)

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: L
- **PRD Reference**: US-003 (S2-01, S2-02)
- **Dependencies**: None

**Description**:
Build a 4-step onboarding wizard that new companies must complete before accessing the dashboard. Steps: 회사정보 (company info) → 근무정책 (work policy) → 조직구조 (org structure) → 초대 (invite members).

**Files to Create**:
- `src/app/(onboarding)/setup/page.tsx` — wizard container with step routing
- `src/app/(onboarding)/setup/layout.tsx` — minimal layout without sidebar
- `src/components/onboarding/step-company-info.tsx`
- `src/components/onboarding/step-work-policy.tsx`
- `src/components/onboarding/step-organization.tsx`
- `src/components/onboarding/step-invite.tsx`
- `src/components/onboarding/setup-progress.tsx` — step indicator

**Files to Modify**:
- `src/middleware.ts` — redirect to `/setup` if `company.setupCompleted === false`
- `src/contexts/company-context.tsx` — expose `setupCompleted` flag

**Types Used**: `Company`, `WorkPolicy`, `CompanyContext`

**Acceptance Criteria**:
- [ ] 4-step wizard with progress indicator
- [ ] Each step saves to Firestore independently (progress is preserved on refresh)
- [ ] Cannot access dashboard until all 4 steps complete
- [ ] Redirect from `/setup` to `/dashboard` after completion
- [ ] Back/Next navigation between steps
- [ ] Validation on each step before proceeding

---

### TASK-002: Settings - Company info page

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: M
- **PRD Reference**: US-003 (post-setup edit)
- **Dependencies**: TASK-001

**Description**:
Settings landing page and company info sub-page. Allows admins to edit company details after initial setup.

**Files to Create**:
- `src/app/(dashboard)/settings/page.tsx` — settings overview/redirect
- `src/app/(dashboard)/settings/company/page.tsx` — company info edit form
- `src/app/(dashboard)/settings/layout.tsx` — settings sub-navigation

**Types Used**: `Company`, `CompanyContext`

**Acceptance Criteria**:
- [ ] Edit company name, representative, business number, address, phone
- [ ] Logo upload with preview
- [ ] Allowed email domains management (add/remove)
- [ ] Form validation (business number format: XXX-XX-XXXXX)
- [ ] Success toast on save
- [ ] Admin-only access (role guard)

---

### TASK-003: Settings - Work policy page

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: M
- **PRD Reference**: US-011 (S3-01)
- **Dependencies**: TASK-002 (settings layout)

**Description**:
Configure company-wide work policy settings including work type, hours, breaks, and overtime thresholds.

**Files to Create**:
- `src/app/(dashboard)/settings/work-policy/page.tsx`

**Types Used**: `WorkPolicy`, `WorkType`, `Company`

**Acceptance Criteria**:
- [ ] Work type selection (fixed/flexible/staggered/remote/hybrid)
- [ ] Work start/end time pickers
- [ ] Flexible range setting (minutes) — shown only for `flexible` type
- [ ] Lunch break duration and start time
- [ ] Weekly hours limit (default: 52)
- [ ] Overtime alert threshold (default: 40)
- [ ] Week start day toggle (Monday/Sunday)
- [ ] Preview of effective schedule
- [ ] Save with confirmation dialog

---

### TASK-004: Settings - Leave policy page

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: L
- **PRD Reference**: US-013 (S3-06)
- **Dependencies**: TASK-002 (settings layout)

**Description**:
Manage leave types, annual leave rules, and approval policies. Includes Korean labor law defaults.

**Files to Create**:
- `src/app/(dashboard)/settings/leave-policy/page.tsx`
- `src/components/settings/leave-policy-form.tsx` — CRUD form for individual leave types

**Types Used**: `LeavePolicyConfig`, `LeavePolicy`, `LeaveType`

**Acceptance Criteria**:
- [ ] Leave types CRUD table (annual, sick, menstrual, parental, special)
- [ ] Per-type config: days, paid/unpaid, requires approval, auto-approve, min notice
- [ ] Annual leave base setting (hire date vs fiscal year)
- [ ] Fiscal year start date
- [ ] Probation months setting
- [ ] Korean labor law defaults pre-filled (연차 15일, 생리휴가, 출산휴가 etc.)
- [ ] Toggle individual leave types active/inactive
- [ ] Validation: annual days must be >= 15 for full-year employees

---

## Phase B: Member/Org Management Completion

> Depends on: Phase A (company settings must exist for department/position context)

---

### TASK-005: Organization - Department/Team management page

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: M
- **PRD Reference**: US-007 (S2-08, S2-09)
- **Dependencies**: TASK-001

**Description**:
Full CRUD for departments and their child teams. Supports 2-level hierarchy (department → team).

**Files to Create**:
- `src/app/(dashboard)/organization/departments/page.tsx`
- `src/components/organization/department-form-dialog.tsx`
- `src/components/organization/team-form-dialog.tsx`

**Files to Modify**:
- Wire to existing `src/lib/repositories/department-repository.ts`
- Wire to existing `src/hooks/use-departments.ts`

**Types Used**: `Department`, `Team`

**Acceptance Criteria**:
- [ ] Department list with expandable teams
- [ ] Add/Edit/Delete department (with confirmation)
- [ ] Add/Edit/Delete team under department
- [ ] Assign department head (member selector)
- [ ] Assign team lead (member selector)
- [ ] Drag-to-reorder departments and teams
- [ ] Cannot delete department with active members
- [ ] Admin-only access

---

### TASK-006: Organization - Position/Rank management page

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: S
- **PRD Reference**: US-008 (S2-10)
- **Dependencies**: TASK-001

**Description**:
Manage position/rank hierarchy with level ordering. Supports two categories: rank (직급) and job title (직책).

**Files to Create**:
- `src/app/(dashboard)/organization/positions/page.tsx`
- `src/components/organization/position-form-dialog.tsx`

**Types Used**: `Position`, `PositionCategory`

**Acceptance Criteria**:
- [ ] Two tabs: 직급 (rank) and 직책 (job title)
- [ ] CRUD for positions with level number
- [ ] Drag-to-reorder (updates `order` field)
- [ ] Level number must be unique within category
- [ ] Cannot delete position assigned to active members
- [ ] Admin-only access

---

### TASK-007: Member edit page

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: M
- **PRD Reference**: US-005 (member info update)
- **Dependencies**: TASK-005, TASK-006

**Description**:
Edit page for existing members. Pre-fills form with current data. Supports status changes and resignation processing.

**Files to Create**:
- `src/app/(dashboard)/members/[id]/edit/page.tsx`

**Files to Modify**:
- `src/app/(dashboard)/members/[id]/page.tsx` — add "Edit" button linking to edit page

**Types Used**: `Member`, `MemberRole`, `MemberStatus`, `Department`, `Team`, `Position`

**Acceptance Criteria**:
- [ ] Pre-filled form with all member fields
- [ ] Profile photo upload/change
- [ ] Department/Team/Position selectors (from TASK-005/006 data)
- [ ] Role change (admin only)
- [ ] Status change: active ↔ on_leave
- [ ] Resignation processing: set `resignDate`, status → `resigned`
- [ ] Resignation confirmation dialog with date picker
- [ ] Audit log entry on changes
- [ ] Admin/Manager access (managers can't change roles)

---

### TASK-008: Member bulk invite page

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: M
- **PRD Reference**: US-005 (S2-13)
- **Dependencies**: TASK-005

**Description**:
Bulk invite members via email. Supports batch creation with role assignment.

**Files to Create**:
- `src/app/(dashboard)/members/invite/page.tsx`
- `src/components/members/invite-form.tsx`

**Types Used**: `Member`, `MemberRole`

**Acceptance Criteria**:
- [ ] Email list input (comma-separated or one per line)
- [ ] Email domain validation against `company.allowedEmailDomains`
- [ ] Role assignment per invitee (default: employee)
- [ ] Department pre-assignment (optional)
- [ ] Batch creation via Firebase Auth + Firestore
- [ ] Progress indicator during batch processing
- [ ] Result summary (success/failed counts with details)
- [ ] Admin/Manager access

---

### TASK-009: Organization - Role/Permission management page

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: M
- **PRD Reference**: US-002 (S1-08 extension)
- **Dependencies**: TASK-001

**Description**:
View and manage the permission matrix for each role (admin/manager/employee).

**Files to Create**:
- `src/app/(dashboard)/organization/roles/page.tsx`
- `src/components/organization/permission-matrix.tsx`

**Files to Modify**:
- Wire to existing `src/lib/utils/permissions.ts` and `src/constants/roles.ts`

**Types Used**: `MemberRole`

**Acceptance Criteria**:
- [ ] Permission matrix table (rows: features, columns: roles)
- [ ] Toggle permissions per role/feature
- [ ] Change member role with audit log entry
- [ ] Preview of what each role can access
- [ ] Cannot remove last admin
- [ ] Admin-only access

---

### TASK-010: Onboarding checklist feature

- **Status**: `[x]`
- **Priority**: P2
- **Complexity**: M
- **PRD Reference**: US-010 (S2-12)
- **Dependencies**: TASK-007

**Description**:
Onboarding checklist system for new hires. Template-based with per-member tracking.

**Files to Create**:
- `src/components/members/onboarding-checklist.tsx`
- `src/lib/repositories/onboarding-repository.ts`
- `src/hooks/use-onboarding.ts`

**Files to Modify**:
- `src/app/(dashboard)/members/[id]/page.tsx` — embed checklist component

**Types Used**: `OnboardingChecklist`, `OnboardingChecklistItem`, `OnboardingPhase`

**Acceptance Criteria**:
- [ ] Default template checklist (day1/week1/month1/month3 phases)
- [ ] Auto-create checklist when new member is added
- [ ] Per-item completion toggle with timestamp and completer
- [ ] Completion percentage display
- [ ] Assignee field (HR person responsible)
- [ ] Phase-based grouping (Day 1, Week 1, Month 1, Month 3)
- [ ] Admin/Manager can customize template

---

## Phase C: Attendance Module Completion

> Depends on: Phase A (work policy), Phase B (member/dept data)

---

### TASK-011: Attendance - Team/company dashboard (admin/manager view)

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: M
- **PRD Reference**: US-018 (S4-04)
- **Dependencies**: TASK-005

**Description**:
Admin/manager view of today's attendance across all members. Real-time status board.

**Files to Create**:
- `src/app/(dashboard)/attendance/team/page.tsx`
- `src/components/attendance/team-attendance-table.tsx`

**Files to Modify**:
- `src/app/(dashboard)/attendance/page.tsx` — add tab/link to team view
- `src/constants/menus.ts` — add team attendance sub-menu if needed

**Types Used**: `AttendanceRecord`, `AttendanceStatus`, `Member`, `Department`

**Acceptance Criteria**:
- [ ] Today's attendance table (all members)
- [ ] Status badges: present/absent/on_leave/half_day/holiday
- [ ] Filter by department/team
- [ ] Search by member name
- [ ] Real-time update (Firestore onSnapshot or polling)
- [ ] Summary stats: total present, absent, on leave
- [ ] Admin/Manager access only

---

### TASK-012: Attendance - 52h overtime monitoring page

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: M
- **PRD Reference**: US-016 (S4-01, S4-02)
- **Dependencies**: TASK-003 (work policy for threshold)

**Description**:
Weekly overtime monitoring dashboard with 40h/48h/52h threshold alerts. Critical for Korean labor law compliance.

**Files to Create**:
- `src/app/(dashboard)/attendance/overtime/page.tsx`
- `src/components/attendance/overtime-progress-bar.tsx`
- `src/components/attendance/overtime-alert-list.tsx`

**Files to Modify**:
- Wire to existing `src/lib/utils/work-hours.ts`
- Wire to existing `/api/attendance/weekly-summary/route.ts`

**Types Used**: `AttendanceWeeklySummary`, `WorkPolicy`, `Member`

**Acceptance Criteria**:
- [ ] Weekly hours per member with progress bars
- [ ] Color-coded thresholds: green (<40h), yellow (40-48h), orange (48-52h), red (>52h)
- [ ] Alert list for members exceeding thresholds
- [ ] Week selector (current/previous weeks)
- [ ] Filter by department/team
- [ ] Sort by hours worked (descending)
- [ ] Legal disclaimer: "52시간 참고 모니터링용, 법적 효력 없음"
- [ ] Admin/Manager access

---

### TASK-013: Attendance - Work calendar page (monthly/weekly view)

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: M
- **PRD Reference**: US-017 (S4-03)
- **Dependencies**: TASK-003

**Description**:
Calendar view of attendance records with color-coding for different attendance types. Includes Korean public holidays.

**Files to Create**:
- `src/app/(dashboard)/attendance/calendar/page.tsx`
- `src/components/attendance/attendance-calendar.tsx`

**Files to Modify**:
- Wire to existing `src/lib/utils/korean-holidays.ts`

**Types Used**: `AttendanceRecord`, `AttendanceStatus`, `LeaveRequest`

**Acceptance Criteria**:
- [ ] Monthly calendar view (default)
- [ ] Weekly view toggle
- [ ] Color-coded days: work (blue), leave (green), holiday (red), absent (gray), half-day (yellow)
- [ ] Korean public holidays auto-marked (from `korean-holidays.ts`)
- [ ] Click day → view detail (check-in/out times, work hours)
- [ ] Personal view (employee) vs team view (manager/admin)
- [ ] Month/week navigation

---

### TASK-014: Attendance - Clock-in/out dedicated page

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: S
- **PRD Reference**: US-012
- **Dependencies**: None

**Description**:
Standalone clock-in/out page with large action button. Alternative to the dashboard widget.

**Files to Create**:
- `src/app/(dashboard)/attendance/clock/page.tsx`

**Files to Modify**:
- Wire to existing `src/hooks/use-attendance.ts` (`clockIn`/`clockOut`)

**Types Used**: `AttendanceRecord`

**Acceptance Criteria**:
- [ ] Large clock-in/clock-out button (state-dependent)
- [ ] Current time display (real-time updating)
- [ ] Today's record: check-in time, check-out time, work duration
- [ ] Weekly summary mini-table (this week's hours)
- [ ] Status indicator: "근무 중" / "퇴근" / "미출근"
- [ ] Responsive for mobile use

---

### TASK-015: Attendance - Reports page (PDF/Excel)

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: L
- **PRD Reference**: US-019 (S4-05)
- **Dependencies**: TASK-011, TASK-012

**Description**:
Generate attendance reports for individuals, teams, or the whole company. Export as PDF or Excel.

**Files to Create**:
- `src/app/(dashboard)/attendance/reports/page.tsx`
- `src/components/attendance/report-generator.tsx`
- `src/lib/utils/report-export.ts` — PDF/Excel generation utilities

**Types Used**: `AttendanceRecord`, `AttendanceWeeklySummary`, `Member`, `Department`

**Acceptance Criteria**:
- [ ] Period selection (date range picker)
- [ ] Report scope: individual / team / department / company
- [ ] Report types: daily summary, weekly summary, monthly summary
- [ ] Preview table before export
- [ ] PDF download (jsPDF or html2pdf)
- [ ] Excel download (xlsx)
- [ ] Include overtime hours and leave days
- [ ] Admin/Manager access

---

## Phase D: Contract Module Completion

> Depends on: Phase A (settings for seal management)

---

### TASK-016: Contract - E-signature touch support

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: S
- **PRD Reference**: US-022 (touch device support)
- **Dependencies**: None

**Description**:
Add touch event support to the signature canvas for mobile/tablet signing.

**Files to Modify**:
- `src/app/(dashboard)/contracts/[id]/page.tsx` — signature canvas component

**Acceptance Criteria**:
- [ ] Touch events: `onTouchStart`, `onTouchMove`, `onTouchEnd`
- [ ] Prevent page scroll while signing
- [ ] Mobile-friendly canvas size (responsive)
- [ ] Clear and redo buttons
- [ ] Same signature quality as mouse input
- [ ] Test on iOS Safari and Android Chrome

---

### TASK-017: Contract - Audit trail & document hash

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: M
- **PRD Reference**: US-022 (security features)
- **Dependencies**: None

**Description**:
Add cryptographic audit trail to signed contracts for legal validity.

**Files to Modify**:
- `src/lib/repositories/contract-repository.ts` — add hash generation on sign
- `src/app/(dashboard)/contracts/[id]/page.tsx` — display audit info

**Acceptance Criteria**:
- [ ] SHA-256 hash generated from contract content on signature
- [ ] Hash stored in Firestore with the contract document
- [ ] IP address and User-Agent logged at sign time
- [ ] Audit trail display on contract detail (timestamp, signer, hash)
- [ ] Legal disclaimer: "본 전자서명은 참고용이며, 법적 효력을 보장하지 않습니다"
- [ ] Hash verification button (re-compute and compare)

---

### TASK-018: Contract - Digital seal management page

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: M
- **PRD Reference**: US-023 (S4-11)
- **Dependencies**: TASK-002 (settings infrastructure)

**Description**:
Manage company seals (직인) for contract documents. Upload image or generate text-based seal.

**Files to Create**:
- `src/app/(dashboard)/contracts/seals/page.tsx`
- `src/components/contracts/seal-form-dialog.tsx`
- `src/components/contracts/text-seal-generator.tsx`

**Types Used**: `CompanySeal`, `SealType`, `MemberRole`

**Acceptance Criteria**:
- [ ] Seal list with preview images
- [ ] Upload seal image (PNG/SVG, max 1MB)
- [ ] Text-based seal generator (company name in circle/rectangle)
- [ ] Seal types: company (법인인감) / representative (대표이사인)
- [ ] Permission settings per seal (which roles can use)
- [ ] Usage log (which contracts used this seal)
- [ ] Activate/deactivate seals
- [ ] Admin access only

---

### TASK-019: Contract - History/archive page

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: M
- **PRD Reference**: US-024 (S4-12)
- **Dependencies**: None

**Description**:
Searchable archive of all contracts with status timeline.

**Files to Create**:
- `src/app/(dashboard)/contracts/history/page.tsx`
- `src/components/contracts/contract-timeline.tsx`

**Types Used**: `Contract`, `ContractStatus`, `ContractStatusChange`

**Acceptance Criteria**:
- [ ] All contracts list with status badges
- [ ] Search by title, member name, period
- [ ] Filter by status (draft/sent/pending/signed/expired/cancelled)
- [ ] Status timeline per contract (uses `statusHistory` field)
- [ ] Click to view contract detail
- [ ] PDF download for signed contracts
- [ ] Pagination (20 per page)

---

## Phase E: Workflow/Approval Module Completion

> Depends on: Phase B (member/dept data for approval lines)

---

### TASK-020: Workflow - Form builder page (admin)

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: L
- **PRD Reference**: US-025 (S5-01, S5-02)
- **Dependencies**: TASK-005

**Description**:
Drag-and-drop form builder for creating approval document templates.

**Files to Create**:
- `src/app/(dashboard)/workflows/forms/page.tsx`
- `src/components/workflows/form-builder.tsx`
- `src/components/workflows/form-field-config.tsx`
- `src/components/workflows/form-preview.tsx`
- `src/lib/repositories/workflow-form-repository.ts`

**Types Used**: `WorkflowForm`, `WorkflowFormField`, `FormFieldType`

**Acceptance Criteria**:
- [ ] Form list with create/edit/delete
- [ ] Drag-and-drop field builder
- [ ] Field types: text, number, date, select, checkbox, file, textarea
- [ ] Per-field config: label, required, placeholder, options, default value
- [ ] Live preview panel
- [ ] Category assignment (leave/expense/purchase/general)
- [ ] Version tracking on save
- [ ] Default forms pre-seeded (휴가신청서, 지출결의서, 구매요청서)
- [ ] Admin-only access

---

### TASK-021: Workflow - Approval line/policy management page

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: L
- **PRD Reference**: US-026 (S5-03)
- **Dependencies**: TASK-005, TASK-006

**Description**:
Configure approval chains with sequential/parallel routing and role-based approvers.

**Files to Create**:
- `src/app/(dashboard)/workflows/policies/page.tsx`
- `src/components/workflows/approval-chain-builder.tsx`
- `src/components/workflows/policy-step-config.tsx`
- `src/lib/repositories/workflow-policy-repository.ts`

**Types Used**: `WorkflowPolicy`, `WorkflowPolicyStep`, `WorkflowPolicyCondition`, `ApprovalType`, `ApproverType`

**Acceptance Criteria**:
- [ ] Policy list with create/edit/delete
- [ ] Visual approval chain builder (step cards connected by arrows)
- [ ] Sequential vs parallel approval type
- [ ] Approver types: specific person, role, department head, team lead
- [ ] Deadline hours per step
- [ ] Conditional steps (e.g., if amount > 100만원, add CFO approval)
- [ ] Link forms to policies (which forms use this policy)
- [ ] Admin-only access

---

### TASK-022: Workflow - Document submission page (enhanced)

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: M
- **PRD Reference**: US-027 (S5-04)
- **Dependencies**: TASK-020, TASK-021

**Description**:
Enhanced document submission with form selection, dynamic form rendering, and approval line preview. Note: menu route is `/workflows/submit`, existing page is at `/workflows/new`.

**Files to Create**:
- `src/app/(dashboard)/workflows/submit/page.tsx`

**Files to Modify**:
- `src/app/(dashboard)/workflows/new/page.tsx` — redirect to `/workflows/submit` or merge

**Types Used**: `WorkflowForm`, `WorkflowDocument`, `WorkflowPolicy`

**Acceptance Criteria**:
- [ ] Form selection step (choose from available forms)
- [ ] Dynamic form rendering based on selected form's fields
- [ ] File attachment support
- [ ] Approval line preview (who will approve, in what order)
- [ ] Submit with validation (all required fields filled)
- [ ] Draft save functionality
- [ ] Confirmation dialog before submission
- [ ] Redirect to submitted document detail after submit

---

### TASK-023: Workflow - Approval processing (approve/reject/hold)

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: M
- **PRD Reference**: US-028 (S5-05)
- **Dependencies**: TASK-022

**Description**:
Enhance workflow detail page with full approval processing capabilities.

**Files to Modify**:
- `src/app/(dashboard)/workflows/[id]/page.tsx` — add approval actions

**Files to Create**:
- `src/components/workflows/approval-timeline.tsx`
- `src/components/workflows/approval-action-panel.tsx`

**Types Used**: `WorkflowDocument`, `ApprovalRecord`, `ApprovalDecision`, `WorkflowStatus`

**Acceptance Criteria**:
- [ ] Approval timeline visualization (completed/current/pending steps)
- [ ] Approve button with optional comment
- [ ] Reject button with required comment
- [ ] Hold button with required comment
- [ ] Auto-forward to next approver on approve
- [ ] Status update: final approve → `approved`, any reject → `rejected`
- [ ] Notification trigger on action (leverages `workflow-state.ts` — 74 tests)
- [ ] Read-only view for non-approvers

---

### TASK-024: Workflow - Document archive page

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: S
- **PRD Reference**: US-029 (S5-06)
- **Dependencies**: TASK-023

**Description**:
Archive of completed (approved/rejected) workflow documents.

**Files to Create**:
- `src/app/(dashboard)/workflows/archive/page.tsx`

**Types Used**: `WorkflowDocument`, `WorkflowStatus`, `WorkflowForm`

**Acceptance Criteria**:
- [ ] List of completed documents (status: approved/rejected)
- [ ] Search by title, submitter name
- [ ] Filter by form type, status, period
- [ ] Click to view full detail (read-only)
- [ ] PDF download for approved documents
- [ ] Pagination (20 per page)

---

## Phase F: Dashboard & Notifications

> Depends on: Phase C (attendance data), Phase E (workflow data)

---

### TASK-025: Dashboard - Wire stat cards to live data

- **Status**: `[x]`
- **Priority**: P0
- **Complexity**: M
- **PRD Reference**: US-004 (S5-09)
- **Dependencies**: TASK-011, TASK-012

**Description**:
Replace static dashboard stat cards with real-time data from Firestore.

**Files to Modify**:
- `src/app/(dashboard)/dashboard/page.tsx`

**Types Used**: `Member`, `AttendanceRecord`, `WorkflowDocument`

**Acceptance Criteria**:
- [ ] Total active members count (live)
- [ ] Today's attendance: present / total ratio
- [ ] 52h warning count (members over threshold this week)
- [ ] Pending approvals count
- [ ] Loading skeletons while data fetches
- [ ] Error state handling
- [ ] Auto-refresh (polling or realtime listener)

---

### TASK-026: Dashboard - 52h monitoring widget

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: S
- **PRD Reference**: US-004 (S5-09)
- **Dependencies**: TASK-012

**Description**:
Dashboard widget showing top 5 members at risk of exceeding 52h weekly limit.

**Files to Modify**:
- `src/app/(dashboard)/dashboard/page.tsx`

**Files to Create**:
- `src/components/dashboard/overtime-widget.tsx`

**Types Used**: `AttendanceWeeklySummary`, `Member`

**Acceptance Criteria**:
- [ ] Top 5 overtime-risk members
- [ ] Progress bar per member (hours / 52h)
- [ ] Color coding: green/yellow/orange/red
- [ ] Click member name → navigate to overtime detail
- [ ] "View all" link to `/attendance/overtime`

---

### TASK-027: Dashboard - Recent approvals widget

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: S
- **PRD Reference**: US-004 (S5-09)
- **Dependencies**: TASK-023

**Description**:
Dashboard widget showing latest 5 pending approval documents with quick actions.

**Files to Modify**:
- `src/app/(dashboard)/dashboard/page.tsx`

**Files to Create**:
- `src/components/dashboard/approvals-widget.tsx`

**Types Used**: `WorkflowDocument`, `WorkflowForm`

**Acceptance Criteria**:
- [ ] Latest 5 pending approvals for current user
- [ ] Show: title, submitter, form type, submitted date
- [ ] Quick approve/reject buttons (with confirm dialog)
- [ ] Click title → navigate to workflow detail
- [ ] "View all" link to `/workflows`
- [ ] Empty state: "대기 중인 결재가 없습니다"

---

### TASK-028: Notifications - Full page notification center

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: M
- **PRD Reference**: US-030 (S5-07)
- **Dependencies**: TASK-023 (workflow notifications)

**Description**:
Full notification center page. Lists all notifications with read/unread management and click-to-navigate.

**Files to Create**:
- `src/app/(dashboard)/notifications/page.tsx`
- `src/lib/repositories/notification-repository.ts`
- `src/hooks/use-notifications.ts`

**Types Used**: `Notification`, `NotificationType`

**Acceptance Criteria**:
- [ ] All notifications list (newest first)
- [ ] Read/unread visual distinction
- [ ] Filter: all / unread only
- [ ] Click notification → navigate to related page (`link` field)
- [ ] Mark individual as read
- [ ] Mark all as read button
- [ ] Delete individual notification
- [ ] Notification type icons (approval, leave, contract, overtime, system)
- [ ] Pagination or infinite scroll
- [ ] Empty state: "새로운 알림이 없습니다"

---

## Phase G: Auth & Security Hardening

> Can run in parallel with Phases C-F

---

### TASK-029: Idle auto-logout (30min timeout)

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: S
- **PRD Reference**: US-001 (S1-16)
- **Dependencies**: None

**Description**:
Auto-logout after 30 minutes of inactivity with a warning popup at 25 minutes.

**Files to Modify**:
- `src/contexts/auth-context.tsx`

**Files to Create**:
- `src/components/auth/idle-timeout-dialog.tsx`

**Acceptance Criteria**:
- [ ] Track mouse, keyboard, and touch events for activity
- [ ] 25-minute warning dialog: "5분 후 자동 로그아웃됩니다"
- [ ] "Stay logged in" button resets timer
- [ ] 30-minute auto-logout with redirect to `/login`
- [ ] Timer resets on any user interaction
- [ ] Clean up auth state on timeout logout

---

### TASK-030: 403 Forbidden page (Korean)

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: S
- **PRD Reference**: US-002 (S1-10)
- **Dependencies**: None

**Description**:
Korean-language 403 forbidden page for unauthorized access attempts.

**Files to Create**:
- `src/app/forbidden/page.tsx`

**Files to Modify**:
- `src/middleware.ts` — redirect to `/forbidden` on role mismatch

**Acceptance Criteria**:
- [ ] Lock icon (lucide-react)
- [ ] "접근 권한이 없습니다" heading
- [ ] "이 페이지에 접근할 권한이 부족합니다. 관리자에게 문의하세요." description
- [ ] "홈으로 돌아가기" button → `/dashboard`
- [ ] Middleware catches role-protected routes and redirects
- [ ] Korean typography and styling consistent with design system

---

### TASK-031: Firestore security rules file

- **Status**: `[x]`
- **Priority**: P1
- **Complexity**: M
- **PRD Reference**: CC (S5-08)
- **Dependencies**: None

**Description**:
Firestore security rules for production deployment. Role-based access per collection.

**Files to Create**:
- `town-hr/firestore.rules`

**Acceptance Criteria**:
- [ ] `company/settings`: admin write, all authenticated read
- [ ] `members`: admin full, manager read, employee self-read
- [ ] `departments`, `teams`, `positions`: admin write, all read
- [ ] `attendance`: admin/manager write, employee self-read/write
- [ ] `leave_requests`: admin/manager approve, employee self-create
- [ ] `contracts`: admin/manager create, recipient can sign own
- [ ] `workflow_documents`: submitter create, approver update own step
- [ ] `notifications`: recipient read/delete, system create
- [ ] `audit_logs`: admin read only, system create only
- [ ] Deploy-ready format (`firebase deploy --only firestore:rules`)

---

## Phase H: Deployment & Polish

> Final phase. All features should be complete.

---

### TASK-032: Firebase Hosting deployment configuration

- **Status**: `[x]`
- **Priority**: P2
- **Complexity**: M
- **PRD Reference**: Sprint 5 (S5-12)
- **Dependencies**: TASK-031

**Description**:
Configure Firebase Hosting for Next.js deployment with GitHub Actions CI/CD.

**Files to Create**:
- `town-hr/firebase.json`
- `town-hr/.firebaserc`
- `.github/workflows/deploy.yml`

**Acceptance Criteria**:
- [ ] `firebase deploy` works with Next.js SSR
- [ ] Preview URLs generated for PRs (Firebase Hosting channels)
- [ ] Production deploy on merge to `main`
- [ ] Environment variables configuration
- [ ] Build + test step before deploy

---

### TASK-033: Pretendard font verification & globals.css

- **Status**: `[x]`
- **Priority**: P2
- **Complexity**: S
- **PRD Reference**: S1-04
- **Dependencies**: None

**Description**:
Verify Pretendard Variable font is properly loaded with Korean-optimized CSS.

**Files to Modify**:
- `src/app/globals.css`
- `src/app/layout.tsx`

**Acceptance Criteria**:
- [ ] Pretendard Variable font loaded (CDN or local)
- [ ] Fallback chain: `Pretendard Variable, Pretendard, -apple-system, system-ui, sans-serif`
- [ ] `word-break: keep-all` for Korean text
- [ ] `line-height` optimized for Korean (1.6-1.8)
- [ ] Font weight range: 100-900 available
- [ ] No FOUT (Flash of Unstyled Text)

---

### TASK-034: Legal disclaimer banners

- **Status**: `[x]`
- **Priority**: P2
- **Complexity**: S
- **PRD Reference**: CC (Korean labor law disclaimers, PRD Section 13)
- **Dependencies**: TASK-012, TASK-015, TASK-017

**Description**:
Add legally required disclaimer banners to relevant pages.

**Files to Create**:
- `src/components/common/legal-disclaimer.tsx`

**Files to Modify**:
- Attendance leave balance page — add disclaimer
- 52h overtime monitoring page — add disclaimer
- Attendance reports page — add disclaimer
- Contract signature page — add disclaimer

**Acceptance Criteria**:
- [ ] Reusable `<LegalDisclaimer>` component with variant prop
- [ ] Variants: `attendance`, `overtime`, `contract`, `leave`
- [ ] Korean text per PRD Section 13 (e.g., "본 시스템은 참고용이며...")
- [ ] Yellow/amber info banner style
- [ ] Dismissible but re-shows on page reload
- [ ] Placed prominently but not blocking interaction

---

### TASK-035: Performance optimization - Firestore indexes

- **Status**: `[x]`
- **Priority**: P2
- **Complexity**: S
- **PRD Reference**: S5-11
- **Dependencies**: None

**Description**:
Create composite Firestore indexes for common query patterns.

**Files to Create**:
- `town-hr/firestore.indexes.json`

**Acceptance Criteria**:
- [ ] Members: `(status, departmentId)`, `(status, role)`
- [ ] Attendance: `(memberId, date)`, `(date, status)`
- [ ] Weekly summary: `(memberId, weekStartDate)`, `(isOverLimit, weekStartDate)`
- [ ] Leave requests: `(memberId, status)`, `(status, createdAt)`
- [ ] Contracts: `(recipientId, status)`, `(status, createdAt)`
- [ ] Workflow documents: `(submittedBy, status)`, `(status, currentStepOrder)`
- [ ] Notifications: `(recipientId, isRead, createdAt)`
- [ ] Deploy-ready: `firebase deploy --only firestore:indexes`

---

## Verification Checklist

### PRD User Story Coverage

| User Story | Task(s) | Covered |
|------------|---------|---------|
| US-001 Auth/Login | Existing + TASK-029 | Yes |
| US-002 Role-based Access | TASK-009, TASK-030 | Yes |
| US-003 Company Setup | TASK-001, TASK-002 | Yes |
| US-004 Dashboard | TASK-025, TASK-026, TASK-027 | Yes |
| US-005 Member Management | TASK-007, TASK-008 | Yes |
| US-006 Member Detail | Existing `/members/[id]` | Yes |
| US-007 Department/Team | TASK-005 | Yes |
| US-008 Position/Rank | TASK-006 | Yes |
| US-009 Org Chart | Existing `/organization/chart` | Yes |
| US-010 Onboarding | TASK-010 | Yes |
| US-011 Work Policy | TASK-003 | Yes |
| US-012 Clock In/Out | TASK-014 | Yes |
| US-013 Leave Policy | TASK-004 | Yes |
| US-014 Leave Request | Existing `/attendance/leave` | Yes |
| US-015 Leave Approval | Existing + TASK-023 | Yes |
| US-016 Overtime Monitor | TASK-012 | Yes |
| US-017 Work Calendar | TASK-013 | Yes |
| US-018 Attendance Dashboard | TASK-011 | Yes |
| US-019 Attendance Reports | TASK-015 | Yes |
| US-020 Contract Template | Existing `/contracts/templates` | Yes |
| US-021 Contract Creation | Existing `/contracts/new` | Yes |
| US-022 E-Signature | TASK-016, TASK-017 | Yes |
| US-023 Company Seal | TASK-018 | Yes |
| US-024 Contract History | TASK-019 | Yes |
| US-025 Form Builder | TASK-020 | Yes |
| US-026 Approval Policy | TASK-021 | Yes |
| US-027 Document Submit | TASK-022 | Yes |
| US-028 Approval Process | TASK-023 | Yes |
| US-029 Document Archive | TASK-024 | Yes |
| US-030 Notifications | TASK-028 | Yes |

**Result: 30/30 user stories covered.**

### Menu Route Coverage

| Menu Route | Task | Covered |
|------------|------|---------|
| `/dashboard` | Existing + TASK-025/026/027 | Yes |
| `/members` | Existing | Yes |
| `/members/new` | Existing | Yes |
| `/members/invite` | TASK-008 | Yes |
| `/organization` | Existing | Yes |
| `/organization/departments` | TASK-005 | Yes |
| `/organization/positions` | TASK-006 | Yes |
| `/organization/roles` | TASK-009 | Yes |
| `/attendance` | Existing | Yes |
| `/attendance/clock` | TASK-014 | Yes |
| `/attendance/calendar` | TASK-013 | Yes |
| `/attendance/leave` | Existing | Yes |
| `/attendance/overtime` | TASK-012 | Yes |
| `/attendance/reports` | TASK-015 | Yes |
| `/contracts` | Existing | Yes |
| `/contracts/templates` | Existing | Yes |
| `/contracts/new` | Existing | Yes |
| `/contracts/seals` | TASK-018 | Yes |
| `/contracts/history` | TASK-019 | Yes |
| `/workflows` | Existing | Yes |
| `/workflows/submit` | TASK-022 | Yes |
| `/workflows/forms` | TASK-020 | Yes |
| `/workflows/policies` | TASK-021 | Yes |
| `/workflows/archive` | TASK-024 | Yes |
| `/notifications` | TASK-028 | Yes |
| `/settings` | TASK-002 | Yes |
| `/settings/company` | TASK-002 | Yes |
| `/settings/work-policy` | TASK-003 | Yes |
| `/settings/leave-policy` | TASK-004 | Yes |

**Result: 29/29 menu routes covered (all existing + all missing).**

---

## Dependency Graph

```
TASK-001 (Setup Wizard)
├── TASK-002 (Company Settings) → TASK-018 (Seals)
│   ├── TASK-003 (Work Policy) → TASK-012 (Overtime), TASK-013 (Calendar)
│   └── TASK-004 (Leave Policy)
├── TASK-005 (Departments) → TASK-007 (Member Edit), TASK-008 (Bulk Invite)
│   │                       → TASK-011 (Team Attendance)
│   │                       → TASK-020 (Form Builder), TASK-021 (Approval Policy)
│   └── TASK-006 (Positions) → TASK-007 (Member Edit)
│                             → TASK-021 (Approval Policy)
└── TASK-009 (Roles)

TASK-007 (Member Edit) → TASK-010 (Onboarding)

TASK-011 (Team Attendance) → TASK-015 (Reports)
TASK-012 (Overtime) → TASK-015 (Reports), TASK-025 (Dashboard Stats), TASK-026 (OT Widget)

TASK-020 (Form Builder) → TASK-022 (Submit) → TASK-023 (Approval) → TASK-024 (Archive)
TASK-021 (Approval Policy) → TASK-022 (Submit)                    → TASK-027 (Approvals Widget)

TASK-023 (Approval) → TASK-028 (Notifications)

Independent (no blockers):
- TASK-014 (Clock), TASK-016 (Touch), TASK-017 (Audit)
- TASK-019 (Contract History)
- TASK-029 (Idle Logout), TASK-030 (403 Page), TASK-031 (Firestore Rules)
- TASK-033 (Font), TASK-035 (Indexes)

TASK-032 (Deploy) → TASK-031 (Firestore Rules)
TASK-034 (Disclaimers) → TASK-012, TASK-015, TASK-017
```

---

## Priority Summary

| Priority | Count | Tasks |
|----------|-------|-------|
| P0 (Must) | 12 | 001-005, 007, 011-012, 020-023, 025 |
| P1 (Should) | 16 | 006, 008-009, 013-019, 024, 026-031 |
| P2 (Nice) | 7 | 010, 032-035 |

## Complexity Summary

| Size | Count | Tasks |
|------|-------|-------|
| S (< 200 lines) | 10 | 006, 014, 016, 024, 026, 027, 029, 030, 033, 035 |
| M (200-500 lines) | 17 | 002, 003, 005, 007-009, 011-013, 015, 017-019, 022, 023, 025, 028, 031, 032 |
| L (> 500 lines) | 5 | 001, 004, 010, 020, 021 |

**Total: 35 tasks across 8 phases.**
