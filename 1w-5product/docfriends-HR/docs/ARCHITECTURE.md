# Town (타운) - Architecture Document

**Version**: 1.1
**Last Updated**: February 26, 2026
**Author**: Architect
**Status**: MVP Phase
**Revision Note**: v1.1 adds Section 12 (Architect Response to Devil's Advocate Review)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Next.js 14+ App Router Structure](#2-nextjs-14-app-router-structure)
3. [Firestore Schema Design](#3-firestore-schema-design)
4. [TypeScript Data Models](#4-typescript-data-models)
5. [Firebase Auth Flow](#5-firebase-auth-flow)
6. [Firebase Storage Structure](#6-firebase-storage-structure)
7. [Firestore Security Rules](#7-firestore-security-rules)
8. [API Route Design](#8-api-route-design)
9. [State Management Strategy](#9-state-management-strategy)
10. [Composite Indexes](#10-composite-indexes)
11. [Architecture Risks and Decisions](#11-architecture-risks-and-decisions)
12. [Architect Response to Devil's Advocate Review](#12-architect-response-to-devils-advocate-review)

---

## 1. Architecture Overview

### System Context

```
+-----------+       +------------------+       +-------------------+
|  Browser  | <---> |  Next.js 14+     | <---> |  Firebase         |
|  (React)  |       |  App Router      |       |  - Firestore      |
|           |       |  - SSR/RSC       |       |  - Auth           |
|           |       |  - Route Handlers|       |  - Storage        |
|           |       |  - Middleware     |       |  - Hosting        |
+-----------+       +------------------+       +-------------------+
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | Server Components + Client Components | RSC for data fetching, Client for interactivity |
| Database | Firestore (NoSQL) | Firebase ecosystem, real-time sync, serverless |
| Auth | Firebase Auth (Google OAuth) | Single sign-on, managed auth, simple integration |
| Hosting | Firebase Hosting | CDN, SSL, preview channels, tight Firebase integration |
| State | React Context + SWR | Context for auth/global state, SWR for server cache |
| UI | shadcn/ui + Tailwind CSS | Accessible components, utility-first CSS, Korean font support |
| Single Tenant | One company per deployment | Simplifies security rules, no tenant isolation needed |

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14+ |
| UI Library | React | 18 |
| Language | TypeScript | 5+ |
| Components | shadcn/ui | Latest |
| Styling | Tailwind CSS | 3+ |
| Database | Firebase Firestore | v10 |
| Auth | Firebase Auth | v10 |
| Storage | Firebase Storage | v10 |
| Hosting | Firebase Hosting | Latest |
| Font | Pretendard Variable | Latest |

---

## 2. Next.js 14+ App Router Structure

### Directory Layout

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (Providers, Pretendard font)
│   ├── page.tsx                      # Redirect to /dashboard or /login
│   ├── not-found.tsx                 # 404 page (Korean)
│   ├── error.tsx                     # Global error boundary
│   ├── globals.css                   # Tailwind + Pretendard imports
│   │
│   ├── (auth)/                       # Auth route group (no sidebar layout)
│   │   ├── layout.tsx                # Centered card layout
│   │   ├── login/
│   │   │   └── page.tsx              # Google OAuth login
│   │   └── setup/
│   │       └── page.tsx              # Company onboarding wizard (US-003)
│   │
│   ├── (dashboard)/                  # Main app route group (sidebar layout)
│   │   ├── layout.tsx                # Sidebar + Header + Main content
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Main dashboard (US-004)
│   │   │
│   │   ├── members/                  # 구성원/조직 관리
│   │   │   ├── page.tsx              # Member list (US-006)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # Member detail (US-005)
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # Add member
│   │   │   └── invite/
│   │   │       └── page.tsx          # Bulk invite
│   │   │
│   │   ├── organization/             # 조직 관리
│   │   │   ├── page.tsx              # Org chart tree view (US-009)
│   │   │   ├── departments/
│   │   │   │   └── page.tsx          # Department/Team CRUD (US-007)
│   │   │   ├── positions/
│   │   │   │   └── page.tsx          # Position/Title management (US-008)
│   │   │   └── roles/
│   │   │       └── page.tsx          # RBAC matrix (US-010)
│   │   │
│   │   ├── attendance/               # 근태 관리
│   │   │   ├── page.tsx              # Attendance dashboard (US-019)
│   │   │   ├── clock/
│   │   │   │   └── page.tsx          # Clock in/out (US-013)
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx          # Work calendar (US-014)
│   │   │   ├── leave/
│   │   │   │   ├── page.tsx          # Leave list / apply (US-017)
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Leave detail
│   │   │   ├── overtime/
│   │   │   │   └── page.tsx          # 52-hour monitoring (US-018)
│   │   │   └── reports/
│   │   │       └── page.tsx          # Reports (US-020)
│   │   │
│   │   ├── contracts/                # 전자계약서
│   │   │   ├── page.tsx              # Contract dashboard (US-026)
│   │   │   ├── templates/
│   │   │   │   ├── page.tsx          # Template list
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx      # Template editor (US-021)
│   │   │   │   └── new/
│   │   │   │       └── page.tsx      # New template
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # Contract detail + sign (US-023)
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # Create & send contract (US-022)
│   │   │   ├── seals/
│   │   │   │   └── page.tsx          # Company seal management (US-024)
│   │   │   └── history/
│   │   │       └── page.tsx          # Contract history (US-025)
│   │   │
│   │   ├── workflows/                # 워크플로우/전자결재
│   │   │   ├── page.tsx              # My approval inbox (US-030)
│   │   │   ├── forms/
│   │   │   │   ├── page.tsx          # Form template list
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx      # Form builder (US-027)
│   │   │   │   └── new/
│   │   │   │       └── page.tsx      # New form
│   │   │   ├── policies/
│   │   │   │   └── page.tsx          # Approval chain policies (US-028)
│   │   │   ├── submit/
│   │   │   │   └── page.tsx          # Submit new document (US-029)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # Document detail + approve (US-030)
│   │   │   ├── archive/
│   │   │   │   └── page.tsx          # Archived documents (US-031)
│   │   │   └── delegations/
│   │   │       └── page.tsx          # Delegation settings
│   │   │
│   │   ├── notifications/
│   │   │   └── page.tsx              # Notification center (US-032)
│   │   │
│   │   └── settings/                 # 설정
│   │       ├── page.tsx              # General settings
│   │       ├── company/
│   │       │   └── page.tsx          # Company info
│   │       ├── work-policy/
│   │       │   └── page.tsx          # Work schedule policy (US-012)
│   │       └── leave-policy/
│   │           └── page.tsx          # Leave policy (US-015)
│   │
│   └── api/                          # Route Handlers
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts          # (Reserved, not needed with Firebase client Auth)
│       ├── members/
│       │   └── route.ts              # Server-side member operations
│       ├── attendance/
│       │   ├── clock/
│       │   │   └── route.ts          # Clock in/out (server timestamp)
│       │   └── weekly-hours/
│       │       └── route.ts          # 52-hour calculation
│       ├── contracts/
│       │   ├── send/
│       │   │   └── route.ts          # Send contract (email trigger)
│       │   └── sign/
│       │       └── route.ts          # Process signature
│       ├── workflows/
│       │   ├── submit/
│       │   │   └── route.ts          # Submit for approval
│       │   └── process/
│       │       └── route.ts          # Approve/reject/hold
│       ├── reports/
│       │   └── route.ts              # Generate PDF/Excel
│       ├── leave/
│       │   ├── apply/
│       │   │   └── route.ts          # Apply for leave
│       │   └── auto-grant/
│       │       └── route.ts          # Annual leave auto-grant (cron)
│       └── notifications/
│           └── route.ts              # Send notifications
│
├── components/
│   ├── ui/                           # shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── data-table.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── sidebar.tsx
│   │   ├── calendar.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── app-sidebar.tsx           # Main sidebar navigation
│   │   ├── app-header.tsx            # Top header bar
│   │   ├── user-menu.tsx             # User profile dropdown
│   │   └── mobile-nav.tsx            # Mobile hamburger menu
│   ├── members/
│   │   ├── member-form.tsx
│   │   ├── member-table.tsx
│   │   └── org-tree.tsx
│   ├── attendance/
│   │   ├── clock-widget.tsx
│   │   ├── work-calendar.tsx
│   │   ├── overtime-chart.tsx
│   │   └── leave-form.tsx
│   ├── contracts/
│   │   ├── template-editor.tsx
│   │   ├── signature-canvas.tsx
│   │   ├── contract-timeline.tsx
│   │   └── seal-manager.tsx
│   ├── workflows/
│   │   ├── form-builder.tsx
│   │   ├── approval-chain.tsx
│   │   ├── document-viewer.tsx
│   │   └── approval-actions.tsx
│   └── shared/
│       ├── data-table-generic.tsx    # Reusable table with sort/filter/pagination
│       ├── status-badge.tsx
│       ├── date-range-picker.tsx
│       ├── file-upload.tsx
│       ├── loading-skeleton.tsx
│       └── empty-state.tsx
│
├── lib/
│   ├── firebase/
│   │   ├── config.ts                 # Firebase app initialization
│   │   ├── admin.ts                  # Firebase Admin SDK (server-side)
│   │   ├── auth.ts                   # Auth helper functions
│   │   ├── firestore.ts             # Firestore helper functions
│   │   └── storage.ts               # Storage helper functions
│   ├── hooks/
│   │   ├── use-auth.ts              # Auth state hook
│   │   ├── use-members.ts           # Member data hooks (SWR)
│   │   ├── use-attendance.ts        # Attendance data hooks
│   │   ├── use-contracts.ts         # Contract data hooks
│   │   ├── use-workflows.ts         # Workflow data hooks
│   │   └── use-notifications.ts     # Notification hooks
│   ├── utils/
│   │   ├── date.ts                  # KST date utilities
│   │   ├── work-hours.ts            # 52-hour calculation logic
│   │   ├── annual-leave.ts          # Korean labor law leave calculation
│   │   ├── permissions.ts           # RBAC permission checks
│   │   └── format.ts               # Korean number/date formatting
│   └── types/
│       └── index.ts                  # All TypeScript interfaces
│
├── contexts/
│   ├── auth-context.tsx              # Auth provider + user role
│   └── company-context.tsx           # Company settings provider
│
├── middleware.ts                      # Auth guard + role-based redirects
│
└── constants/
    ├── roles.ts                      # Role definitions + permission matrix
    ├── menus.ts                      # Sidebar menu items per role
    └── korean-holidays.ts            # Korean public holidays list
```

### Route Groups Explained

| Group | Layout | Purpose |
|-------|--------|---------|
| `(auth)` | Centered card, no sidebar | Login, company setup wizard |
| `(dashboard)` | Sidebar + Header + Main | All authenticated app pages |

### Middleware Logic

```typescript
// middleware.ts
// 1. Check Firebase Auth token (via cookie)
// 2. Unauthenticated → redirect to /login
// 3. Authenticated but no company setup → redirect to /setup
// 4. Role-based route protection (admin-only pages)
// 5. Set custom headers for server components
```

**Protected routes by role:**

| Route Pattern | Required Role |
|---------------|---------------|
| `/settings/**` | admin |
| `/organization/roles` | admin |
| `/workflows/forms/**`, `/workflows/policies/**` | admin |
| `/contracts/templates/**`, `/contracts/seals/**` | admin, manager |
| `/members/new`, `/members/invite` | admin, manager |
| `/attendance/reports` | admin, manager |
| All other `(dashboard)` routes | any authenticated |

---

## 3. Firestore Schema Design

### Design Philosophy

**Single-tenant model**: Since this is a single-company internal tool, we use a flat root-level collection structure rather than nesting everything under `companies/{companyId}`. This simplifies queries, security rules, and avoids unnecessary path nesting.

If multi-tenancy is ever needed (Phase 2+), the `companyId` field on every document enables migration to a sub-collection model.

### Collection Hierarchy

```
Root Collections:
├── company                          # Singleton document (company settings)
├── members                          # All employees
├── departments                      # Department definitions
├── teams                            # Team definitions (under departments)
├── positions                        # Position/title master data
├── attendance_records               # Daily clock-in/out records
├── attendance_weekly_summaries      # Denormalized weekly hour totals
├── leave_policies                   # Leave type definitions
├── leave_balances                   # Per-member annual leave balances
├── leave_requests                   # Leave applications
├── contract_templates               # Contract template definitions
├── contracts                        # Issued contracts
├── company_seals                    # Company seal images
├── workflow_forms                   # Approval form templates
├── workflow_policies                # Approval chain definitions
├── workflow_documents               # Submitted approval documents
├── notifications                    # In-app notifications
├── audit_logs                       # Change history / audit trail
└── onboarding_checklists            # New hire onboarding tasks
```

### Detailed Document Schemas

#### `company` (Singleton)

Single document at `company/settings`.

```
company/settings
{
  name: string                        // "타운 테크"
  representativeName: string          // "홍길동"
  businessNumber: string              // "123-45-67890"
  address: string
  phone: string
  logoUrl: string | null              // Firebase Storage path
  allowedEmailDomains: string[]       // ["town.co.kr"]
  workPolicy: {
    defaultWorkType: "fixed" | "flexible" | "staggered"
    weeklyHoursLimit: number          // 40 (standard), max 52
    workStartTime: string             // "09:00"
    workEndTime: string               // "18:00"
    flexRange: number                 // 60 (minutes, for staggered)
    lunchBreakMinutes: number         // 60
    lunchStartTime: string            // "12:00"
    weekStartDay: "monday" | "sunday" // For 52-hour calculation
    overtimeAlertThreshold: number    // 48 (warn before 52)
  }
  leavePolicy: {
    annualLeaveBase: "hire_date" | "fiscal_year"
    fiscalYearStart: string           // "01-01" (MM-DD)
    probationMonths: number           // 3
  }
  setupCompleted: boolean             // false until wizard done
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `members`

```
members/{memberId}
{
  uid: string                         // Firebase Auth UID (indexed)
  email: string                       // Google OAuth email
  name: string
  phone: string | null
  birthDate: string | null            // "1990-06-20"
  profileImageUrl: string | null      // Firebase Storage path
  departmentId: string | null         // Reference to departments
  teamId: string | null               // Reference to teams
  positionId: string | null           // Reference to positions
  jobTitle: string | null             // 직책 (e.g., "팀장")
  role: "admin" | "manager" | "employee"
  status: "active" | "on_leave" | "resigned"
  hireDate: string                    // "2024-01-15" (ISO date string)
  resignDate: string | null
  workType: "fixed" | "flexible" | "staggered" | "remote" | "hybrid"
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Indexes needed**: `uid` (unique), `departmentId + status`, `status`, `role`.

#### `departments`

```
departments/{departmentId}
{
  name: string                        // "개발본부"
  description: string | null
  headMemberId: string | null         // Reference to members
  parentDepartmentId: string | null   // For hierarchy (null = top-level)
  order: number                       // Display order
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `teams`

```
teams/{teamId}
{
  name: string                        // "백엔드팀"
  departmentId: string                // Parent department reference
  leadMemberId: string | null         // Reference to members
  description: string | null
  order: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `positions`

```
positions/{positionId}
{
  name: string                        // "시니어"
  level: number                       // 1 (신입) ~ 10 (CTO)
  category: "rank" | "job"            // 직급 vs 직책 구분
  description: string | null
  order: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `attendance_records`

One document per member per day.

```
attendance_records/{recordId}
{
  memberId: string                    // Reference to members
  date: string                        // "2026-02-26" (KST date, indexed)
  checkInTime: Timestamp | null       // Server timestamp (KST)
  checkOutTime: Timestamp | null      // Server timestamp (KST)
  workMinutes: number | null          // Calculated: checkOut - checkIn - lunch
  overtimeMinutes: number             // Minutes beyond 8-hour standard
  status: "present" | "absent" | "half_day" | "on_leave" | "holiday"
  modifiedBy: string | null           // Member ID if HR corrected
  modifiedReason: string | null       // Reason for correction
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Document ID convention**: `{memberId}_{date}` (e.g., `member001_2026-02-26`) -- enables direct lookups without queries.

**Indexes needed**: `memberId + date` (composite), `date + status`.

#### `attendance_weekly_summaries` (Denormalized)

Precomputed weekly totals to avoid expensive aggregation queries for 52-hour monitoring.

```
attendance_weekly_summaries/{summaryId}
{
  memberId: string
  weekStartDate: string               // "2026-02-24" (Monday)
  weekEndDate: string                 // "2026-03-02" (Sunday)
  totalWorkMinutes: number            // Sum of daily workMinutes
  totalOvertimeMinutes: number
  dailyBreakdown: {                   // Map for quick reference
    "2026-02-24": number,             // workMinutes per day
    "2026-02-25": number,
    ...
  }
  isOverLimit: boolean                // true if > 52 * 60 minutes
  alertSent: boolean                  // Has 52-hour alert been sent
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Document ID**: `{memberId}_{weekStartDate}`.

**Why denormalize?** Firestore does not support aggregation queries. Computing weekly hours from individual records requires fetching 5-7 documents per member per week. For a company with 100 employees, that is 500-700 reads per dashboard load. The summary document reduces this to 100 reads.

#### `leave_policies`

```
leave_policies/{policyId}
{
  name: string                        // "연차" | "병가" | "생리휴가" | etc.
  type: "annual" | "sick" | "menstrual" | "parental" | "special"
  annualDays: number | null           // null = unlimited (e.g., sick)
  isPaid: boolean
  requiresApproval: boolean
  autoApprove: boolean                // true = no manager approval needed
  minNoticeDays: number               // Days in advance required
  description: string | null
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `leave_balances`

Per-member, per-year leave balance tracking.

```
leave_balances/{balanceId}
{
  memberId: string
  year: number                        // 2026
  policyId: string                    // Reference to leave_policies
  granted: number                     // Days granted (e.g., 15)
  used: number                        // Days used so far
  pending: number                     // Days in pending requests
  remaining: number                   // granted - used - pending
  grantedAt: Timestamp                // When leave was granted
  grantReason: string                 // "자동부여 - 근속 2년차"
  expiresAt: Timestamp | null         // When unused leave expires
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Document ID**: `{memberId}_{year}_{policyId}`.

#### `leave_requests`

```
leave_requests/{requestId}
{
  memberId: string
  policyId: string                    // Which leave type
  startDate: string                   // "2026-03-10"
  endDate: string                     // "2026-03-12"
  days: number                        // 3 (calculated, supports half days: 0.5)
  reason: string
  attachmentUrls: string[]            // Firebase Storage paths
  status: "pending" | "approved" | "rejected" | "cancelled"
  approverId: string | null           // Manager who approved/rejected
  approverComment: string | null
  processedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Indexes needed**: `memberId + status`, `approverId + status`, `startDate`.

#### `contract_templates`

```
contract_templates/{templateId}
{
  name: string                        // "근로계약서"
  category: "employment" | "nda" | "security" | "other"
  content: string                     // Rich text with {{variables}}
  variables: string[]                 // ["name", "position", "department", "hireDate", "salary"]
  isDefault: boolean                  // System-provided template
  createdBy: string                   // Member ID
  version: number                     // Template version
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `contracts`

```
contracts/{contractId}
{
  templateId: string
  templateVersion: number             // Snapshot of template version used
  title: string                       // "김철수 근로계약서"
  recipientId: string                 // Member who signs
  senderId: string                    // HR who sent it
  content: string                     // Final rendered content (variables replaced)
  status: "draft" | "sent" | "pending_signature" | "signed" | "expired" | "cancelled"
  sealId: string | null               // Reference to company_seals
  signatureImageUrl: string | null    // Firebase Storage path
  signedAt: Timestamp | null
  sentAt: Timestamp | null
  expiresAt: Timestamp | null
  pdfUrl: string | null               // Generated PDF in Firebase Storage
  statusHistory: [                    // Embedded status change log
    {
      status: string,
      changedBy: string,
      changedAt: Timestamp,
      comment: string | null
    }
  ]
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Indexes needed**: `recipientId + status`, `status`, `senderId + createdAt`.

#### `company_seals`

```
company_seals/{sealId}
{
  name: string                        // "회사직인" | "대표이사직인"
  imageUrl: string                    // Firebase Storage path
  type: "company" | "representative"
  allowedRoles: ("admin" | "manager")[]    // Who can use this seal
  isActive: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `workflow_forms`

```
workflow_forms/{formId}
{
  name: string                        // "휴가신청서"
  category: "leave" | "expense" | "purchase" | "general"
  description: string | null
  fields: [                           // Form field definitions
    {
      id: string,                     // "field_001"
      type: "text" | "number" | "date" | "select" | "checkbox" | "file" | "textarea",
      label: string,                  // "신청 사유"
      required: boolean,
      placeholder: string | null,
      options: string[] | null,       // For select type
      defaultValue: string | null,
      order: number
    }
  ]
  policyId: string | null             // Default approval chain
  isDefault: boolean                  // System-provided form
  isActive: boolean
  createdBy: string
  version: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `workflow_policies`

Approval chain definitions.

```
workflow_policies/{policyId}
{
  name: string                        // "일반 결재선"
  description: string | null
  formIds: string[]                   // Forms that use this policy
  approvalType: "sequential" | "parallel"
  steps: [
    {
      order: number,                  // 1, 2, 3...
      approverType: "specific" | "role" | "department_head" | "team_lead",
      approverId: string | null,      // For specific type
      approverRole: string | null,    // For role type
      isRequired: boolean,
      deadlineHours: number           // Hours to approve (default 48)
    }
  ]
  conditions: [                       // Optional conditional routing
    {
      field: string,                  // "amount"
      operator: "gt" | "lt" | "eq",
      value: number,
      addStepOrder: number            // Additional step if condition met
    }
  ] | null
  isActive: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `workflow_documents`

Submitted approval documents.

```
workflow_documents/{documentId}
{
  formId: string
  policyId: string
  title: string                       // Auto-generated: "{formName} - {submitter} - {date}"
  submittedBy: string                 // Member ID
  formData: Record<string, any>       // Key-value of form field responses
  attachmentUrls: string[]            // Firebase Storage paths
  status: "draft" | "pending" | "approved" | "rejected" | "on_hold" | "cancelled"
  currentStepOrder: number            // Which step in the approval chain
  approvals: [
    {
      stepOrder: number,
      approverId: string,
      approverName: string,           // Denormalized for display
      decision: "approved" | "rejected" | "on_hold" | null,
      comment: string | null,
      delegatedFrom: string | null,   // If delegated, original approver
      processedAt: Timestamp | null
    }
  ]
  pdfUrl: string | null               // Final approved document PDF
  completedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Indexes needed**: `submittedBy + status`, `status + createdAt`, plus approvals array querying (see indexes section).

#### `notifications`

```
notifications/{notificationId}
{
  recipientId: string                 // Member ID
  type: "approval_request" | "approval_result" | "leave_request" | "leave_result"
       | "contract_sent" | "contract_signed" | "overtime_warning" | "system"
  title: string                       // "결재 요청이 도착했습니다"
  body: string                        // Brief description
  link: string | null                 // "/workflows/{id}" deep link
  referenceId: string | null          // Related document ID
  isRead: boolean
  createdAt: Timestamp
}
```

**Indexes needed**: `recipientId + isRead + createdAt`.

**Cleanup strategy**: Delete notifications older than 90 days via scheduled function.

#### `audit_logs`

```
audit_logs/{logId}
{
  action: "create" | "update" | "delete" | "login" | "logout" | "approve" | "reject"
  collection: string                  // "members", "contracts", etc.
  documentId: string
  performedBy: string                 // Member ID
  performedByName: string             // Denormalized
  changes: Record<string, { old: any, new: any }> | null
  ipAddress: string | null
  createdAt: Timestamp
}
```

**Write-only collection**: No updates or deletes allowed. Only admins can read.

#### `onboarding_checklists`

```
onboarding_checklists/{checklistId}
{
  memberId: string                    // New hire
  assigneeId: string                  // HR/manager responsible
  items: [
    {
      id: string,
      title: string,                  // "이메일 계정 생성"
      description: string | null,
      isCompleted: boolean,
      completedAt: Timestamp | null,
      completedBy: string | null,
      duePhase: "day1" | "week1" | "month1" | "month3"
    }
  ]
  status: "in_progress" | "completed"
  completedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## 4. TypeScript Data Models

```typescript
// lib/types/index.ts

import { Timestamp } from "firebase/firestore";

// ============================================================
// Enums and Constants
// ============================================================

export type MemberRole = "admin" | "manager" | "employee";
export type MemberStatus = "active" | "on_leave" | "resigned";
export type WorkType = "fixed" | "flexible" | "staggered" | "remote" | "hybrid";

export type AttendanceStatus = "present" | "absent" | "half_day" | "on_leave" | "holiday";

export type LeaveType = "annual" | "sick" | "menstrual" | "parental" | "special";
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type ContractStatus = "draft" | "sent" | "pending_signature" | "signed" | "expired" | "cancelled";
export type ContractCategory = "employment" | "nda" | "security" | "other";

export type WorkflowStatus = "draft" | "pending" | "approved" | "rejected" | "on_hold" | "cancelled";
export type ApprovalDecision = "approved" | "rejected" | "on_hold";
export type ApprovalType = "sequential" | "parallel";
export type ApproverType = "specific" | "role" | "department_head" | "team_lead";

export type FormFieldType = "text" | "number" | "date" | "select" | "checkbox" | "file" | "textarea";

export type NotificationType =
  | "approval_request" | "approval_result"
  | "leave_request" | "leave_result"
  | "contract_sent" | "contract_signed"
  | "overtime_warning" | "system";

export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "approve" | "reject";

// ============================================================
// Company
// ============================================================

export interface WorkPolicy {
  defaultWorkType: WorkType;
  weeklyHoursLimit: number;
  workStartTime: string;
  workEndTime: string;
  flexRange: number;
  lunchBreakMinutes: number;
  lunchStartTime: string;
  weekStartDay: "monday" | "sunday";
  overtimeAlertThreshold: number;
}

export interface LeavePolicyConfig {
  annualLeaveBase: "hire_date" | "fiscal_year";
  fiscalYearStart: string;
  probationMonths: number;
}

export interface Company {
  name: string;
  representativeName: string;
  businessNumber: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  allowedEmailDomains: string[];
  workPolicy: WorkPolicy;
  leavePolicy: LeavePolicyConfig;
  setupCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// Members & Organization
// ============================================================

export interface Member {
  id: string;
  uid: string;
  email: string;
  name: string;
  phone: string | null;
  birthDate: string | null;
  profileImageUrl: string | null;
  departmentId: string | null;
  teamId: string | null;
  positionId: string | null;
  jobTitle: string | null;
  role: MemberRole;
  status: MemberStatus;
  hireDate: string;
  resignDate: string | null;
  workType: WorkType;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  headMemberId: string | null;
  parentDepartmentId: string | null;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Team {
  id: string;
  name: string;
  departmentId: string;
  leadMemberId: string | null;
  description: string | null;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Position {
  id: string;
  name: string;
  level: number;
  category: "rank" | "job";
  description: string | null;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// Attendance
// ============================================================

export interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string;
  checkInTime: Timestamp | null;
  checkOutTime: Timestamp | null;
  workMinutes: number | null;
  overtimeMinutes: number;
  status: AttendanceStatus;
  modifiedBy: string | null;
  modifiedReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AttendanceWeeklySummary {
  id: string;
  memberId: string;
  weekStartDate: string;
  weekEndDate: string;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  dailyBreakdown: Record<string, number>;
  isOverLimit: boolean;
  alertSent: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// Leave
// ============================================================

export interface LeavePolicy {
  id: string;
  name: string;
  type: LeaveType;
  annualDays: number | null;
  isPaid: boolean;
  requiresApproval: boolean;
  autoApprove: boolean;
  minNoticeDays: number;
  description: string | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LeaveBalance {
  id: string;
  memberId: string;
  year: number;
  policyId: string;
  granted: number;
  used: number;
  pending: number;
  remaining: number;
  grantedAt: Timestamp;
  grantReason: string;
  expiresAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LeaveRequest {
  id: string;
  memberId: string;
  policyId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  attachmentUrls: string[];
  status: LeaveRequestStatus;
  approverId: string | null;
  approverComment: string | null;
  processedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// Contracts
// ============================================================

export interface ContractTemplate {
  id: string;
  name: string;
  category: ContractCategory;
  content: string;
  variables: string[];
  isDefault: boolean;
  createdBy: string;
  version: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContractStatusChange {
  status: ContractStatus;
  changedBy: string;
  changedAt: Timestamp;
  comment: string | null;
}

export interface Contract {
  id: string;
  templateId: string;
  templateVersion: number;
  title: string;
  recipientId: string;
  senderId: string;
  content: string;
  status: ContractStatus;
  sealId: string | null;
  signatureImageUrl: string | null;
  signedAt: Timestamp | null;
  sentAt: Timestamp | null;
  expiresAt: Timestamp | null;
  pdfUrl: string | null;
  statusHistory: ContractStatusChange[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CompanySeal {
  id: string;
  name: string;
  imageUrl: string;
  type: "company" | "representative";
  allowedRoles: MemberRole[];
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// Workflows
// ============================================================

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder: string | null;
  options: string[] | null;
  defaultValue: string | null;
  order: number;
}

export interface WorkflowForm {
  id: string;
  name: string;
  category: "leave" | "expense" | "purchase" | "general";
  description: string | null;
  fields: FormField[];
  policyId: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdBy: string;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApprovalStep {
  order: number;
  approverType: ApproverType;
  approverId: string | null;
  approverRole: string | null;
  isRequired: boolean;
  deadlineHours: number;
}

export interface PolicyCondition {
  field: string;
  operator: "gt" | "lt" | "eq";
  value: number;
  addStepOrder: number;
}

export interface WorkflowPolicy {
  id: string;
  name: string;
  description: string | null;
  formIds: string[];
  approvalType: ApprovalType;
  steps: ApprovalStep[];
  conditions: PolicyCondition[] | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApprovalRecord {
  stepOrder: number;
  approverId: string;
  approverName: string;
  decision: ApprovalDecision | null;
  comment: string | null;
  delegatedFrom: string | null;
  processedAt: Timestamp | null;
}

export interface WorkflowDocument {
  id: string;
  formId: string;
  policyId: string;
  title: string;
  submittedBy: string;
  formData: Record<string, any>;
  attachmentUrls: string[];
  status: WorkflowStatus;
  currentStepOrder: number;
  approvals: ApprovalRecord[];
  pdfUrl: string | null;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// Notifications & Audit
// ============================================================

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: Timestamp;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  collection: string;
  documentId: string;
  performedBy: string;
  performedByName: string;
  changes: Record<string, { old: any; new: any }> | null;
  ipAddress: string | null;
  createdAt: Timestamp;
}

// ============================================================
// Onboarding
// ============================================================

export interface OnboardingItem {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: Timestamp | null;
  completedBy: string | null;
  duePhase: "day1" | "week1" | "month1" | "month3";
}

export interface OnboardingChecklist {
  id: string;
  memberId: string;
  assigneeId: string;
  items: OnboardingItem[];
  status: "in_progress" | "completed";
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 5. Firebase Auth Flow

### Authentication Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Login Page   │    │ Firebase Auth │    │  Firestore   │
│  (Client)     │    │ (Google OAuth)│    │  (members)   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                    │                    │
       │ 1. signInWithPopup │                    │
       │───────────────────>│                    │
       │                    │                    │
       │ 2. Google consent  │                    │
       │<───────────────────│                    │
       │                    │                    │
       │ 3. Firebase ID     │                    │
       │    Token returned  │                    │
       │<───────────────────│                    │
       │                    │                    │
       │ 4. Check allowed   │                    │
       │    email domain    │                    │
       │────────────────────────────────────────>│
       │                    │                    │
       │ 5. Fetch/create    │                    │
       │    member document │                    │
       │<───────────────────────────────────────│
       │                    │                    │
       │ 6. Set auth cookie │                    │
       │    (httpOnly via   │                    │
       │     Route Handler) │                    │
       │                    │                    │
       │ 7. Redirect to     │                    │
       │    /dashboard      │                    │
       └────────────────────┘                    │
```

### Auth Flow Steps

1. **Login**: User clicks "Google 계정으로 로그인" button
2. **OAuth**: `signInWithPopup(auth, googleProvider)` -- Firebase handles Google OAuth
3. **Domain Check**: Verify email domain against `company.allowedEmailDomains`
4. **Member Lookup**: Query `members` collection where `uid == auth.uid`
   - If member exists and `status == "active"` -- proceed
   - If member exists and `status == "resigned"` -- deny access, show error
   - If member does not exist -- show "접근 권한이 없습니다" (first login must be invited by admin)
5. **Session**: Create session cookie via Route Handler for SSR access
6. **Redirect**: Based on `company.setupCompleted`:
   - `false` and role is `admin` -- redirect to `/setup`
   - `true` -- redirect to `/dashboard`

### Session Management

```typescript
// Cookie-based session for SSR compatibility
// The ID token is sent to a Route Handler that sets an httpOnly cookie

// POST /api/auth/session
// Body: { idToken: string }
// Response: Sets __session cookie (Firebase Hosting convention)
```

**Auto-logout**: Client-side idle timer (30 minutes default). Firebase Auth tokens auto-refresh, but the idle timer tracks user activity and forces logout on inactivity.

### Role Assignment

- First user to complete setup becomes `admin`
- Admin invites members via email, assigning initial role
- Members authenticate via Google OAuth; their `uid` is matched to the pre-created member record
- Role changes are tracked in `audit_logs`

---

## 6. Firebase Storage Structure

```
storage/
├── profiles/
│   └── {memberId}/
│       └── profile.{ext}            # Profile photo (max 5MB, jpg/png)
│
├── contracts/
│   ├── signatures/
│   │   └── {contractId}/
│   │       └── signature.png        # E-signature image
│   ├── pdfs/
│   │   └── {contractId}/
│   │       └── contract.pdf         # Generated PDF
│   └── templates/
│       └── {templateId}/
│           └── attachment.{ext}     # Template attachments
│
├── seals/
│   └── {sealId}/
│       └── seal.png                 # Company seal image (transparent bg)
│
├── workflows/
│   └── {documentId}/
│       └── {filename}               # Workflow document attachments
│
├── leave/
│   └── {requestId}/
│       └── {filename}               # Leave request attachments (medical certs, etc.)
│
└── company/
    └── logo.{ext}                   # Company logo
```

### Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper functions
    function isAuth() { return request.auth != null; }
    function isOwner(memberId) { return request.auth.uid == memberId; }
    function maxSize(mb) { return request.resource.size < mb * 1024 * 1024; }
    function isImage() { return request.resource.contentType.matches('image/.*'); }

    // Profile photos: owner can write, all authenticated can read
    match /profiles/{memberId}/{fileName} {
      allow read: if isAuth();
      allow write: if isAuth() && isOwner(memberId) && isImage() && maxSize(5);
    }

    // Contracts: admin/hr can write, involved parties can read
    match /contracts/{path=**} {
      allow read: if isAuth();
      allow write: if isAuth(); // Fine-grained via Firestore security
    }

    // Seals: admin/hr only
    match /seals/{path=**} {
      allow read: if isAuth();
      allow write: if isAuth(); // Validated server-side
    }

    // Workflows: authenticated users
    match /workflows/{path=**} {
      allow read: if isAuth();
      allow write: if isAuth() && maxSize(10);
    }

    // Leave attachments
    match /leave/{path=**} {
      allow read: if isAuth();
      allow write: if isAuth() && maxSize(10);
    }

    // Company assets
    match /company/{fileName} {
      allow read: if isAuth();
      allow write: if isAuth(); // Admin-only enforced server-side
    }
  }
}
```

---

## 7. Firestore Security Rules

### Complete Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ================================================
    // Helper Functions
    // ================================================

    function isAuthenticated() {
      return request.auth != null;
    }

    // Get the member document for the current user
    function getMember() {
      return get(/databases/$(database)/documents/members/$(request.auth.uid));
    }

    function memberRole() {
      return getMember().data.role;
    }

    function memberStatus() {
      return getMember().data.status;
    }

    function isActive() {
      return isAuthenticated() && memberStatus() == "active";
    }

    function isAdmin() {
      return isActive() && memberRole() == "admin";
    }

    function isManager() {
      return isActive() && memberRole() in ["admin", "manager"];
    }

    function isOwner(memberId) {
      return isActive() && request.auth.uid == memberId;
    }

    // ================================================
    // Company Settings (Singleton)
    // ================================================

    match /company/settings {
      allow read: if isActive();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if false; // Never delete company settings
    }

    // ================================================
    // Members
    // ================================================

    match /members/{memberId} {
      // All active members can read any member profile
      allow read: if isActive();

      // Admin/Manager can create and update members
      allow create: if isManager();
      allow update: if isManager()
        // Members can update their own limited fields
        || (isOwner(memberId) && onlyUpdating(["phone", "profileImageUrl", "updatedAt"]));
      allow delete: if false; // Soft delete via status change
    }

    // ================================================
    // Organization (Departments, Teams, Positions)
    // ================================================

    match /departments/{deptId} {
      allow read: if isActive();
      allow write: if isAdmin();
    }

    match /teams/{teamId} {
      allow read: if isActive();
      allow write: if isAdmin();
    }

    match /positions/{positionId} {
      allow read: if isActive();
      allow write: if isAdmin();
    }

    // ================================================
    // Attendance
    // ================================================

    match /attendance_records/{recordId} {
      // Members can read their own; managers can read their team
      allow read: if isActive();

      // Clock-in/out: only the member themselves via server
      // Manager can modify (corrections)
      allow create: if isOwner(resource.data.memberId) || isManager();
      allow update: if isManager();
      allow delete: if false;
    }

    match /attendance_weekly_summaries/{summaryId} {
      allow read: if isActive();
      allow write: if false; // Server-only (computed via Route Handler)
    }

    // ================================================
    // Leave
    // ================================================

    match /leave_policies/{policyId} {
      allow read: if isActive();
      allow write: if isAdmin();
    }

    match /leave_balances/{balanceId} {
      allow read: if isActive();
      allow write: if false; // Server-only (auto-grant logic)
    }

    match /leave_requests/{requestId} {
      allow read: if isActive();
      allow create: if isActive(); // Any active member can request leave
      allow update: if isManager()  // Manager can approve/reject
        || (isOwner(resource.data.memberId) && resource.data.status == "pending");
      allow delete: if false;
    }

    // ================================================
    // Contracts
    // ================================================

    match /contract_templates/{templateId} {
      allow read: if isActive();
      allow write: if isManager();
    }

    match /contracts/{contractId} {
      allow read: if isActive();
      allow create: if isManager();
      // Recipient can update (signing), Manager can update (status changes)
      allow update: if isManager()
        || (isOwner(resource.data.recipientId)
            && onlyUpdating(["signatureImageUrl", "signedAt", "status", "updatedAt"]));
      allow delete: if false;
    }

    match /company_seals/{sealId} {
      allow read: if isActive();
      allow write: if isAdmin();
    }

    // ================================================
    // Workflows
    // ================================================

    match /workflow_forms/{formId} {
      allow read: if isActive();
      allow write: if isAdmin();
    }

    match /workflow_policies/{policyId} {
      allow read: if isActive();
      allow write: if isAdmin();
    }

    match /workflow_documents/{documentId} {
      allow read: if isActive();
      allow create: if isActive(); // Any active member can submit
      allow update: if isActive(); // Approval logic validated server-side
      allow delete: if false;
    }

    // ================================================
    // Notifications
    // ================================================

    match /notifications/{notificationId} {
      // Only the recipient can read/update their notifications
      allow read: if isOwner(resource.data.recipientId);
      allow update: if isOwner(resource.data.recipientId)
        && onlyUpdating(["isRead"]);
      allow create: if false; // Server-only
      allow delete: if isOwner(resource.data.recipientId);
    }

    // ================================================
    // Audit Logs
    // ================================================

    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow create: if false; // Server-only via Admin SDK
      allow update: if false;
      allow delete: if false;
    }

    // ================================================
    // Onboarding
    // ================================================

    match /onboarding_checklists/{checklistId} {
      allow read: if isActive();
      allow write: if isManager();
    }

    // ================================================
    // Helper: Field-level update restriction
    // ================================================

    function onlyUpdating(allowedFields) {
      return request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(allowedFields);
    }
  }
}
```

### Security Rules Design Notes

1. **No hard deletes**: All collections use `allow delete: if false`. Data is soft-deleted via status field changes. This ensures audit trail integrity.

2. **Server-only writes**: `attendance_weekly_summaries`, `leave_balances`, `audit_logs`, and `notifications` (create) are written only by server-side Route Handlers using the Firebase Admin SDK, which bypasses security rules. This ensures data integrity for computed/sensitive data.

3. **Member-based auth**: Security rules use `request.auth.uid` matched against the `members` collection. The member document stores the role for RBAC checks.

4. **`onlyUpdating` helper**: Restricts which fields a user can modify. For example, a contract recipient can only update their signature, not the contract content.

---

## 8. API Route Design

### Route Handlers (Server-Side)

All Route Handlers use Firebase Admin SDK for privileged operations.

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/auth/session` | Create session cookie from ID token | Public |
| POST | `/api/auth/logout` | Clear session cookie | Authenticated |
| POST | `/api/members` | Create member (with invitation) | Admin, Manager |
| POST | `/api/members/bulk-invite` | Bulk invite via email | Admin, Manager |
| PATCH | `/api/members/[id]/role` | Change member role | Admin |
| POST | `/api/attendance/clock` | Record clock-in or clock-out | Authenticated |
| GET | `/api/attendance/weekly-hours/[memberId]` | Get weekly hour summary | Authenticated |
| POST | `/api/attendance/recalculate-week` | Recalculate weekly summary | Server/Cron |
| POST | `/api/leave/apply` | Submit leave request | Authenticated |
| POST | `/api/leave/process` | Approve/reject leave | Manager+ |
| POST | `/api/leave/auto-grant` | Run annual leave grant logic | Server/Cron |
| POST | `/api/contracts/send` | Send contract to recipient | Manager |
| POST | `/api/contracts/sign` | Process signature upload | Authenticated |
| POST | `/api/contracts/generate-pdf` | Generate contract PDF | Manager |
| POST | `/api/workflows/submit` | Submit approval document | Authenticated |
| POST | `/api/workflows/process` | Approve/reject/hold document | Authenticated |
| POST | `/api/workflows/delegate` | Set up delegation | Authenticated |
| GET | `/api/reports/attendance` | Generate attendance report | Manager+ |
| GET | `/api/reports/attendance/download` | Download PDF/Excel report | Manager+ |
| POST | `/api/notifications/send` | Send notification (internal) | Server-only |
| POST | `/api/notifications/mark-read` | Mark notifications as read | Authenticated |

### Route Handler Pattern

```typescript
// Example: /api/attendance/clock/route.ts

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/auth";

export async function POST(request: NextRequest) {
  // 1. Verify auth
  const session = await verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate request body
  const body = await request.json();
  const { type } = body; // "check_in" | "check_out"

  // 3. Business logic (server timestamp for integrity)
  const today = getKSTDateString(); // "2026-02-26"
  const recordId = `${session.memberId}_${today}`;
  const now = admin.firestore.FieldValue.serverTimestamp();

  // 4. Firestore write via Admin SDK
  await adminDb.doc(`attendance_records/${recordId}`).set({
    memberId: session.memberId,
    date: today,
    ...(type === "check_in" ? { checkInTime: now } : { checkOutTime: now }),
    updatedAt: now,
  }, { merge: true });

  // 5. Update weekly summary (denormalized)
  await recalculateWeeklySummary(session.memberId, today);

  return NextResponse.json({ success: true });
}
```

### Why Route Handlers for Certain Operations

| Operation | Why Server-Side |
|-----------|----------------|
| Clock-in/out | Server timestamp ensures integrity (no client clock manipulation) |
| Weekly hour calculation | Aggregation logic too complex for security rules |
| Leave auto-grant | Korean labor law calculation requires server logic |
| Contract PDF generation | PDF generation libraries (e.g., puppeteer, jsPDF) require Node.js |
| Send notifications | Centralized notification logic, email integration |
| Approval processing | Complex state machine with multi-step validation |
| Audit logging | Must be tamper-proof, written via Admin SDK only |

---

## 9. State Management Strategy

### Overview

| Layer | Technology | Use Case |
|-------|-----------|----------|
| Auth State | React Context (`AuthContext`) | Current user, role, loading state |
| Company State | React Context (`CompanyContext`) | Company settings, work policy |
| Server Data | SWR | Firestore reads with caching + revalidation |
| Form State | React Hook Form + Zod | Form validation and submission |
| UI State | Component-local `useState` | Modals, filters, tabs |

### Auth Context

```typescript
// contexts/auth-context.tsx

interface AuthState {
  user: FirebaseUser | null;
  member: Member | null;
  role: MemberRole | null;
  loading: boolean;
  error: string | null;
}

// Wraps the entire app
// Listens to onAuthStateChanged
// Fetches member document on auth change
// Provides: user, member, role, signIn, signOut, loading
```

### SWR for Firestore Data

```typescript
// lib/hooks/use-members.ts

import useSWR from "swr";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// Fetcher function for Firestore queries
async function fetchMembers(filters: MemberFilters): Promise<Member[]> {
  const q = query(
    collection(db, "members"),
    where("status", "==", filters.status || "active")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
}

export function useMembers(filters: MemberFilters) {
  const key = ["members", JSON.stringify(filters)];
  return useSWR(key, () => fetchMembers(filters), {
    revalidateOnFocus: false,
    dedupingInterval: 10000, // 10s dedup
  });
}
```

### Real-time Subscriptions (Selective)

Real-time listeners (`onSnapshot`) should be used sparingly to avoid excessive Firestore reads. Use them only where immediate updates matter:

| Data | Strategy | Reason |
|------|----------|--------|
| Notifications | `onSnapshot` | Must show instantly |
| Approval inbox | `onSnapshot` | Approvers need live updates |
| Attendance dashboard (today) | `onSnapshot` | Live clock-in status |
| Member list | SWR (poll) | Changes are infrequent |
| Contracts | SWR (poll) | Not time-critical |
| Reports | SWR (on-demand) | Generated on request |

### Form Handling

```typescript
// React Hook Form + Zod for all forms
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const memberSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/, "올바른 전화번호를 입력해주세요").optional(),
  departmentId: z.string().min(1, "부서를 선택해주세요"),
  role: z.enum(["admin", "manager", "employee"]),
  hireDate: z.string().min(1, "입사일을 선택해주세요"),
});
```

---

## 10. Composite Indexes

Firestore requires composite indexes for queries with multiple `where` clauses or `where` + `orderBy` combinations.

### Required Indexes

```
// firestore.indexes.json

{
  "indexes": [
    // Members: filter by status, order by name
    {
      "collectionGroup": "members",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    // Members: filter by department and status
    {
      "collectionGroup": "members",
      "fields": [
        { "fieldPath": "departmentId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    // Attendance: member's records by date
    {
      "collectionGroup": "attendance_records",
      "fields": [
        { "fieldPath": "memberId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    // Attendance: date + status (for daily dashboard)
    {
      "collectionGroup": "attendance_records",
      "fields": [
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    // Weekly summaries: member by week
    {
      "collectionGroup": "attendance_weekly_summaries",
      "fields": [
        { "fieldPath": "memberId", "order": "ASCENDING" },
        { "fieldPath": "weekStartDate", "order": "DESCENDING" }
      ]
    },
    // Weekly summaries: over-limit flag
    {
      "collectionGroup": "attendance_weekly_summaries",
      "fields": [
        { "fieldPath": "isOverLimit", "order": "ASCENDING" },
        { "fieldPath": "weekStartDate", "order": "DESCENDING" }
      ]
    },
    // Leave requests: member + status
    {
      "collectionGroup": "leave_requests",
      "fields": [
        { "fieldPath": "memberId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // Leave requests: approver + status (pending inbox)
    {
      "collectionGroup": "leave_requests",
      "fields": [
        { "fieldPath": "approverId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    // Contracts: recipient + status
    {
      "collectionGroup": "contracts",
      "fields": [
        { "fieldPath": "recipientId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // Contracts: status + createdAt (dashboard)
    {
      "collectionGroup": "contracts",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // Workflow documents: submitter + status
    {
      "collectionGroup": "workflow_documents",
      "fields": [
        { "fieldPath": "submittedBy", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // Workflow documents: status + createdAt (approval inbox)
    {
      "collectionGroup": "workflow_documents",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // Notifications: recipient + read status + time
    {
      "collectionGroup": "notifications",
      "fields": [
        { "fieldPath": "recipientId", "order": "ASCENDING" },
        { "fieldPath": "isRead", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // Audit logs: collection + time (for admin review)
    {
      "collectionGroup": "audit_logs",
      "fields": [
        { "fieldPath": "collection", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Index Design Rationale

- **Attendance uses deterministic document IDs** (`{memberId}_{date}`) so many queries can be direct lookups instead of index scans.
- **Weekly summaries are denormalized** so the 52-hour dashboard does not need to aggregate from daily records.
- **Approval inbox query**: Workflow documents where the current approver needs to act cannot be efficiently queried with array-contains on the `approvals` array (Firestore limitation). Instead, we use the `currentStepOrder` field combined with a `status == "pending"` filter, and resolve the approver client-side from the `approvals[currentStepOrder]` entry.

---

## 11. Architecture Risks and Decisions

### Key Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Firestore read costs** at scale | Medium | Denormalized weekly summaries, SWR caching, selective real-time listeners |
| **52-hour calculation accuracy** | High | Server timestamps only (no client clock), weekly summary recalculation on every clock event |
| **E-signature legal validity** | Low (MVP) | Canvas-based signatures are "simple signatures" -- legally weaker than qualified e-signatures. PRD acknowledges this as an open question. Sufficient for internal use. |
| **Firestore 1MB document limit** | Low | Contract `content` field could grow large with rich text. Mitigated: store content in Storage if >500KB, keep Firestore doc as metadata only. |
| **Approval chain complexity** | Medium | Conditional routing and delegation add complexity. Keep MVP to sequential/parallel only; conditional routing as Phase 2. |
| **No server-side cron** | Medium | Firebase Hosting does not have native cron. Use Vercel Cron or a Cloud Scheduler to trigger `/api/leave/auto-grant` and weekly summary recalculation. |
| **Security rule complexity** | Medium | The `getMember()` helper in security rules costs 1 read per rule evaluation. This is acceptable at MVP scale (<200 employees) but would need Custom Claims optimization at scale. |

### Design Decisions (ADRs)

#### ADR-1: Flat Collections vs. Nested Sub-collections

**Decision**: Use flat root-level collections (not nested under `companies/{id}`).

**Rationale**: This is a single-tenant app. Nesting adds path complexity and makes queries harder without multi-tenancy benefit. Every document carries a `companyId` field for future migration readiness.

**Consequence**: If multi-tenancy is added, documents must be migrated to sub-collections or collection group queries used.

#### ADR-2: Deterministic Document IDs for Attendance

**Decision**: Use `{memberId}_{date}` as document ID for `attendance_records`.

**Rationale**: Enables O(1) direct lookups for "did this member clock in today?" without a query. Prevents duplicate records for the same member+date.

**Consequence**: Cannot easily query "all records for member X" without a composite index (which we create anyway).

#### ADR-3: Denormalized Weekly Summaries

**Decision**: Maintain a separate `attendance_weekly_summaries` collection.

**Rationale**: Firestore lacks aggregation. Computing weekly hours from daily records on every dashboard load is expensive (5-7 reads per member). The summary is updated on every clock event and weekly recalculation cron.

**Consequence**: Data can be temporarily stale if the recalculation fails. Mitigated by running recalculation on every clock event.

#### ADR-4: Server Timestamps for Attendance

**Decision**: All clock-in/out times use Firebase Server Timestamps, never client-provided times.

**Rationale**: Prevents time manipulation. The server timestamp is authoritative.

**Consequence**: Clock operations must go through a Route Handler, not direct Firestore writes from the client.

#### ADR-5: SWR over React Query

**Decision**: Use SWR for server data caching.

**Rationale**: SWR is lighter-weight, aligns well with Next.js (same team at Vercel), and sufficient for our needs. React Query has more features but adds bundle size we do not need at MVP.

**Consequence**: If we need optimistic updates or complex mutation handling, may need to revisit.

#### ADR-6: Workflow Approval Inbox Query Pattern

**Decision**: Use `status + currentStepOrder` for approval inbox, not array-contains on `approvals`.

**Rationale**: Firestore `array-contains` cannot filter on nested object properties. We cannot query "documents where approvals array has an entry with approverId == X and decision == null". Instead, `currentStepOrder` indicates which step is active, and we resolve the approver client-side.

**Consequence**: The approval inbox page must fetch all pending documents and filter client-side for the current user. This is acceptable at MVP scale (few dozen active documents). At scale, a separate `pending_approvals/{approverId}` index collection would be needed.

#### ADR-7: Korean Labor Law Calculations Server-Side Only

**Decision**: All annual leave calculations and 52-hour compliance logic runs server-side.

**Rationale**: These calculations involve complex date math with Korean-specific rules (probation period, tenure-based increases, fiscal year alignment). Running client-side risks inconsistency. A single server implementation is the source of truth.

**Consequence**: Leave balance cannot be calculated purely from security rules. Route Handlers are required.

---

**Document End**

---

**Summary:**
- Collections: 14 root-level collections
- TypeScript interfaces: 25+ types covering all entities
- Route Handlers: 18 server-side API endpoints
- Composite Indexes: 14 required indexes
- Security Rules: Role-based (admin/hr/manager/employee) with field-level restrictions
- Architecture Decision Records: 7 documented decisions

---

## 12. Architect Response to Devil's Advocate Review

This section formally addresses the concerns raised in `docs/DEVILS_ADVOCATE.md`. Each concern is evaluated on its technical merit, and the architect's verdict is provided: **Accept** (change the architecture), **Partially Accept** (incorporate mitigations), or **Acknowledge** (valid concern, no architecture change needed for MVP).

---

### Issue #1: "Firestore Is the Wrong Database for an HR System"

**Devil's Advocate Rating**: CRITICAL
**Architect Verdict**: PARTIALLY ACCEPT — Firestore is viable for MVP with mitigations already in place. Migration path preserved.

#### Point-by-Point Rebuttal

**"Attendance reports require complex aggregations"**

This is the strongest argument. However, the architecture *already addresses this*:

1. **Denormalized `attendance_weekly_summaries`** (see Section 3) pre-compute weekly totals on every clock event. The 52-hour dashboard reads one document per member, not thousands.

2. **Reports are generated server-side** via Route Handlers (`/api/reports/attendance`). The server uses Firebase Admin SDK to batch-read and aggregate. A quarterly report for 200 employees requires ~18,000 reads (200 members x 90 days) — this is a $0.01 operation and takes <5 seconds. This is not a user-facing real-time query; it runs on-demand and can be cached.

3. **The "single SQL query" argument is misleading.** Yes, SQL can express `SELECT department, WEEK(date), SUM(overtime) ... GROUP BY ...` elegantly. But at MVP scale (<200 employees, <50k attendance records/year), the Firestore approach of batch-read + server-side aggregation is fast, cheap, and correct. SQL elegance is a developer experience benefit, not a user-facing requirement.

**"No joins"**

Valid, but overstated for this use case:

1. **Member profiles are cached client-side via SWR.** When rendering an attendance table that shows member names and departments, SWR already has the member list in memory. The "join" happens in JavaScript, not the database. This is standard practice for NoSQL applications.

2. **Denormalization is deliberate and bounded.** The architecture denormalizes `approverName` in `workflow_documents.approvals` and member names in a few display contexts. These are stable fields (names change rarely). When they do change, a server-side batch update propagates the change. This is a known, manageable tradeoff.

3. **N+1 queries are avoided by design.** The schema uses flat collections with foreign key fields (`departmentId`, `teamId`). Client-side data hooks (see Section 9) fetch related data in parallel, not sequentially.

**"No inequality filters on multiple fields"**

Partially valid, but the architecture handles this:

1. **Composite indexes** (see Section 10) cover all required multi-field queries. 14 indexes are pre-defined for the known query patterns.

2. **Filtering UIs use a read-then-filter pattern** for admin views. At 200 employees, reading all attendance records for a given date range and filtering client-side is fast. This would not scale to 10,000 employees — but that is not the MVP target.

**"Cost at scale"**

The devil's advocate's own math shows $3-6/month for 200 employees. This is negligible. The architecture mitigates real-time listener costs by using `onSnapshot` for only 3 data types (notifications, approval inbox, today's attendance) and SWR polling for everything else (see Section 9).

#### Why Not Switch to Supabase/PostgreSQL

| Factor | Firestore | Supabase/PostgreSQL |
|--------|-----------|-------------------|
| **MVP speed** | Firebase ecosystem is pre-integrated (Auth + DB + Storage + Hosting). One `firebase init`, one deploy. | Requires separate setup for auth, DB, storage, hosting. More configuration. |
| **Team familiarity** | PRD specifies Firebase. Switching now delays MVP by 1-2 weeks for research + migration of existing work. | Learning curve for Supabase SDK, Row Level Security policies, PostgreSQL schema management. |
| **Real-time** (selective) | Native `onSnapshot` for notifications/approvals. | Supabase Realtime works but is less battle-tested at scale. |
| **Korean data residency** | Firestore `asia-northeast3` (Seoul) region. | Supabase Cloud does not have a Seoul region as of Feb 2026. Self-hosting required for full PIPA compliance. |
| **Reporting at scale** | Weak. Server-side aggregation works at MVP scale, breaks at 1000+ employees. | Strong. SQL aggregation is natural. |
| **Migration cost** | Significant if done later. | N/A (starting fresh). |

**Architect's Position**: For a single-company tool targeting <200 employees, Firestore is sufficient for MVP. The architecture already includes the mitigations (denormalization, server-side aggregation, selective real-time) that make it viable. **However**, the architecture preserves a migration path:

1. **Repository pattern** (ADR-8, added below): All Firestore access is abstracted behind a data access layer in `lib/firebase/firestore.ts`. Components never call Firestore directly. If we migrate to PostgreSQL later, only this layer changes.

2. **Server-side aggregation**: All complex queries already run in Route Handlers. These can be pointed at any database.

3. **`companyId` on every document**: Enables migration to a multi-tenant PostgreSQL schema if needed.

**Trigger for reconsidering**: If the target company exceeds 500 employees or if complex cross-module reporting (e.g., "attendance + leave + overtime by department by quarter") becomes a core requirement, the team should evaluate migrating to PostgreSQL. The repository pattern ensures this is a backend-only change.

---

### Issue #2: "Korean Labor Law Complexity Is Vastly Underestimated"

**Devil's Advocate Rating**: CRITICAL
**Architect Verdict**: ACCEPT — Scope reduction and legal validation required.

The devil's advocate is correct. The architecture document's `annual-leave.ts` and `work-hours.ts` utilities must handle significantly more edge cases than originally scoped.

**Actions taken:**

1. **ADR-9 (added below)**: MVP targets full-time employees at 50+ employee companies only. Part-time workers, flexible schedule averaging (2-week/3-month cycles), and small-company exemptions are deferred to Phase 2.

2. **Legal review gate**: No attendance calculation logic should ship to production without validation by a Korean labor law consultant. This is a recommendation to the team lead, not an architecture change.

3. **The architecture supports the complexity**: The `leave_balances` collection with per-member-per-year-per-policy tracking, and the `attendance_weekly_summaries` denormalized collection, are designed to accommodate the full edge case matrix. The schema does not need to change; only the server-side calculation logic in Route Handlers needs the legal review.

4. **Test suite**: The `work-hours.ts` and `annual-leave.ts` utilities should have a dedicated test file with 50+ edge cases. This is a recommendation to the QA manager.

---

### Issue #3: "E-Signature Implementation Has Legal Risk"

**Devil's Advocate Rating**: HIGH
**Architect Verdict**: ACKNOWLEDGE — Already documented as a risk in ADR section. No architecture change needed.

The architecture document (Section 11, Risks) already flags this: "Canvas-based signatures are 'simple signatures' — legally weaker than qualified e-signatures. Sufficient for internal use."

**Additional mitigations added to architecture:**

1. **Document hashing**: When a contract is signed, the Route Handler (`/api/contracts/sign`) computes a SHA-256 hash of the `content` field and stores it as `contentHash` on the contract document. This provides tamper evidence.

2. **Audit trail**: The `contracts.statusHistory` array already logs every status change with timestamp and actor. The signing event captures IP address via the Route Handler.

3. **Immutability**: Once a contract reaches `signed` status, Firestore security rules prevent any further updates to `content`, `signatureImageUrl`, or `signedAt`. Only `status` can change (to `expired`).

The recommendation to integrate a Korean certified e-signature provider (e.g., OneSign, NiceCert) is valid for Phase 2 but is out of MVP scope per the PRD.

---

### Issue #4: "Firebase Security Model Is Dangerous for HR Data"

**Devil's Advocate Rating**: HIGH
**Architect Verdict**: PARTIALLY ACCEPT — Sensitive data handling needs strengthening.

**Actions taken:**

1. **ADR-10 (added below)**: Sensitive personal data (주민등록번호, bank accounts, salary details) must NEVER be stored in Firestore. If these fields are needed in Phase 2 (payroll), they must go through a separate encrypted store or server-side-only collection accessed exclusively via Admin SDK through Route Handlers.

2. **Firebase region**: The architecture already specifies `asia-northeast3` (Seoul) for Firestore. Auth metadata processing outside Korea is a known Firebase limitation, but Google's DPA covers this for enterprise plans.

3. **Defense in depth**: The architecture uses Firestore Security Rules as the last line of defense (Section 7), with Route Handlers as the primary access control for sensitive operations (Section 8). Sensitive mutations (role changes, attendance corrections, contract signing) all go through server-side validation.

4. **PIPA compliance**: A PIPA compliance review before launch is recommended to the team lead. This is an operational recommendation, not an architecture change. The audit_logs collection (Section 3) provides the access logging required by PIPA.

---

### Issue #5: "MVP Scope Is Too Ambitious"

**Devil's Advocate Rating**: HIGH
**Architect Verdict**: ACKNOWLEDGE — Valid concern, but this is a product decision, not an architecture decision.

The architect's role is to ensure the architecture can support whatever scope the product team decides. The current architecture supports all 4 modules. If the product team decides to cut to 2 modules, no architecture changes are needed — unused collections simply remain empty.

**Recommendation to team lead**: The devil's advocate's suggestion to focus on Member Management + Attendance for a true MVP is sound. E-Contracts and Workflows can be Phase 2 without any schema redesign.

---

### Issue #6: "Firebase Vendor Lock-in"

**Devil's Advocate Rating**: MEDIUM
**Architect Verdict**: PARTIALLY ACCEPT — Repository pattern added.

**ADR-8 (added below)**: All Firestore access must go through a repository/service layer. This was implicit in the architecture (hooks in `lib/hooks/`, helpers in `lib/firebase/`) but is now an explicit requirement.

```
lib/
├── repositories/
│   ├── member-repository.ts       // All member CRUD operations
│   ├── attendance-repository.ts   // Attendance read/write
│   ├── contract-repository.ts     // Contract operations
│   ├── workflow-repository.ts     // Workflow operations
│   └── notification-repository.ts // Notification operations
```

Components and hooks call repositories, not Firestore directly. If the database changes, only repository implementations change.

---

### Issue #7: "Real-Time Features Are Overengineered"

**Devil's Advocate Rating**: MEDIUM
**Architect Verdict**: ALREADY ADDRESSED — The architecture agrees.

Section 9 (State Management Strategy) explicitly limits `onSnapshot` to only 3 use cases:
- Notifications (must show instantly)
- Approval inbox (approvers need live updates)
- Today's attendance dashboard (live clock-in status)

Everything else uses SWR with polling. The devil's advocate's recommendation matches the architecture exactly.

---

### Issues #8-11: Medium/Low Severity

**#8 Missing critical HR features**: ACKNOWLEDGE. The schema is designed for extensibility. Payroll export can be built from `attendance_records` and `leave_balances`. Certificate issuance can pull from `members`. No schema changes needed.

**#9 No mobile/offline strategy**: ACKNOWLEDGE. Responsive web is the MVP target per PRD. PWA is Phase 2.

**#10 Testing gaps**: ACKNOWLEDGE. Recommendations forwarded to QA manager: dedicated labor law test suite, Firestore security rule tests via emulator.

**#11 Competitive landscape**: ACKNOWLEDGE. Product decision, not architecture concern.

---

### New Architecture Decision Records

#### ADR-8: Repository Pattern for Database Abstraction

**Decision**: All Firestore access goes through repository modules in `lib/repositories/`. Components and hooks never import Firestore SDK directly.

**Rationale**: Addresses vendor lock-in concern. If we migrate from Firestore to PostgreSQL/Supabase, only repository implementations change. Application logic and UI remain untouched.

**Consequence**: Slight increase in boilerplate. Each collection needs a repository file. Worthwhile tradeoff for migration safety.

#### ADR-9: MVP Labor Law Scope Restriction

**Decision**: MVP attendance calculations target only full-time employees (40hr/week) at companies with 50+ employees. Part-time proportional leave, flexible schedule averaging (2-week/3-month 탄력근무제), and small-company exemptions (<5 employees) are Phase 2.

**Rationale**: The full Korean labor law edge case matrix is enormous. Attempting to cover all cases in MVP risks incorrect calculations and legal liability. Starting with the most common case (full-time, 50+ company) covers the target user segment.

**Consequence**: The system must display a clear disclaimer that calculations assume full-time employment at a 50+ employee company. The schema supports Phase 2 expansion without changes.

#### ADR-10: Sensitive Personal Data Exclusion

**Decision**: Highly sensitive personal data (주민등록번호/Korean national ID, bank account numbers, salary figures) must NOT be stored in Firestore client-accessible collections. If needed in Phase 2, they must be stored in a server-side-only mechanism (e.g., a Firestore collection readable only by Admin SDK, or an external encrypted store).

**Rationale**: Firestore security rules, while robust, are a single layer of defense. Korean PIPA treats national IDs and financial data as requiring enhanced protection. The client-side Firebase SDK exposes configuration that, combined with any security rule misconfiguration, could leak this data.

**Consequence**: Phase 2 payroll integration will require a separate data store design. MVP member profiles do not include salary or national ID fields.

#### ADR-11: Server-Side Write Enforcement for State-Changing Operations

**Decision**: All operations that change business-critical state (approval decisions, attendance clock-in/out, leave request status changes) MUST be executed through Next.js Route Handlers using the Firebase Admin SDK. The corresponding Firestore security rules for these collections MUST be set to `allow create/update: if false` for client-side writes, so that only Admin SDK (which bypasses rules) can write.

**Rationale**: Client-side Firestore writes rely solely on security rules for authorization. Security rules cannot validate complex business logic (e.g., "is this user the designated approver for step N of this workflow?"). A malicious authenticated user can bypass client-side state machine logic and write directly to Firestore. Server-side Route Handlers provide:
1. Atomic read-modify-write via Firestore transactions (prevents race conditions)
2. Complex authorization logic (step-level approver validation, role + context checks)
3. Server timestamps via `FieldValue.serverTimestamp()` (prevents client clock manipulation)
4. Audit logging capability at the point of mutation

**Collections requiring server-only writes**:
- `workflow_documents` — approval state transitions
- `attendance_records` — clock-in/out (already implemented via `/api/attendance/clock`)
- `attendance_weekly_summaries` — denormalized summaries (already `write: if false`)
- `leave_requests` — approval/rejection status changes
- `audit_logs` — already `write: if false`

**Consequence**: Each state-changing operation needs a corresponding Route Handler. This increases the API surface but provides defense-in-depth. The pattern is already established with the attendance clock API; workflow approval and leave approval must follow the same pattern before MVP ships.

---

### Summary of Architect's Position

| Devil's Advocate Issue | Severity | Architect Verdict | Impact on Architecture |
|----------------------|----------|-------------------|----------------------|
| #1 Firestore wrong DB | CRITICAL | Partially Accept | Added ADR-8 (repository pattern). Firestore viable at MVP scale with existing mitigations. Migration path preserved. |
| #2 Labor law complexity | CRITICAL | Accept | Added ADR-9 (scope restriction). Server-side logic needs legal review. Schema unchanged. |
| #3 E-signature legal risk | HIGH | Acknowledge | Document hashing + immutability rules added. Phase 2 for certified signatures. |
| #4 Firebase security + PIPA | HIGH | Partially Accept | Added ADR-10 (sensitive data exclusion). Seoul region confirmed. Defense in depth already in place. |
| #5 MVP scope too ambitious | HIGH | Acknowledge | Product decision. Architecture supports any scope subset. |
| #6 Vendor lock-in | MEDIUM | Partially Accept | Added ADR-8 (repository pattern). |
| #7 Real-time overengineered | MEDIUM | Already Addressed | Architecture already limits onSnapshot to 3 use cases. |
| #8-11 | MEDIUM-LOW | Acknowledge | No architecture changes. Recommendations forwarded to team. |

**Bottom line**: The Firestore choice is defensible at MVP scale with the mitigations already built into this architecture. The repository pattern (ADR-8) ensures we can migrate if needed. The three genuinely critical actions are: (1) legal review of labor law calculations before shipping, (2) excluding sensitive personal data from client-accessible stores (ADR-10), and (3) enforcing server-side writes for all state-changing operations to prevent client-side authorization bypass (ADR-11).
