# Town (타운) QA Strategy & Test Infrastructure

> Comprehensive quality assurance plan for the Town HR management tool MVP.
> Last updated: 2026-02-26

---

## Table of Contents

1. [Test Infrastructure](#1-test-infrastructure)
2. [Test Strategy per Module](#2-test-strategy-per-module)
3. [Quality Gates](#3-quality-gates)
4. [Edge Cases & Boundary Testing](#4-edge-cases--boundary-testing)
5. [Test Data Strategy](#5-test-data-strategy)
6. [CI/CD Integration](#6-cicd-integration)
7. [Test File Conventions](#7-test-file-conventions)

---

## 1. Test Infrastructure

### 1.1 Core Test Stack

| Tool | Purpose | Scope |
|------|---------|-------|
| **Vitest** | Unit & integration tests | Business logic, utilities, hooks, API routes |
| **React Testing Library** | Component tests | UI components, form interactions, accessibility |
| **Playwright** | E2E tests | Full user flows, cross-browser verification |
| **Firebase Emulator Suite** | Local Firebase testing | Firestore, Auth, Storage — no cloud dependency |
| **axe-core / @axe-core/playwright** | Accessibility testing | WCAG 2.1 AA compliance |
| **Lighthouse CI** | Performance testing | Core Web Vitals budgets |

### 1.2 Configuration Overview

**Vitest** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.tsx',
        'src/**/index.ts',        // barrel exports
        'src/types/**',
      ],
      thresholds: {
        // Global minimums
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Playwright** (`playwright.config.ts`):
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github' as const]] : []),
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

**Firebase Emulator** (`firebase.json` — emulator section):
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

### 1.3 Test Setup File (`tests/setup.ts`)

```typescript
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Firebase config for unit tests
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {},
}));
```

### 1.4 Coverage Targets

| Category | Target | Rationale |
|----------|--------|-----------|
| **Attendance calculation logic** | **95%+** | Legal compliance — zero tolerance for errors |
| **Approval workflow state machine** | **95%+** | Business-critical state transitions |
| **Leave balance calculations** | **95%+** | Legal compliance — affects employee rights |
| **Auth & RBAC logic** | **90%+** | Security-critical |
| **Firestore security rules** | **90%+** | Data protection |
| **UI components** | **80%+** | User-facing quality |
| **Utility functions** | **80%+** | Shared code reliability |
| **API route handlers** | **80%+** | Server-side correctness |
| **Global minimum** | **70%+** | PR merge gate |

---

## 2. Test Strategy per Module

### 2.1 Member/Org Management (구성원/조직 관리)

#### Unit Tests
| Test Area | Key Test Cases |
|-----------|---------------|
| **Employee CRUD** | Create with required fields, update partial fields, soft-delete vs hard-delete, duplicate email prevention |
| **Role assignment** | Assign admin/manager/employee roles, role change audit logging, prevent last-admin removal |
| **Org hierarchy** | Create department, nest departments, move employee between departments, department deletion with members |
| **Data validation** | Korean name validation (한글), phone number format (010-XXXX-XXXX), email format, employee ID uniqueness |

#### Integration Tests
| Test Area | Key Test Cases |
|-----------|---------------|
| **Firestore operations** | Create member document, query by department, real-time listener updates, batch operations |
| **RBAC enforcement** | Admin can CRUD all, manager can view team only, employee can view self only |
| **Org chart queries** | Fetch full hierarchy, filter by department, search by name |

#### E2E Tests
| Flow | Steps |
|------|-------|
| **Add new member** | Login as admin -> Navigate to members -> Click add -> Fill form -> Submit -> Verify in list |
| **Edit member profile** | Select member -> Edit fields -> Save -> Verify changes persisted |
| **Manage departments** | Create department -> Assign members -> Verify org chart reflects changes |
| **Role management** | Change user role -> Verify permission changes take effect immediately |

---

### 2.2 Attendance Management (근태 관리)

**This module has the highest test priority due to Korean labor law compliance.**

#### Unit Tests — Work Hour Calculations (CRITICAL)
| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Normal work week | Mon-Fri 09:00-18:00 (1hr lunch) | 40 hours base |
| At 52-hour limit | 40 base + 12 overtime | Warning: at maximum |
| Over 52-hour limit | 40 base + 13 overtime | **ERROR: exceeds legal limit** |
| Night work (야간근로) | 22:00-06:00 shift | Flagged + 50% premium marker |
| Weekend work (휴일근로) | Saturday 09:00-18:00 | Flagged + 50% premium marker |
| Holiday work (공휴일) | National holiday work | Flagged + 100% premium marker |
| Cross-midnight shift | 22:00 Day1 - 06:00 Day2 | Correctly split across days |
| Lunch break deduction | 09:00-18:00, 1hr lunch | 8 hours net (not 9) |
| Multiple breaks | Custom break schedule | Correct deduction of all breaks |

#### Unit Tests — Annual Leave Calculations (CRITICAL)
| Test Case | Tenure | Expected Leave |
|-----------|--------|----------------|
| Under 1 year | 0-11 months | 1 day per month worked (max 11) |
| Exactly 1 year | 12 months | 15 days |
| 2 years | 24 months | 15 days |
| 3 years | 36 months | 16 days (15 + 1 for every 2 years over 1) |
| 5 years | 60 months | 17 days |
| 21+ years | 252 months | 25 days (legal maximum) |
| Mid-year hire | Started July 1 | Pro-rated for first year |
| Leap year handling | Feb 29 hire date | Correct anniversary calculation |
| Used leave tracking | 15 entitled, 5 used | 10 remaining |
| Carry-over rules | Unused from prev year | Per company policy config |

#### Unit Tests — Weekly Hour Aggregation
| Test Case | Description | Expected |
|-----------|-------------|----------|
| Week boundary (Mon-Sun) | Korean standard work week | Correct weekly total |
| Week boundary (Sun-Sat) | Alternative configuration | Correct weekly total |
| Partial week (new hire) | Started mid-week | Only count from start date |
| Partial week (termination) | Left mid-week | Only count until end date |

#### Integration Tests
| Test Area | Key Test Cases |
|-----------|---------------|
| **Check-in/out flow** | Record timestamp to Firestore, prevent duplicate check-in, handle missed check-out |
| **Weekly report generation** | Aggregate daily records into weekly summary, flag overtime violations |
| **Manager dashboard** | Team attendance overview, filter by date range, export capability |
| **Real-time updates** | Check-in reflected immediately for managers via onSnapshot |

#### E2E Tests
| Flow | Steps |
|------|-------|
| **Daily check-in/out** | Login -> Check in -> Work -> Check out -> Verify hours recorded |
| **View attendance history** | Navigate to history -> Filter by month -> Verify data accuracy |
| **Manager reviews team** | Login as manager -> View team dashboard -> See all members' status |
| **52-hour alert** | Accumulate hours near limit -> Verify warning displayed at 48hrs -> Verify block at 52hrs |
| **Leave request** | Submit leave request -> Manager approves -> Leave balance decremented |

---

### 2.3 E-Contracts (전자계약서)

#### Unit Tests
| Test Area | Key Test Cases |
|-----------|---------------|
| **Template rendering** | Variable substitution (name, date, salary), Korean text rendering, conditional sections |
| **Validation** | Required fields check, date format validation (YYYY-MM-DD / YYYY년 MM월 DD일), salary format |
| **Signature state** | Unsigned -> Pending -> Signed -> Completed state transitions, invalid transition prevention |
| **PDF generation** | Template to PDF conversion, Korean font embedding, correct page breaks |

#### Integration Tests
| Test Area | Key Test Cases |
|-----------|---------------|
| **Template CRUD** | Create template in Firestore, update template, version tracking |
| **File storage** | Upload signed contract to Firebase Storage, retrieve for viewing, access control |
| **Signature flow** | Create contract -> Send for signing -> Record signature -> Store completed document |

#### E2E Tests
| Flow | Steps |
|------|-------|
| **Create contract from template** | Select template -> Fill variables -> Preview -> Send to employee |
| **Sign contract** | Receive notification -> Review contract -> Apply signature -> Download signed copy |
| **Admin manages templates** | Create new template -> Define variable fields -> Save -> Use in new contract |

---

### 2.4 Workflows/E-Approval (전자결재)

#### Unit Tests — Approval Chain Logic (CRITICAL)
| Test Case | Description | Expected |
|-----------|-------------|----------|
| Single approver | One-step approval | Submitted -> Approved/Rejected |
| Sequential chain | A -> B -> C | Each step waits for previous |
| Parallel approval | A + B simultaneously, then C | C unlocks only after both A and B approve |
| Rejection at step 2 | A approves, B rejects | Whole request rejected, A notified |
| Delegation | B delegates to D | D can approve on B's behalf |
| Auto-approval | Amount under threshold | Skip approval, auto-complete |
| Timeout | No action in N days | Escalate or auto-reject per policy |
| Recall | Submitter withdraws | Cancel pending approvals |

#### Unit Tests — State Machine
```
States: DRAFT -> SUBMITTED -> IN_REVIEW -> APPROVED | REJECTED | RECALLED
                                  -> ESCALATED -> APPROVED | REJECTED

Valid transitions:
  DRAFT -> SUBMITTED (by author)
  SUBMITTED -> IN_REVIEW (automatic, when first approver views)
  IN_REVIEW -> APPROVED (all approvers approve)
  IN_REVIEW -> REJECTED (any approver rejects)
  IN_REVIEW -> ESCALATED (timeout)
  SUBMITTED -> RECALLED (by author, before first approval)
  IN_REVIEW -> RECALLED (by author, company policy dependent)
  ESCALATED -> APPROVED | REJECTED (by escalation target)

Invalid transitions (must throw):
  APPROVED -> any
  REJECTED -> DRAFT (no re-draft without new submission)
  RECALLED -> APPROVED
```

#### Integration Tests
| Test Area | Key Test Cases |
|-----------|---------------|
| **Approval chain resolution** | Fetch chain config, resolve approvers by role/department, handle absent approver |
| **Notification triggers** | New request -> notify approvers, approval -> notify submitter, rejection -> notify all |
| **Concurrent approvals** | Two approvers approve simultaneously, no race condition on final state |
| **Audit trail** | Every state change logged with timestamp, actor, and comment |

#### E2E Tests
| Flow | Steps |
|------|-------|
| **Submit for approval** | Create document -> Select approval chain -> Submit -> Verify approvers notified |
| **Approve request** | Login as approver -> View pending -> Approve with comment -> Verify next step triggered |
| **Reject request** | Login as approver -> View pending -> Reject with reason -> Verify submitter notified |
| **Full chain completion** | Submit -> Approver 1 approves -> Approver 2 approves -> Final status: Approved |

---

## 3. Quality Gates

### 3.1 PR Merge Requirements

Every pull request MUST pass all of the following before merge:

| Gate | Requirement | Enforcement |
|------|-------------|-------------|
| **Unit tests** | All pass, no skipped | CI — Vitest |
| **Coverage** | >= 70% global, >= 95% for attendance/workflow logic | CI — Vitest coverage |
| **Type check** | Zero TypeScript errors | CI — `tsc --noEmit` |
| **Lint** | Zero ESLint errors | CI — ESLint |
| **Build** | Production build succeeds | CI — `next build` |
| **E2E (critical paths)** | Core smoke tests pass | CI — Playwright (chromium) |
| **Accessibility** | Zero axe-core violations (critical/serious) | CI — axe-core in component tests |
| **Bundle size** | No regression > 5% | CI — `next build` output analysis |
| **Code review** | At least 1 approval | GitHub branch protection |
| **Security** | No new `high`/`critical` vulnerabilities | CI — `npm audit` |

### 3.2 Coverage Thresholds by Directory

```typescript
// vitest.config.ts — per-directory overrides
coverage: {
  thresholds: {
    // Critical business logic — near-zero tolerance
    'src/lib/attendance/**': {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95,
    },
    'src/lib/workflow/**': {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95,
    },
    'src/lib/leave/**': {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95,
    },
    // Auth & security
    'src/lib/auth/**': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
    // UI components — standard
    'src/components/**': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
}
```

### 3.3 Accessibility Testing

**Standard: WCAG 2.1 Level AA**

| Area | Requirement |
|------|-------------|
| **Color contrast** | 4.5:1 for normal text, 3:1 for large text |
| **Keyboard navigation** | All interactive elements reachable via Tab, operable via Enter/Space |
| **Screen reader** | Meaningful labels on all form inputs, ARIA roles on custom widgets |
| **Focus management** | Visible focus indicators, logical tab order, focus trapped in modals |
| **Korean text** | Proper `lang="ko"` attribute, screen reader pronunciation support |

**Implementation:**
```typescript
// In component tests
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<AttendanceForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

```typescript
// In Playwright E2E tests
import AxeBuilder from '@axe-core/playwright';

test('attendance page is accessible', async ({ page }) => {
  await page.goto('/attendance');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### 3.4 Performance Budgets (Core Web Vitals)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Lighthouse CI |
| **FID** (First Input Delay) | < 100ms | Lighthouse CI |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Lighthouse CI |
| **TTI** (Time to Interactive) | < 3.5s | Lighthouse CI |
| **Bundle size (JS)** | < 250KB initial load (gzipped) | `next build` analysis |
| **Firestore query latency** | < 500ms for list views | Custom metrics in integration tests |

---

## 4. Edge Cases & Boundary Testing

### 4.1 Korean Labor Law Boundary Conditions

| Edge Case | Test | Why It Matters |
|-----------|------|----------------|
| **Exactly 52.00 hours** | Work exactly 52h in a week | Must be allowed (at limit, not over) |
| **52.01 hours** | Work 52h 1min | Must be blocked/warned |
| **Leap year leave calc** | Employee hired Feb 29, 2024 | Anniversary date handling for non-leap years |
| **Year-end leave expiry** | Dec 31 with remaining leave | Carry-over vs expiration logic |
| **New Year transition** | Check-in Dec 31 23:00, check-out Jan 1 07:00 | Cross-year boundary, annual leave reset |
| **Probation period** | Employee in first 3 months | Different leave rules may apply |
| **Part-time worker** | Works 20hr/week | Pro-rated leave, different hour limits |
| **Public holiday on weekend** | 공휴일 falls on Saturday | Substitute holiday (대체공휴일) handling |
| **Consecutive holidays** | Chuseok/Seollal (3-day) | Multi-day holiday period handling |
| **Timezone edge** | KST (UTC+9) boundary at midnight | All times must be in KST |

### 4.2 Concurrent Operations

| Edge Case | Test | Mitigation |
|-----------|------|------------|
| **Dual check-in** | User clicks check-in twice rapidly | Firestore transaction or idempotency check |
| **Simultaneous approval** | Two approvers approve at the exact same time | Firestore transaction ensures consistent state |
| **Concurrent leave requests** | Two requests for overlapping dates | Validate against existing approved leaves |
| **Session conflict** | User logged in on two devices | Last-write-wins or session invalidation |
| **Stale data update** | Edit form open while another user changes same record | Optimistic concurrency with version field |

### 4.3 Large Data & File Handling

| Edge Case | Test | Expected Behavior |
|-----------|------|-------------------|
| **Large contract PDF** | Upload 50MB file | Show progress, enforce size limit (e.g., 25MB max) |
| **Unsupported file type** | Upload .exe as contract | Reject with clear error message |
| **Many members** | Organization with 500+ members | Paginated list, no UI freeze |
| **Long approval chain** | 10-step approval chain | UI remains usable, progress clearly shown |
| **Bulk operations** | Import 100 members via CSV | Background processing with progress indicator |
| **Korean special characters** | Names with rare hanja (漢字) | Proper UTF-8 handling, display, and search |

### 4.4 Multi-Device & Session Edge Cases

| Edge Case | Test | Expected Behavior |
|-----------|------|-------------------|
| **Token expiry** | Session token expires during use | Graceful re-auth prompt, no data loss |
| **Offline then online** | Network drops during form submission | Queue action, retry on reconnect, or show error |
| **Tab/window duplication** | Same form open in two tabs | Prevent conflicting saves |
| **Mobile browser** | Access on mobile Chrome/Safari | Responsive layout, touch-friendly controls |

---

## 5. Test Data Strategy

### 5.1 Firebase Emulator Seed Data

Maintain a seed data script at `tests/seed/seed-emulator.ts`:

```typescript
// Test organization structure
const TEST_ORG = {
  company: {
    name: '테스트 주식회사',
    employees: 25,
  },
  departments: [
    { id: 'dept-dev', name: '개발팀', parentId: null },
    { id: 'dept-design', name: '디자인팀', parentId: null },
    { id: 'dept-hr', name: '인사팀', parentId: null },
    { id: 'dept-frontend', name: '프론트엔드', parentId: 'dept-dev' },
    { id: 'dept-backend', name: '백엔드', parentId: 'dept-dev' },
  ],
  users: [
    { id: 'user-admin', name: '김관리', role: 'admin', department: 'dept-hr' },
    { id: 'user-manager', name: '이팀장', role: 'manager', department: 'dept-dev' },
    { id: 'user-employee', name: '박사원', role: 'employee', department: 'dept-frontend' },
    // ... more test users for each role/department
  ],
};
```

### 5.2 Test Fixtures

Organize fixtures by module:

```
tests/
  fixtures/
    attendance/
      normal-week.json         # Standard 40-hour week
      overtime-week.json       # 48-hour week (within limit)
      violation-week.json      # 53-hour week (over limit)
      night-shift.json         # Night work records
      holiday-work.json        # Public holiday records
    leave/
      first-year.json          # Under 1 year tenure
      standard.json            # 1-3 year tenure
      senior.json              # 20+ year tenure (max leave)
    contracts/
      employment-template.json # Standard employment contract
      nda-template.json        # NDA template
    workflows/
      single-approver.json     # Simple approval chain
      multi-step.json          # 3-step sequential chain
      parallel-chain.json      # Parallel approval chain
```

### 5.3 Factory Functions

```typescript
// tests/factories/member.factory.ts
import { faker } from '@faker-js/faker/locale/ko';

export function createMember(overrides?: Partial<Member>): Member {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: `010-${faker.string.numeric(4)}-${faker.string.numeric(4)}`,
    department: 'dept-dev',
    role: 'employee',
    hireDate: faker.date.past({ years: 3 }).toISOString(),
    status: 'active',
    ...overrides,
  };
}

// tests/factories/attendance.factory.ts
export function createAttendanceRecord(overrides?: Partial<AttendanceRecord>): AttendanceRecord {
  const checkIn = new Date();
  checkIn.setHours(9, 0, 0, 0);
  const checkOut = new Date();
  checkOut.setHours(18, 0, 0, 0);

  return {
    id: crypto.randomUUID(),
    memberId: 'user-employee',
    date: new Date().toISOString().split('T')[0],
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    breakMinutes: 60,
    netWorkMinutes: 480, // 8 hours
    ...overrides,
  };
}
```

---

## 6. CI/CD Integration

### 6.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx eslint . --max-warnings 0

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [typecheck, unit-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Start Firebase Emulators
        run: npx firebase emulators:exec --only auth,firestore,storage "npx playwright test"
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [typecheck, lint]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Check bundle size
        run: |
          SIZE=$(du -sk .next/static | cut -f1)
          echo "Bundle size: ${SIZE}KB"
          if [ "$SIZE" -gt 512 ]; then
            echo "::warning::Bundle size exceeds 512KB"
          fi

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm audit --audit-level=high
```

### 6.2 Pre-commit Hooks (Husky + lint-staged)

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "vitest related --run"
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

---

## 7. Test File Conventions

### 7.1 Directory Structure

```
tests/
  setup.ts                          # Global test setup
  seed/
    seed-emulator.ts                # Firebase emulator seed data
  fixtures/                         # Static test data (see 5.2)
  factories/                        # Dynamic test data factories (see 5.3)
  e2e/
    auth.spec.ts                    # Login/logout flows
    members.spec.ts                 # Member management flows
    attendance.spec.ts              # Attendance flows
    contracts.spec.ts               # Contract flows
    workflows.spec.ts               # Approval workflow flows
  integration/
    firestore/
      members.test.ts               # Member Firestore operations
      attendance.test.ts            # Attendance Firestore operations
      contracts.test.ts             # Contract Firestore operations
      workflows.test.ts             # Workflow Firestore operations
    security-rules.test.ts          # Firestore security rules

src/
  lib/
    attendance/
      calculate-hours.ts
      calculate-hours.test.ts       # Co-located unit test
    leave/
      calculate-leave.ts
      calculate-leave.test.ts       # Co-located unit test
    workflow/
      state-machine.ts
      state-machine.test.ts         # Co-located unit test
  components/
    attendance/
      AttendanceForm.tsx
      AttendanceForm.test.tsx        # Co-located component test
```

### 7.2 Naming Conventions

| Type | File Pattern | Example |
|------|-------------|---------|
| Unit test (co-located) | `*.test.ts` / `*.test.tsx` | `calculate-hours.test.ts` |
| Integration test | `tests/integration/**/*.test.ts` | `tests/integration/firestore/attendance.test.ts` |
| E2E test | `tests/e2e/*.spec.ts` | `tests/e2e/attendance.spec.ts` |
| Test fixture | `tests/fixtures/**/*.json` | `tests/fixtures/attendance/normal-week.json` |
| Test factory | `tests/factories/*.factory.ts` | `tests/factories/member.factory.ts` |

### 7.3 Test Writing Guidelines

1. **Describe blocks mirror the module structure:**
   ```typescript
   describe('calculateWeeklyHours', () => {
     describe('normal work week', () => { ... });
     describe('overtime scenarios', () => { ... });
     describe('52-hour limit enforcement', () => { ... });
   });
   ```

2. **Test names state the expectation clearly:**
   ```typescript
   // Good
   it('returns 40 hours for standard Mon-Fri 9-18 schedule with 1hr lunch')
   it('throws WorkHourViolation when weekly hours exceed 52')

   // Bad
   it('works correctly')
   it('handles edge case')
   ```

3. **Arrange-Act-Assert pattern:**
   ```typescript
   it('calculates correct leave days for 3-year tenure', () => {
     // Arrange
     const hireDate = new Date('2023-03-01');
     const currentDate = new Date('2026-03-01');

     // Act
     const leaveDays = calculateAnnualLeave(hireDate, currentDate);

     // Assert
     expect(leaveDays).toBe(16); // 15 base + 1 for 2 years over 1
   });
   ```

4. **Use `test.each` for parameterized boundary tests:**
   ```typescript
   test.each([
     { tenure: 0, months: 6, expected: 6 },
     { tenure: 1, months: 0, expected: 15 },
     { tenure: 3, months: 0, expected: 16 },
     { tenure: 5, months: 0, expected: 17 },
     { tenure: 21, months: 0, expected: 25 },
     { tenure: 30, months: 0, expected: 25 }, // capped at 25
   ])('returns $expected leave days for $tenure years $months months tenure',
     ({ tenure, months, expected }) => {
       const hireDate = subYears(subMonths(new Date(), months), tenure);
       expect(calculateAnnualLeave(hireDate, new Date())).toBe(expected);
     }
   );
   ```

---

## Appendix: npm Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:emulator": "firebase emulators:exec --only auth,firestore,storage 'vitest run tests/integration'",
    "test:all": "npm run test:coverage && npm run test:e2e",
    "test:ci": "vitest run --coverage && playwright test --project=chromium"
  }
}
```
