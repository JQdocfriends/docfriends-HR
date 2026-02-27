# Devil's Advocate: Critical Analysis of Town (타운) MVP

> **Purpose**: Ruthlessly honest stress-test of the MVP plan and architecture. Better to find fatal flaws now than after months of development.
>
> **Author**: Devil's Advocate Agent
> **Date**: 2026-02-26

---

## Severity Legend

| Rating | Meaning |
|--------|---------|
| **CRITICAL** | Could cause project failure, legal liability, or require a full rewrite |
| **HIGH** | Will cause significant rework or block production launch |
| **MEDIUM** | Will cause pain but can be worked around |
| **LOW** | Minor concern, nice-to-have improvement |

---

## 1. Firestore Is the Wrong Database for an HR System

**Severity: CRITICAL**

### The Problem

Firestore is a document-oriented NoSQL database optimized for real-time mobile/web apps with simple read-heavy patterns. An HR system is the **exact opposite** of this use case:

- **Attendance reports require complex aggregations.** "Show me total overtime hours per department for Q3, broken down by week, excluding public holidays and approved leave." This is a single SQL query. In Firestore, this requires reading potentially thousands of individual attendance documents client-side and computing the aggregation in application code.

- **No joins.** HR data is inherently relational. Employees belong to departments. Departments have managers. Leave requests reference employees and approvers. Contracts reference employees and templates. Approval workflows chain multiple employees. Every single screen in this app needs data from multiple collections. Firestore forces you to either:
  1. **Denormalize everything** (duplicate data everywhere, leading to consistency nightmares when an employee changes departments), or
  2. **Make N+1 queries** (fetch employee, then fetch their department, then fetch their manager -- each a separate network call).

- **No inequality filters on multiple fields.** You cannot query "all attendance records where `date >= 2026-01-01` AND `overtimeHours > 0` AND `departmentId == 'engineering'`" in a single query without a composite index for every possible filter combination. Attendance filtering UIs will be severely limited or require reading entire datasets.

- **Aggregation queries are limited.** While Firestore added `count()`, `sum()`, and `average()` aggregation queries, they have a 60-second timeout and cannot handle complex grouping. They cannot do `GROUP BY`, window functions, or conditional aggregations that HR reporting demands.

- **Firestore Pipeline (2026) is not production-ready.** Google recently announced Pipeline operations for Firestore Enterprise, but this is brand new (February 2026), only available on the Enterprise tier (significantly more expensive), and lacks community battle-testing. Building an MVP on bleeding-edge features is risky.

### Cost at Scale

Firestore charges per document read/write:
- Reads: $0.06 per 100,000
- Writes: $0.18 per 100,000

For 200 employees checking in/out daily, that is 400 writes/day = 12,000/month just for attendance. Now add real-time listeners (each re-read counts), dashboard loads (reading hundreds of documents per page view), reporting (reading entire collections), and admin operations. A company with 200 employees could easily hit 5-10M reads/month = $3-6/month for reads alone. Seems cheap, but add writes, storage, and bandwidth, and costs become unpredictable. Real-time listeners are particularly dangerous -- a dashboard with 5 listeners across 50 concurrent admin sessions means every single document change fans out to all listeners.

### Recommended Mitigation

**Switch to Supabase (PostgreSQL) or a custom backend with PostgreSQL.** PostgreSQL is purpose-built for the relational, query-heavy, report-driven workload of an HR system. Supabase provides the same DX benefits as Firebase (real-time subscriptions, auth, storage, hosting) but with SQL underneath. The team is making a technology choice that will haunt every feature for the life of the product.

If Firebase is non-negotiable (e.g., existing organizational commitment), at minimum:
- Use Cloud Functions to pre-compute all aggregations at write time
- Budget for Firestore Enterprise tier and Pipeline operations
- Accept that every "simple" report will require significant backend engineering

---

## 2. Korean Labor Law Complexity Is Vastly Underestimated

**Severity: CRITICAL**

### The Problem

The MVP treats Korean labor law (근로기준법) as a few simple rules. In reality, it is a minefield of edge cases:

**Annual Leave Calculation (연차휴가) is not a simple formula:**

- First year: 1 day per month of perfect attendance (up to 11 days), BUT only if the employee worked at least 80% of scheduled days that month
- After 1 year: 15 days base, IF 80% attendance in the prior year
- After 3 years: +1 day per 2 additional years (capped at 25 days total)
- **Edge case**: What if someone joins mid-year? Their "first year" spans two calendar years. Annual leave carry-over rules differ.
- **Edge case**: Part-time workers get proportional leave based on contracted hours vs. full-time hours. A 20hr/week worker gets (20/40) * 15 = 7.5 days. Do you round up or down? (The law says proportional, but implementation varies.)
- **Edge case**: Workers under 15 hours/week get ZERO annual leave. The system must enforce this threshold.
- **Edge case**: Unused leave must be compensated financially (연차수당). The employer must actively encourage use (사용촉진). If the employer follows the legally prescribed encouragement process, they are not obligated to pay compensation. The system must track this encouragement workflow.

**52-Hour Work Week (주 52시간제) varies by company size:**

- Companies with 50+ employees: already enforced
- Companies with 5-49 employees: different overtime rules apply
- Companies with 1-4 employees: many provisions of the Labor Standards Act do not apply at all
- **Edge case**: The system targets "IT startups." A startup might grow from 4 to 6 to 50+ employees. The legal rules change at each threshold. Does the system adapt dynamically?

**Overtime Calculation is complex:**

- Base: 40 hours/week
- Extended work (연장근로): 150% of hourly wage
- Night work (야간근로, 10PM-6AM): additional 50% premium
- Holiday work (휴일근로): 150% for first 8 hours, 200% beyond 8 hours
- **These stack.** Night overtime on a holiday = base + 50% (extended) + 50% (night) + 50% (holiday) = 250% of base wage. Is the system calculating this correctly?
- **Flexible working arrangements** (선택적 근로시간제, 탄력적 근로시간제): Some startups use flex time where the 52-hour limit is measured over 2-week or 3-month periods, not weekly. Completely different calculation logic.

**Probation Periods (수습기간):**

- Typically 3 months, but no legal maximum
- During probation: minimum wage can be reduced to 90% for the first 3 months (but only if the employment contract is for 1+ years)
- Probation employees still accrue annual leave
- Dismissal during probation has a lower threshold but still requires legitimate reason

### Recommended Mitigation

1. **Hire a Korean labor law consultant** to review all calculation logic before shipping. Incorrect calculations = legal liability for the client companies.
2. **Start with the simplest case only**: Full-time employees at companies with 50+ staff. Do NOT attempt part-time, flexible schedules, or small-company exemptions in MVP.
3. **Add extensive disclaimers** that the system's calculations are informational and should be verified by HR professionals.
4. **Build a comprehensive test suite** with edge cases validated by a labor law expert.

---

## 3. E-Signature Implementation Has Legal Risk

**Severity: HIGH**

### The Problem

Korea's Electronic Signature Act (전자서명법, amended 2020) establishes two tiers of electronic signatures:

1. **Simple electronic signatures (전자서명)**: Any electronic method of indicating agreement. Broadly accepted, cannot be denied legal effect solely for being electronic.
2. **Certified electronic signatures (공인전자서명 / 인증 전자서명)**: Issued by accredited certification authorities (recognized by KISA - Korea Internet & Security Agency). These carry the same legal weight as handwritten signatures.

**The critical question**: What types of contracts will this system handle?

- **Employment contracts (근로계약서)**: Legally required for all employees. The law does not prohibit e-signatures, but precedent and practice strongly favor certified signatures for employment-related documents.
- **Confidentiality agreements (비밀유지계약서)**: Typically acceptable with simple e-signatures.
- **Non-compete agreements (경쟁금지약정)**: These are contentious in Korean courts. A simple e-signature on a non-compete could be challenged as not meeting the "clear expression of will" standard.

**Additional concerns:**

- **Identity verification**: How do we prove the person who clicked "sign" is actually the employee? Just being logged into a Google OAuth session is weak identity verification for legal documents. Korea has strong identity verification infrastructure (본인인증) via phone number, i-PIN, or certificate-based methods.
- **Audit trail requirements**: The system must maintain a tamper-proof audit trail (timestamp, IP address, device info, document hash) to defend the signature's validity if challenged.
- **Document integrity**: The signed document must be immutable. If it is stored in Firestore and someone with admin access modifies it, the entire e-signature is void.

### Recommended Mitigation

1. **Do NOT claim legal equivalence with handwritten signatures** in the MVP. Position it as a convenience tool for internal documentation, with a disclaimer to consult legal counsel for legally binding documents.
2. **Integrate with a Korean certified e-signature provider** (e.g., Korean government's certified services, or commercial providers like OneSign, NiceCert) for employment contracts.
3. **Implement proper audit trails**: hash the document at signing time, store the hash separately, log all metadata.
4. **Consider descoping e-contracts from MVP entirely** and replacing with a simpler "document management" module. Building legally defensible e-signatures is a product in itself.

---

## 4. Firebase Security Model Is Dangerous for HR Data

**Severity: HIGH**

### The Problem

**Client-side Firebase SDK exposes configuration:**
Firebase config (API key, project ID, etc.) is embedded in client-side JavaScript. While Google says this is "by design" and API keys alone do not grant access, it exposes the attack surface. Combined with Firestore security rules, this creates a fragile security model.

**Firestore security rules are notoriously hard to get right:**
- Rules are written in a custom DSL, not a standard language
- No unit testing framework that catches all edge cases (Firebase emulator helps but is not comprehensive)
- A single missing condition can expose an entire collection
- Rules cannot call external services or do complex lookups
- Rules have a maximum evaluation depth and complexity limit
- **HR data is among the most sensitive data a company holds**: salaries, personal ID numbers (주민등록번호), bank accounts, disciplinary records, health information

**Korean Personal Information Protection Act (개인정보보호법, PIPA) compliance:**
- PIPA is Korea's equivalent of GDPR, and in some ways stricter
- HR systems process **sensitive personal information** (민감정보): health data, political opinions, criminal records
- Requirements include:
  - Explicit consent for collection, with specific purposes stated
  - Data minimization -- only collect what is necessary
  - Right to access, correct, and delete personal data
  - Data breach notification to PIPC within 72 hours
  - **Mandatory privacy impact assessment** for systems processing personal information of 50,000+ people
  - **Data localization**: Personal information of Korean residents should be stored in Korea or in countries with adequate data protection (Firebase's default region may not comply)
  - **Appointment of a Data Protection Officer (DPO)** for organizations meeting certain thresholds
- Penalties: Up to 5% of related revenue or 5 billion KRW

**Firebase data residency:**
Firebase Firestore allows region selection, but some Firebase services (Auth, FCM) may process data outside Korea. This could violate PIPA data localization requirements for sensitive personal information.

### Recommended Mitigation

1. **Move sensitive data (주민등록번호, bank accounts, salary) to server-side only.** Never expose these through client-side Firestore queries. Use Next.js API routes with Firebase Admin SDK exclusively for sensitive data.
2. **Implement row-level security** through API routes, not Firestore rules alone. Firestore rules should be the last line of defense, not the only line.
3. **Ensure Firebase region is set to `asia-northeast3` (Seoul)** for all services that support it.
4. **Conduct a PIPA compliance review** before launch. Budget for a legal/compliance consultant.
5. **Never store 주민등록번호 (Korean national ID) in Firestore.** This number requires special handling under Korean law. If needed, use a separate encrypted store.
6. **Implement comprehensive audit logging** for all data access -- PIPA requires demonstrating who accessed what personal data and when.

---

## 5. MVP Scope Is Too Ambitious

**Severity: HIGH**

### The Problem

Four full modules in an MVP is not an MVP -- it is a v1.0 product. Consider the actual complexity:

| Module | Apparent Complexity | Actual Complexity |
|--------|-------------------|-------------------|
| Member/Org Management | Simple CRUD | Org hierarchy, role-based access, department transfers, employment history tracking, profile photo management, search/filter |
| Attendance Management | Check-in/out buttons | 52-hour compliance engine, overtime calculation with stacking premiums, flexible schedule support, leave accrual engine, holiday calendar, monthly/quarterly reports, real-time dashboards |
| E-Contracts | Template + signature | Template engine, variable substitution, PDF generation, e-signature flow, document storage, version management, legal audit trail, expiry tracking |
| Workflows/E-Approval | Submit + approve | Dynamic approval chains, parallel/sequential approval, delegation, escalation, notification system, document attachment, approval history, rejection with comments |

Each of these modules is a **product in itself**. Companies like flex.team, Shiftee (시프티), and JANDI (잔디) each focus on ONE of these areas and have teams of 20+ engineers.

### The Math

Assuming a small team (2-3 developers):
- Member/Org Management (basic): 2-3 weeks
- Attendance with Korean labor law compliance: 4-6 weeks
- E-Contracts with any legal validity: 4-6 weeks
- Workflows/E-Approval: 3-5 weeks
- Auth, layout, infrastructure: 2-3 weeks
- Testing, bug fixes, polish: 3-4 weeks

**Total: 18-27 weeks (4.5-7 months)**

That is not an MVP timeline. An MVP should ship in 4-6 weeks maximum.

### Recommended Mitigation

**Cut to 2 modules for true MVP:**

**Option A (Recommended): Member Management + Attendance**
- These are the most immediately useful
- Attendance is the highest-pain point for Korean startups (52-hour compliance pressure)
- Defers the legally risky e-contracts module
- Defers the architecturally complex workflow module

**Option B: Member Management + Workflows**
- If the target users care more about approval processes
- Simpler legal requirements
- But less differentiated (many workflow tools already exist)

E-Contracts should be a Phase 2 feature after legal review. Workflows can be Phase 2 or 3.

---

## 6. Firebase Vendor Lock-in

**Severity: MEDIUM**

### The Problem

Firebase is deeply integrated:
- **Auth**: Google OAuth via Firebase Auth. User records, session tokens, custom claims all in Firebase.
- **Database**: Firestore. All data models, queries, real-time listeners tightly coupled.
- **Storage**: Firebase Storage for documents.
- **Hosting**: Firebase Hosting for deployment.

If at any point the team realizes Firebase is wrong (see Section 1), migration costs are enormous:
- Every query must be rewritten (Firestore queries are nothing like SQL)
- Auth migration requires re-authenticating all users
- Security model must be completely redesigned
- Real-time listener logic must be replaced

**There is no gradual migration path.** You are all-in or all-out.

### Recommended Mitigation

1. **If staying with Firebase**: Build a data access layer (repository pattern) that abstracts Firestore queries. Never call Firestore directly from components. This at least isolates the blast radius.
2. **Seriously consider Supabase**: Same DX, same auth/storage/realtime features, but with PostgreSQL underneath. Migration later is far simpler (it is just PostgreSQL). Self-hosting is possible if needed.
3. **At minimum**: Abstract the auth layer so switching from Firebase Auth to another provider does not require rewriting every component.

---

## 7. Real-Time Features Are Overengineered for HR

**Severity: MEDIUM**

### The Problem

Firebase's primary selling point is real-time synchronization. But does an HR system actually need real-time?

- **Member profiles**: Change maybe once a quarter. No need for real-time.
- **Attendance**: Check-in/out happens once or twice a day. An admin dashboard can refresh every 30 seconds with a simple poll.
- **Contracts**: Created and signed over days/weeks. No real-time needed.
- **Approvals**: Notifications are important, but push notifications or polling every 30 seconds is sufficient.

The team is paying the complexity cost of real-time (Firestore listeners, snapshot management, offline cache, conflict resolution) for a use case that does not need it. This adds:
- More complex state management
- Higher Firestore read costs (every listener re-reads on every change)
- Harder debugging (race conditions, stale data)
- More complex security rules (listeners vs. one-time reads have different rule evaluation)

### Recommended Mitigation

Use standard REST API patterns (Next.js API routes + SWR/React Query for caching) for most features. Reserve real-time listeners only for the approval notification bell icon, if even that.

---

## 8. Missing Critical Features for Korean HR

**Severity: MEDIUM**

### The Problem

The MVP is missing features that Korean companies consider essential:

1. **Payroll Integration (급여 연동)**: Attendance data is useless without connecting to payroll. Korean payroll involves:
   - Income tax withholding (근로소득세)
   - Four mandatory insurances: National Pension (국민연금, 9.5% in 2026), Health Insurance (건강보험), Employment Insurance (고용보험), Industrial Accident Insurance (산재보험)
   - Year-end tax settlement (연말정산)
   - Without payroll integration, HR managers still need to manually transfer attendance data to their payroll system

2. **Organizational Announcements (공지사항)**: Every Korean company intranet has this. Without it, the tool feels incomplete.

3. **Employee Self-Service**: Employees need to view their own attendance records, remaining leave balance, and contract status. The MVP seems admin-focused.

4. **Certificate Issuance (각종 증명서 발급)**: Korean employees frequently need employment certificates (재직증명서), salary certificates (급여명세서), and career certificates (경력증명서). This is a high-frequency HR task.

5. **Onboarding/Offboarding Workflows**: Structured processes for new hires (equipment, access, orientation) and departures (exit interview, equipment return, access revocation).

### Recommended Mitigation

Do not add these to MVP. But document them as Phase 2/3 roadmap items and **design the architecture to accommodate them**. Specifically:
- Ensure the attendance data model supports payroll export from day one
- Build the member module with self-service access in mind (role-based views, not admin-only)
- Design the schema so certificate generation can pull the right data later

---

## 9. No Offline or Mobile Strategy

**Severity: MEDIUM**

### The Problem

Many Korean office workers use their phones for check-in/out (especially with flex/remote work post-COVID). The MVP appears to be desktop-web only.

- **Mobile attendance**: Employees need to check in from their phones. A responsive web app may work, but native app features (GPS for location-based check-in, push notifications for overtime warnings) are often expected.
- **Offline handling**: What if the office has spotty internet? Firebase's offline persistence is a feature, but it comes with complexity (conflict resolution, stale data). If using the recommended Supabase/PostgreSQL approach, offline is harder.

### Recommended Mitigation

- **MVP**: Ensure responsive design works on mobile browsers. Do not build a native app.
- **Phase 2**: Consider a PWA (Progressive Web App) for push notifications and basic offline support.
- **Do not promise GPS-based check-in** without solving the privacy implications under PIPA.

---

## 10. Testing and Quality Assurance Gaps

**Severity: MEDIUM**

### The Problem

The current plan has a QA task (#7) but no evidence of:
- **Labor law calculation test suite**: The most legally dangerous code (leave accrual, overtime calculation, 52-hour compliance) needs exhaustive testing with edge cases validated by a legal expert.
- **Security testing**: Firestore security rules need comprehensive testing. The Firebase emulator helps but does not catch all production edge cases.
- **PIPA compliance testing**: Data access patterns need to be audited.
- **Load testing**: Firestore has per-document write limits (1 write/second per document). If 200 employees check in within a 5-minute window, that is fine for individual documents but could hit rate limits on counters or aggregation documents.

### Recommended Mitigation

1. Create a dedicated test suite for all Korean labor law calculations with at least 50 edge cases.
2. Write Firestore security rule tests for every collection.
3. Conduct a security review before launch.
4. Test concurrent usage patterns (morning check-in rush).

---

## 11. Competitive Landscape Is Crowded

**Severity: LOW**

### The Problem

The Korean HR SaaS market already has established players:
- **flex (플렉스)**: Comprehensive HR platform, well-funded, dominant in Korean startups
- **Shiftee (시프티)**: Attendance and scheduling focused
- **JANDI (잔디)**: Communication + light HR
- **Kakao Work**: Enterprise communication with HR features
- **NHR (니어HR)**: Full HR suite

These companies have:
- Years of Korean labor law edge case handling
- Dedicated legal and compliance teams
- Established customer bases and integrations
- Mobile apps

### Recommended Mitigation

This is acceptable if the product targets a specific niche (e.g., very small startups that find flex too expensive, or internal use only). But be realistic about the competitive landscape. The product needs a clear differentiator beyond "we built our own."

---

## Summary: Risk Heat Map

| # | Issue | Severity | Effort to Fix | Recommendation |
|---|-------|----------|---------------|----------------|
| 1 | Firestore is wrong DB for HR | **CRITICAL** | High (requires replatform) | Switch to Supabase/PostgreSQL |
| 2 | Korean labor law underestimated | **CRITICAL** | Medium (scope reduction + legal review) | Cut scope, hire legal consultant |
| 3 | E-signature legal risk | **HIGH** | Medium (descope or integrate provider) | Defer to Phase 2 or integrate certified provider |
| 4 | Firebase security + PIPA compliance | **HIGH** | Medium (architecture changes) | Server-side sensitive data, Seoul region, compliance review |
| 5 | MVP scope too ambitious | **HIGH** | Low (just cut scope) | Cut to 2 modules |
| 6 | Firebase vendor lock-in | **MEDIUM** | Low (repository pattern) | Abstract data layer, consider Supabase |
| 7 | Real-time is overengineered | **MEDIUM** | Low (use REST instead) | REST + SWR for most features |
| 8 | Missing critical HR features | **MEDIUM** | Low (design for extensibility) | Document roadmap, design schema accordingly |
| 9 | No mobile/offline strategy | **MEDIUM** | Low (responsive design) | Mobile-responsive MVP, PWA later |
| 10 | Testing gaps | **MEDIUM** | Medium (build test suites) | Dedicated labor law test suite |
| 11 | Crowded market | **LOW** | N/A | Define clear differentiator |

---

## Top 3 Recommendations (If I Could Change Only Three Things)

### 1. Switch from Firebase/Firestore to Supabase/PostgreSQL
This single change eliminates issues #1, #6, #7, and partially #4. PostgreSQL is the right tool for relational, query-heavy, compliance-critical HR data. Supabase provides equivalent DX (auth, realtime, storage) with the power of SQL.

### 2. Cut MVP to 2 Modules: Member Management + Attendance
Ship something useful in 4-6 weeks instead of something half-baked in 6 months. Defer e-contracts (legal risk) and workflows (complexity) to Phase 2.

### 3. Budget for a Korean Labor Law Legal Review
Before any attendance calculations go to production, have a labor law attorney validate every formula, every edge case, every threshold. The legal liability of incorrect calculations falls on the client companies using this tool. Getting this wrong is not a bug -- it is a lawsuit.

---

*This analysis is intentionally pessimistic. Not every concern will materialize. But the CRITICAL items (#1 and #2) represent genuine risks that should be addressed before writing code, not after.*
