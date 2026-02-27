# Town (타운) Technical Research Document

> Research compiled for the Town HR management tool MVP.
> Last updated: 2026-02-26

---

## Table of Contents

- [A. Firebase + Next.js 14 Patterns](#a-firebase--nextjs-14-patterns)
  - [A1. Firebase v10+ Modular SDK with Next.js App Router](#a1-firebase-v10-modular-sdk-with-nextjs-app-router)
  - [A2. Firestore Real-time Listeners in React](#a2-firestore-real-time-listeners-in-react)
  - [A3. Firebase Auth with Google OAuth](#a3-firebase-auth-with-google-oauth)
  - [A4. Firebase Storage File Upload](#a4-firebase-storage-file-upload)
  - [A5. Firebase Admin SDK in Next.js Route Handlers](#a5-firebase-admin-sdk-in-nextjs-route-handlers)
- [B. Korean Labor Law (근로기준법)](#b-korean-labor-law-근로기준법)
  - [B1. 52-Hour Work Week (주 52시간제)](#b1-52-hour-work-week-주-52시간제)
  - [B2. Annual Leave (연차) Calculation](#b2-annual-leave-연차-calculation)
  - [B3. Mandatory Leave Provisions (연차 사용 촉진)](#b3-mandatory-leave-provisions-연차-사용-촉진)
  - [B4. Public Holidays (공휴일)](#b4-public-holidays-공휴일)
  - [B5. Night / Weekend / Holiday Work Premiums](#b5-night--weekend--holiday-work-premiums)
  - [B6. Other Leave Types](#b6-other-leave-types)
  - [B7. 2025-2026 Updates](#b7-2025-2026-updates)
- [C. shadcn/ui Patterns for Enterprise Apps](#c-shadcnui-patterns-for-enterprise-apps)
  - [C1. Data Table with TanStack Table](#c1-data-table-with-tanstack-table)
  - [C2. Complex Forms (react-hook-form + zod)](#c2-complex-forms-react-hook-form--zod)
  - [C3. Date/Time Pickers for Attendance](#c3-datetime-pickers-for-attendance)
  - [C4. File Upload Components](#c4-file-upload-components)

---

## A. Firebase + Next.js 14 Patterns

### A1. Firebase v10+ Modular SDK with Next.js App Router

#### Server vs Client Component Boundary

The Firebase Client SDK (v10+ modular) is designed for browser environments. In Next.js 14 App Router, components are **Server Components by default**, so Firebase client SDK usage must be in `"use client"` components.

**Key rule:** Firebase Client SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`) = Client Components only. Firebase Admin SDK (`firebase-admin`) = Server Components and Route Handlers only.

#### Firebase Client Config (Client-Side)

```typescript
// lib/firebase/config.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton pattern: prevent re-initialization in HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

#### Environment Variables

```bash
# .env.local
# Public (accessible in browser — NEXT_PUBLIC_ prefix required)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Private (server-only — NO NEXT_PUBLIC_ prefix)
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

#### File Structure Recommendation

```
lib/
  firebase/
    config.ts          # Client SDK initialization (singleton)
    admin.ts           # Admin SDK initialization (server-only)
    auth.ts            # Auth helper functions
    firestore.ts       # Firestore helper functions
    storage.ts         # Storage helper functions
```

**Sources:**
- [Firebase + Next.js Codelab (Official)](https://firebase.google.com/codelabs/firebase-nextjs)
- [Firebase Firestore Setup with Next.js 14](https://mydevpa.ge/blog/how-to-setup-firebase-firestore-with-nextjs-14)
- [Next.js 14 with Firebase Walkthrough](https://dev.to/wadizaatour/integrating-nextjs-with-firebase-a-practical-walkthrough-4j30)

---

### A2. Firestore Real-time Listeners in React

#### Custom Hook Pattern for onSnapshot

```typescript
// hooks/useFirestoreCollection.ts
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  FirestoreError,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface UseFirestoreCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: FirestoreError | null;
}

export function useFirestoreCollection<T extends DocumentData>(
  collectionPath: string,
  constraints: QueryConstraint[] = []
): UseFirestoreCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    const q = query(collection(db, collectionPath), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(docs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup: detach listener on unmount
    return () => unsubscribe();
  }, [collectionPath]); // Re-subscribe when path changes

  return { data, loading, error };
}
```

#### Handling Document Changes (added/modified/removed)

```typescript
onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      // New document
    }
    if (change.type === "modified") {
      // Updated document
    }
    if (change.type === "removed") {
      // Deleted document
    }
  });
});
```

#### Single Document Listener

```typescript
// hooks/useFirestoreDocument.ts
"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export function useFirestoreDocument<T extends DocumentData>(
  collectionPath: string,
  documentId: string | null
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, collectionPath, documentId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setData({ id: snapshot.id, ...snapshot.data() } as T);
      } else {
        setData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionPath, documentId]);

  return { data, loading };
}
```

#### Key Considerations

- **Latency compensation:** Firestore's `onSnapshot` fires immediately with locally cached data before server confirmation, providing optimistic UI.
- **Memory management:** Always return the `unsubscribe()` function from `useEffect` cleanup.
- **Cost:** Each document read in a listener counts as a read. Use query constraints (`where`, `limit`, `orderBy`) to minimize reads.

**Sources:**
- [Firebase onSnapshot Documentation (Official)](https://firebase.google.com/docs/firestore/query-data/listen)
- [React Hooks with Firebase Firestore](https://blog.logrocket.com/how-to-use-react-hooks-firebase-firestore/)
- [Real-time Data with Firebase and React Hooks](https://dev.to/itselftools/seamlessly-fetch-data-in-real-time-with-firebase-and-react-hooks-2g5)

---

### A3. Firebase Auth with Google OAuth

#### Recommended Approach: next-firebase-auth-edge

For Next.js 14+ App Router, the **`next-firebase-auth-edge`** library is the recommended approach. It supports Edge Runtime (where `firebase-admin` cannot run) and handles auth entirely through middleware.

```bash
npm install next-firebase-auth-edge
```

**Key features:**
- Edge Runtime compatible (uses Web Crypto API, not Node.js crypto)
- Zero client-side bundle impact
- Automatic token refresh on Google certificate expiration
- Middleware-based — no custom API routes needed
- Works with Server Components, Server Actions, App Router

#### Implementation Architecture

**1. Firebase Client Auth (sign-in/sign-out)**

```typescript
// lib/firebase/auth.ts
"use client";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<string> {
  const result = await signInWithPopup(auth, googleProvider);
  // Get the ID token to send to server for session creation
  const idToken = await result.user.getIdToken();
  return idToken;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
```

**2. Session Cookie via Server Action**

```typescript
// actions/auth-actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function createSession(idToken: string) {
  const cookieStore = await cookies();
  cookieStore.set("session", idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
    sameSite: "lax",
  });
  redirect("/dashboard");
}

export async function removeSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
```

**3. Middleware for Route Protection**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/members", "/attendance", "/contracts", "/approvals"];
const publicRoutes = ["/login", "/"];

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes
  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from login
  if (publicRoutes.includes(pathname) && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**4. Auth Context Provider (Client)**

```typescript
// providers/AuthProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChanged } from "@/lib/firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**Sources:**
- [next-firebase-auth-edge (GitHub)](https://github.com/awinogrodzki/next-firebase-auth-edge)
- [Next.js 14 Firebase Auth with Cookies/Middleware](https://dev.to/yutakusuno/nextjs14-firebase-authentication-with-google-sign-in-using-cookies-middleware-and-server-actions-48h4)
- [Firebase Auth Setup with Next.js 14](https://mydevpa.ge/blog/how-to-setup-firebase-auth-with-nextjs-14)

---

### A4. Firebase Storage File Upload

#### Upload with Progress Tracking

```typescript
// lib/firebase/storage.ts
"use client";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask,
} from "firebase/storage";
import { storage } from "@/lib/firebase/config";

interface UploadResult {
  downloadURL: string;
  fullPath: string;
}

interface UploadCallbacks {
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: UploadResult) => void;
}

export function uploadFile(
  file: File,
  storagePath: string,
  callbacks?: UploadCallbacks
): UploadTask {
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      callbacks?.onProgress?.(progress);
    },
    (error) => {
      callbacks?.onError?.(error);
    },
    async () => {
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      callbacks?.onComplete?.({
        downloadURL,
        fullPath: uploadTask.snapshot.ref.fullPath,
      });
    }
  );

  return uploadTask; // Can be used to pause/resume/cancel
}
```

#### Upload Controls (Pause/Resume/Cancel)

```typescript
const uploadTask = uploadFile(file, `contracts/${companyId}/${file.name}`, {
  onProgress: (p) => setProgress(p),
  onComplete: (result) => setUrl(result.downloadURL),
});

// Pause
uploadTask.pause();

// Resume
uploadTask.resume();

// Cancel
uploadTask.cancel();
```

#### Storage Path Structure for Town HR

```
storage/
  companies/{companyId}/
    contracts/{contractId}/{filename}     # E-Contract documents
    profiles/{employeeId}/photo.jpg       # Employee profile photos
    approvals/{approvalId}/{filename}     # Approval attachments
    templates/{templateId}/{filename}     # Contract templates
```

**Sources:**
- [Firebase Storage Upload Files (Official)](https://firebase.google.com/docs/storage/web/upload-files)
- [Firebase Cloud Storage with React](https://blog.logrocket.com/firebase-cloud-storage-firebase-v9-react/)

---

### A5. Firebase Admin SDK in Next.js Route Handlers

#### Admin SDK Initialization (Server-Only Singleton)

```typescript
// lib/firebase/admin.ts
import "server-only";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function formatPrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY!),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  return adminApp;
}

export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());
export const adminStorage = getStorage(getAdminApp());
```

#### Usage in Route Handlers

```typescript
// app/api/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    // Verify the session token
    const session = request.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(session);
    const uid = decodedToken.uid;

    // Fetch data with Admin SDK (bypasses security rules)
    const membersSnapshot = await adminDb
      .collection("companies")
      .doc(decodedToken.companyId)
      .collection("members")
      .get();

    const members = membersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

#### Usage in Server Components

```typescript
// app/dashboard/page.tsx
import { adminDb } from "@/lib/firebase/admin";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    redirect("/login");
  }

  const statsSnapshot = await adminDb
    .collection("companies")
    .doc("company-id")
    .collection("stats")
    .doc("dashboard")
    .get();

  const stats = statsSnapshot.data();

  return <DashboardClient stats={stats} />;
}
```

#### Security Best Practices

1. **`import "server-only"`** at the top of admin files prevents accidental client-side bundling
2. **Never expose** `FIREBASE_PRIVATE_KEY` or `FIREBASE_CLIENT_EMAIL` to the client (no `NEXT_PUBLIC_` prefix)
3. **Always verify** the session token before performing Admin operations
4. **Use Admin SDK** for sensitive operations (role changes, bulk deletes, data exports)
5. **Use Client SDK** for real-time listeners and user-facing CRUD (governed by Security Rules)

**Sources:**
- [Firebase Admin SDK with Next.js 13+](https://www.jamesshopland.com/blog/nextjs-firebase-admin-sdk/)
- [Initialize Firebase Admin with Next.js](https://makerkit.dev/blog/tutorials/initialize-firebase-admin-nextjs)
- [Using Firebase Admin with Next.js](https://rishi.app/blog/using-firebase-admin-with-next-js/)

---

## B. Korean Labor Law (근로기준법)

> **DISCLAIMER:** This section is for development reference only. It is NOT legal advice. Always consult a licensed Korean labor attorney or the Ministry of Employment and Labor (고용노동부) for authoritative guidance. Incorrect calculations carry legal liability.

### B1. 52-Hour Work Week (주 52시간제)

**Legal basis:** Labor Standards Act (근로기준법) Articles 50-53

#### Working Hours Limits

| Category | Hours | Legal Basis |
|----------|-------|-------------|
| Regular work week | 40 hours (8 hrs/day x 5 days) | Art. 50 |
| Maximum overtime | 12 hours/week | Art. 53 |
| **Maximum total** | **52 hours/week** | Art. 50 + 53 |

#### Rules

- **Applies to:** All businesses with 5+ employees (since July 2021, phased enforcement completed)
- **Consent required:** Overtime must be agreed upon between employer and employee (Art. 53(1))
- **Violations:** Criminal penalties — fines up to KRW 20 million or imprisonment up to 2 years
- **Special exceptions:** Industries like transportation, healthcare may apply for extended hours with government approval
- **Businesses with fewer than 5 employees:** The 52-hour cap does NOT apply; however, basic working hour provisions still apply

#### Calculation for HR System

```typescript
// Weekly hours tracking
interface WeeklyHours {
  regularHours: number;   // Max 40
  overtimeHours: number;  // Max 12
  totalHours: number;     // Max 52
  nightHours: number;     // 22:00 - 06:00 subset
  holidayHours: number;   // Public/company holiday hours
}

const MAX_REGULAR_HOURS_PER_WEEK = 40;
const MAX_OVERTIME_HOURS_PER_WEEK = 12;
const MAX_TOTAL_HOURS_PER_WEEK = 52;
const MAX_REGULAR_HOURS_PER_DAY = 8;

function isOvertime(weeklyRegularHours: number, dailyHours: number): boolean {
  return weeklyRegularHours > MAX_REGULAR_HOURS_PER_WEEK
    || dailyHours > MAX_REGULAR_HOURS_PER_DAY;
}

function isViolation(totalWeeklyHours: number): boolean {
  return totalWeeklyHours > MAX_TOTAL_HOURS_PER_WEEK;
}
```

**Sources:**
- [Labor Standards Act (English)](https://elaw.klri.re.kr/eng_service/lawView.do?hseq=68845&lang=ENG)
- [South Korea Working Hours & Overtime Regulations](https://www.playroll.com/working-hours/south-korea)
- [Labour Laws in South Korea 2025 Guide](https://asanify.com/blog/labour-laws/labour-laws-in-south-korea-2025-guide/)

---

### B2. Annual Leave (연차) Calculation

**Legal basis:** Labor Standards Act Article 60

#### Year-by-Year Entitlement Table

| Service Period | Leave Days | Formula | Notes |
|---------------|------------|---------|-------|
| 0-1 year (first year) | 1 day/month worked | Monthly accrual | Max 11 days; requires 80%+ attendance per month |
| 1 year completed | 15 days | Base entitlement | Requires 80%+ annual attendance |
| 2 years | 15 days | 15 + 0 | No change |
| 3 years | 16 days | 15 + 1 | +1 day after 2 years beyond year 1 |
| 4 years | 16 days | 15 + 1 | Same tier |
| 5 years | 17 days | 15 + 2 | +1 day |
| 6 years | 17 days | 15 + 2 | Same tier |
| 7 years | 18 days | 15 + 3 | +1 day |
| ... | ... | ... | Pattern continues |
| 21+ years | **25 days (MAX)** | 15 + 10 | Capped |

#### Formula

```
For tenure >= 1 year:
  annualLeaveDays = 15 + Math.floor((tenureYears - 1) / 2)
  annualLeaveDays = Math.min(annualLeaveDays, 25)  // Cap at 25 days

For tenure < 1 year (first year):
  monthlyLeave = 1 day per full month worked (if attendance >= 80%)
  maxFirstYear = 11 days
```

#### Implementation

```typescript
interface AnnualLeaveResult {
  totalDays: number;
  formula: string;
  isFirstYear: boolean;
}

function calculateAnnualLeave(
  startDate: Date,
  referenceDate: Date,
  attendanceRate: number // 0-100
): AnnualLeaveResult {
  const tenureMs = referenceDate.getTime() - startDate.getTime();
  const tenureYears = Math.floor(tenureMs / (365.25 * 24 * 60 * 60 * 1000));
  const tenureMonths = Math.floor(tenureMs / (30.44 * 24 * 60 * 60 * 1000));

  // First year: 1 day per month worked
  if (tenureYears < 1) {
    const days = Math.min(tenureMonths, 11); // Cap at 11
    return {
      totalDays: attendanceRate >= 80 ? days : 0,
      formula: `${tenureMonths} months * 1 day = ${days} days (first year)`,
      isFirstYear: true,
    };
  }

  // 80% attendance requirement for full annual leave
  if (attendanceRate < 80) {
    return {
      totalDays: 0,
      formula: "Attendance below 80% — no annual leave entitlement",
      isFirstYear: false,
    };
  }

  // After first year: 15 + floor((years - 1) / 2), capped at 25
  const additionalDays = Math.floor((tenureYears - 1) / 2);
  const totalDays = Math.min(15 + additionalDays, 25);

  return {
    totalDays,
    formula: `15 + floor((${tenureYears} - 1) / 2) = ${totalDays} days`,
    isFirstYear: false,
  };
}
```

#### Important Notes

- **First year deduction:** Days used in the first year (monthly accrual) are deducted from the 15 days granted after completing 1 year. E.g., if employee used 8 monthly-accrued days in year 1, they get 15 - 8 = 7 days for year 2.
- **80% attendance requirement:** An employee who fails to meet 80% attendance in a given year receives no annual leave for the following year (Art. 60(1)).
- **Unused leave:** Forfeited at end of year (use-it-or-lose-it) unless company policy allows carryover. Upon termination, unused leave must be paid out.
- **Half-day leave (반차):** Not legally mandated, but widely practiced. HR systems should support 0.5-day increments.

**Sources:**
- [Labor Standards Act Article 60](https://elaw.klri.re.kr/eng_service/lawView.do?hseq=68845&lang=ENG)
- [South Korea Leave Policy 2026 Compliance Guide](https://ayp-group.com/blog/leave-policy-in-south-korea)
- [South Korea Leave Laws](https://vacationtracker.io/leave-laws/asia/south-korea/)
- [Korean Leave System Guide](https://kowork.kr/en/blog/LeaveSystem)

---

### B3. Mandatory Leave Provisions (연차 사용 촉진)

**Legal basis:** Labor Standards Act Article 61

Employers have a legal obligation to promote the use of annual leave. If they follow the prescribed notice procedure, they are exempt from paying unused leave compensation.

#### Employer Notification Process

1. **First notice (6 months before expiration):** Employer must notify each employee in writing of the number of unused leave days and request they submit a leave usage plan.
2. **Employee response (10 days):** Employee must submit their leave usage plan within 10 days.
3. **Second notice (if employee fails to respond):** Employer must designate specific dates for the employee to use remaining leave and notify them in writing by at least 2 months before expiration.

#### Effect on HR System

```typescript
interface LeavePromotionStatus {
  employeeId: string;
  leaveYear: number;
  unusedDays: number;
  firstNoticeDate: Date | null;   // Must be 6+ months before expiry
  employeePlanSubmitted: boolean;
  secondNoticeDate: Date | null;  // Must be 2+ months before expiry
  designatedDates: Date[];        // Employer-assigned leave dates
  promotionCompleted: boolean;    // If true, employer exempt from payout
}
```

**Key rule for developers:** The system must track these notification dates. If the employer follows the full process, they do NOT have to compensate unused leave. If they fail to follow it, they MUST pay out unused leave.

**Sources:**
- [Labor Standards Act Article 61](https://elaw.klri.re.kr/eng_service/lawView.do?hseq=68845&lang=ENG)
- [South Korea Leave Policy Compliance Guide](https://ayp-group.com/blog/leave-policy-in-south-korea)

---

### B4. Public Holidays (공휴일)

**Legal basis:** 관공서의 공휴일에 관한 규정 (Presidential Decree on Public Office Holidays), applied to private sector via Labor Standards Act Article 55(2) (amended 2021-2022)

#### Official Public Holidays

| Holiday (한국어) | Holiday (English) | Date | Notes |
|---|---|---|---|
| 신정 | New Year's Day | January 1 | Fixed |
| 설날 | Seollal (Lunar New Year) | Lunar 1/1 | **3 days** (day before, day of, day after) |
| 삼일절 | Independence Movement Day | March 1 | Fixed |
| 어린이날 | Children's Day | May 5 | Fixed |
| 부처님 오신 날 | Buddha's Birthday | Lunar 4/8 | Varies yearly |
| 현충일 | Memorial Day | June 6 | Fixed |
| 광복절 | Liberation Day | August 15 | Fixed |
| 추석 | Chuseok (Korean Thanksgiving) | Lunar 8/15 | **3 days** (day before, day of, day after) |
| 개천절 | National Foundation Day | October 3 | Fixed |
| 한글날 | Hangul Day | October 9 | Fixed |
| 성탄절 | Christmas | December 25 | Fixed |
| 선거일 | Election Day | Varies | When national/local elections occur |

**Total: 15-16 days per year** (counting multi-day holidays)

#### Substitute Holidays (대체공휴일)

Since 2021-2023 amendments, if any of the following holidays falls on a Saturday or Sunday, the next business day becomes a substitute holiday:

- Seollal (설날) — since 2014
- Chuseok (추석) — since 2014
- Children's Day (어린이날) — since 2014
- Independence Movement Day (삼일절) — since August 2021
- Liberation Day (광복절) — since August 2021
- National Foundation Day (개천절) — since August 2021
- Hangul Day (한글날) — since August 2021
- Buddha's Birthday (부처님 오신 날) — since March 2023
- Christmas (성탄절) — since March 2023

#### For HR System Implementation

```typescript
// Public holidays should be maintained as a yearly configuration
// Lunar dates change each year — use a Korean lunar calendar library

interface PublicHoliday {
  date: Date;
  name: string;
  nameKo: string;
  isSubstituteHoliday: boolean;
  originalDate?: Date; // If substitute, what was the original date
}

// Recommended: Use a Korean holiday API or library
// Options: korean-lunar-calendar, korean-holidays npm packages
// Or maintain a Firestore collection: /config/holidays/{year}
```

**Sources:**
- [Korea Public Holidays 2026](https://superkts.com/day/holiday/2026)
- [South Korea Public Holidays Wikipedia](https://en.wikipedia.org/wiki/Public_holidays_in_South_Korea)
- [Korea Herald: 2026 Holiday Calendar](https://www.koreaherald.com/article/10648348)

---

### B5. Night / Weekend / Holiday Work Premiums

**Legal basis:** Labor Standards Act Article 56

#### Premium Pay Rates

| Work Type | Premium Rate | Total Pay | Legal Basis |
|-----------|-------------|-----------|-------------|
| Regular overtime (연장근로) | +50% | 150% of ordinary wage | Art. 56(1) |
| Night work (야간근로, 22:00-06:00) | +50% | 150% of ordinary wage | Art. 56(1) |
| Holiday work ≤ 8 hours (휴일근로) | +50% | 150% of ordinary wage | Art. 56(2) |
| Holiday work > 8 hours (휴일근로) | +100% | 200% of ordinary wage | Art. 56(2) |

#### Cumulative Premium Rules

Premiums are **cumulative** (additive), not exclusive:

| Scenario | Calculation | Total Rate |
|----------|-------------|------------|
| Regular overtime only | 100% + 50% | **150%** |
| Night work only (within regular hours) | 100% + 50% | **150%** |
| Overtime + night work | 100% + 50% (OT) + 50% (night) | **200%** |
| Holiday work ≤ 8hrs | 100% + 50% (holiday) | **150%** |
| Holiday work > 8hrs | 100% + 100% (holiday OT) | **200%** |
| Holiday + night work ≤ 8hrs | 100% + 50% (holiday) + 50% (night) | **200%** |
| Holiday overtime > 8hrs + night | 100% + 100% (holiday OT) + 50% (night) | **250%** |

#### Implementation

```typescript
type WageMultiplier = number; // 1.0 = 100%

interface WorkSegment {
  startTime: Date;
  endTime: Date;
  isHoliday: boolean;
}

function calculateWageMultiplier(
  segment: WorkSegment,
  weeklyRegularHoursUsed: number,
  dailyRegularHoursUsed: number,
  holidayHoursWorked: number // hours already worked on this holiday
): WageMultiplier {
  let multiplier = 1.0; // Base rate

  // Check if overtime (over 8hrs/day or 40hrs/week)
  const isOvertime =
    dailyRegularHoursUsed >= 8 || weeklyRegularHoursUsed >= 40;
  if (isOvertime) {
    multiplier += 0.5; // +50% for overtime
  }

  // Check if night work (22:00 - 06:00)
  const hour = segment.startTime.getHours();
  const isNightWork = hour >= 22 || hour < 6;
  if (isNightWork) {
    multiplier += 0.5; // +50% for night work
  }

  // Check if holiday work
  if (segment.isHoliday) {
    if (holidayHoursWorked <= 8) {
      multiplier += 0.5; // +50% for holiday work ≤ 8hrs
    } else {
      multiplier += 1.0; // +100% for holiday work > 8hrs
    }
  }

  return multiplier; // Can be 1.0, 1.5, 2.0, or 2.5
}
```

**Sources:**
- [South Korea Working Hours & Overtime (Playroll)](https://www.playroll.com/working-hours/south-korea)
- [Overtime Regulations (Atlas HXM)](https://www.atlashxm.com/resources/navigating-south-korea-overtime-regulations-what-employers-need-to-know)
- [Working Hours, Overtime, and Rest (Remoly)](https://remoly.net/blog-detail/653)
- [Labor Laws in Korea (KOTRA)](https://www.investkorea.org/file/ik-en/252025Labor_Laws_in_Korea.pdf)

---

### B6. Other Leave Types

| Leave Type | Duration | Paid? | Legal Basis |
|-----------|----------|-------|-------------|
| **Maternity leave (출산전후휴가)** | 90 days (120 for multiples) | Yes — 60 days employer, 30 days government | Art. 74 |
| **Paternity leave (배우자 출산휴가)** | 10 days | Yes — 5 employer, 5 government | Art. 18-2 |
| **Parental leave (육아휴직)** | Up to 1 year per parent | 80% of wage (EI), min KRW 700K, max KRW 1.5M/month | Art. 19 (Equal Employment Act) |
| **3+3 Parental leave** | First 3 months if both parents | 100% of wage (enhanced) | 2022 amendment |
| **Family care leave (가족돌봄휴가)** | 10 days/year (short-term) | Unpaid | Art. 22-2 |
| **Family care leave (long-term)** | 90 days/year | Unpaid | Art. 22-2 |
| **Sick leave (병가)** | Not legally mandated | N/A | Company policy |
| **Bereavement (경조사)** | Not legally mandated | N/A | Company policy (typically 3-7 days) |
| **Menstrual leave (생리휴가)** | 1 day/month | Unpaid (unless company policy says otherwise) | Art. 73 |

**Note for HR system:** While sick leave and bereavement are not legally required, most Korean companies offer them through internal policy. The system should be configurable to support company-specific leave types.

**Sources:**
- [South Korea Leave Laws (Vacation Tracker)](https://vacationtracker.io/leave-laws/asia/south-korea/)
- [Leave Entitlements in South Korea (Playroll)](https://www.playroll.com/leave/south-korea)
- [South Korea Employment 2025 (Chambers)](https://practiceguides.chambers.com/practice-guides/employment-2025/south-korea/trends-and-developments)

---

### B7. 2025-2026 Updates

| Change | Effective Date | Details |
|--------|---------------|---------|
| **Minimum wage increase** | Jan 2025: KRW 10,030/hr; Jan 2026: KRW 10,320/hr | ~2.9% increase in 2026 |
| **Pension contribution increase** | Jan 2026: 9.5% total (4.75% each) | Previously 9%; increasing 0.5%/year to reach 13% by 2033 |
| **Family support strengthening** | 2025 | Enhanced parental leave and family care provisions |
| **Substitute holiday expansion** | Since 2023 | Buddha's Birthday and Christmas now eligible for substitute holidays |

**Sources:**
- [South Korea Labour Law Changes 2025](https://www.beyondbordershr.com/south-korea-labour-law-changes-2025/)
- [Employment 2025 South Korea (Chambers)](https://practiceguides.chambers.com/practice-guides/employment-2025/south-korea/trends-and-developments)

---

## C. shadcn/ui Patterns for Enterprise Apps

### C1. Data Table with TanStack Table

#### Installation

```bash
npx shadcn@latest add table
npm install @tanstack/react-table
```

#### Recommended File Structure

```
components/
  data-table/
    data-table.tsx          # Generic DataTable component
    data-table-toolbar.tsx  # Search, filters, view options
    data-table-pagination.tsx
    columns/
      member-columns.tsx    # Member-specific columns
      attendance-columns.tsx
      contract-columns.tsx
      approval-columns.tsx
```

#### Generic Data Table Component

```typescript
// components/data-table/data-table.tsx
"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div>
      {/* Toolbar / Search */}
      {searchKey && (
        <div className="flex items-center py-4">
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```

#### Sortable Column Header

```typescript
import { Column } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
}: DataTableColumnHeaderProps<TData, TValue>) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}
```

**Sources:**
- [shadcn/ui Data Table Documentation](https://ui.shadcn.com/docs/components/radix/data-table)
- [Enterprise Data Table with TanStack and shadcn/ui](https://next.jqueryscript.net/shadcn-ui/enterprise-data-table-tanstack/)
- [Advanced shadcn Table: Server-Side Sort, Filter, Paginate](https://next.jqueryscript.net/shadcn-ui/advanced-shadcn-table/)
- [tablecn (GitHub)](https://github.com/sadmann7/tablecn)

---

### C2. Complex Forms (react-hook-form + zod)

#### Installation

```bash
npx shadcn@latest add form input select textarea checkbox
npm install @hookform/resolvers zod
```

#### Form Schema with Zod (Employee Profile Example)

```typescript
// schemas/member.ts
import { z } from "zod";

export const memberFormSchema = z.object({
  // Basic info
  name: z.string().min(1, "이름을 입력해주세요"),
  nameEn: z.string().optional(),
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  phone: z
    .string()
    .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, "올바른 전화번호를 입력해주세요"),

  // Employment info
  departmentId: z.string().min(1, "부서를 선택해주세요"),
  position: z.string().min(1, "직급을 선택해주세요"),
  employmentType: z.enum(["full-time", "part-time", "contract", "intern"], {
    required_error: "고용 형태를 선택해주세요",
  }),
  startDate: z.date({ required_error: "입사일을 선택해주세요" }),
  endDate: z.date().optional(),

  // Salary info
  baseSalary: z.number().min(0, "급여는 0 이상이어야 합니다"),

  // Bank account
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
}).superRefine((data, ctx) => {
  // Cross-field validation: contract type must have end date
  if (data.employmentType === "contract" && !data.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "계약직은 계약 종료일을 입력해야 합니다",
      path: ["endDate"],
    });
  }
  // End date must be after start date
  if (data.endDate && data.endDate <= data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "종료일은 시작일 이후여야 합니다",
      path: ["endDate"],
    });
  }
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
```

#### Form Component Pattern

```typescript
// components/forms/member-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { memberFormSchema, MemberFormValues } from "@/schemas/member";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface MemberFormProps {
  defaultValues?: Partial<MemberFormValues>;
  onSubmit: (values: MemberFormValues) => Promise<void>;
}

export function MemberForm({ defaultValues, onSubmit }: MemberFormProps) {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      employmentType: "full-time",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input placeholder="홍길동" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="employmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>고용 형태</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="고용 형태 선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="full-time">정규직</SelectItem>
                  <SelectItem value="part-time">파트타임</SelectItem>
                  <SelectItem value="contract">계약직</SelectItem>
                  <SelectItem value="intern">인턴</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "저장 중..." : "저장"}
        </Button>
      </form>
    </Form>
  );
}
```

#### Array Fields (useFieldArray) for Dynamic Forms

```typescript
import { useFieldArray } from "react-hook-form";

// Example: Approval chain with multiple approvers
const approvalSchema = z.object({
  title: z.string().min(1),
  approvers: z.array(
    z.object({
      employeeId: z.string().min(1),
      order: z.number(),
      role: z.enum(["approver", "reviewer", "final-approver"]),
    })
  ).min(1, "최소 1명의 결재자가 필요합니다"),
});

function ApprovalForm() {
  const form = useForm({ resolver: zodResolver(approvalSchema) });
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "approvers",
  });

  return (
    <>
      {fields.map((field, index) => (
        <div key={field.id}>
          <FormField name={`approvers.${index}.employeeId`} ... />
          <Button onClick={() => remove(index)}>삭제</Button>
        </div>
      ))}
      <Button onClick={() => append({ employeeId: "", order: fields.length, role: "approver" })}>
        결재자 추가
      </Button>
    </>
  );
}
```

**Sources:**
- [shadcn/ui Form Documentation](https://ui.shadcn.com/docs/forms/react-hook-form)
- [Advanced React Hook Form + Zod + shadcn](https://wasp.sh/blog/2025/01/22/advanced-react-hook-form-zod-shadcn)
- [Zod Validation with React Hook Form](https://www.freecodecamp.org/news/react-form-validation-zod-react-hook-form/)
- [Multi-Step Forms with React Hook Form + Zustand](https://www.buildwithmatija.com/blog/master-multi-step-forms-build-a-dynamic-react-form-in-6-simple-steps)

---

### C3. Date/Time Pickers for Attendance

#### Installation

```bash
npx shadcn@latest add calendar popover button
npm install date-fns
```

#### Date Picker Component

```typescript
// components/ui/date-picker.tsx
"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
}

export function DatePicker({ date, onSelect, placeholder = "날짜 선택" }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "yyyy년 MM월 dd일", { locale: ko }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          locale={ko}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
```

#### Time Picker for Check-in/Check-out

```typescript
// components/ui/time-picker.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TimePickerProps {
  value: string; // "HH:mm" format
  onChange: (value: string) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label>{label}</Label>}
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[150px]"
      />
    </div>
  );
}
```

#### Date Range Picker (for attendance reports)

```typescript
// components/ui/date-range-picker.tsx
"use client";

import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { ko } from "date-fns/locale";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
}

export function DateRangePicker({ dateRange, onSelect }: DateRangePickerProps) {
  return (
    <Calendar
      mode="range"
      selected={dateRange}
      onSelect={onSelect}
      numberOfMonths={2}
      locale={ko}
    />
  );
}
```

**Sources:**
- [shadcn/ui Calendar Component](https://ui.shadcn.com/docs/components/radix/calendar)
- [shadcn/ui Date Picker](https://ui.shadcn.com/docs/components/radix/date-picker)

---

### C4. File Upload Components

#### Drag-and-Drop File Upload

```typescript
// components/ui/file-upload.tsx
"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept?: string; // e.g., ".pdf,.doc,.docx"
  maxSizeMB?: number;
  onUpload: (file: File) => Promise<string>; // Returns download URL
  onRemove?: () => void;
}

export function FileUpload({
  accept = ".pdf,.doc,.docx,.png,.jpg",
  maxSizeMB = 10,
  onUpload,
  onRemove,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) await processFile(file);
    },
    [onUpload]
  );

  const processFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다`);
      return;
    }
    setError(null);
    try {
      const url = await onUpload(file);
      setUploadedFile(file.name);
    } catch (err) {
      setError("파일 업로드에 실패했습니다");
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        error && "border-destructive"
      )}
    >
      {uploadedFile ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{uploadedFile}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            파일을 드래그하거나 클릭하여 업로드
          </p>
          <input
            type="file"
            accept={accept}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </>
      )}
      {progress > 0 && progress < 100 && <Progress value={progress} className="mt-2" />}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
```

#### Integration with Firebase Storage

```typescript
// Usage example: Contract upload
import { uploadFile } from "@/lib/firebase/storage";
import { FileUpload } from "@/components/ui/file-upload";

function ContractUploadForm({ contractId }: { contractId: string }) {
  const handleUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      uploadFile(
        file,
        `contracts/${contractId}/${file.name}`,
        {
          onProgress: (p) => console.log(`${p}%`),
          onComplete: (result) => resolve(result.downloadURL),
          onError: (err) => reject(err),
        }
      );
    });
  };

  return (
    <FileUpload
      accept=".pdf,.doc,.docx"
      maxSizeMB={20}
      onUpload={handleUpload}
    />
  );
}
```

**Sources:**
- [shadcn/ui Progress Component](https://ui.shadcn.com/docs/components/radix/progress)
- [Firebase Storage Upload with React](https://blog.logrocket.com/firebase-cloud-storage-firebase-v9-react/)
- [File Uploads with Next.js and Firebase (GitHub)](https://github.com/bmedrano011/File-Uploads-Storage-NextJS-Firebase)

---

## Summary: Key Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `next` | Framework | 14.x+ |
| `react` / `react-dom` | UI library | 18.x |
| `firebase` | Client SDK (Auth, Firestore, Storage) | 10.x+ |
| `firebase-admin` | Server SDK | 12.x+ |
| `next-firebase-auth-edge` | Edge-compatible auth middleware | latest |
| `@tanstack/react-table` | Headless table | 8.x |
| `react-hook-form` | Form management | 7.x |
| `@hookform/resolvers` | Zod resolver for react-hook-form | 3.x |
| `zod` | Schema validation | 3.x |
| `date-fns` | Date utilities + Korean locale | 3.x |
| `tailwindcss` | Utility CSS | 3.x |
| `shadcn/ui` | Component library | latest |
| `lucide-react` | Icons | latest |
| `server-only` | Prevent server code in client bundle | latest |

---

## References

### Firebase / Next.js
- [Firebase + Next.js Codelab (Official)](https://firebase.google.com/codelabs/firebase-nextjs)
- [Firebase Hosting Next.js Integration (Official)](https://firebase.google.com/docs/hosting/frameworks/nextjs)
- [Firestore Real-time Listeners (Official)](https://firebase.google.com/docs/firestore/query-data/listen)
- [Firebase Storage Upload (Official)](https://firebase.google.com/docs/storage/web/upload-files)
- [next-firebase-auth-edge](https://github.com/awinogrodzki/next-firebase-auth-edge)
- [Firebase Admin SDK with Next.js](https://www.jamesshopland.com/blog/nextjs-firebase-admin-sdk/)

### Korean Labor Law
- [Labor Standards Act (English Translation)](https://elaw.klri.re.kr/eng_service/lawView.do?hseq=68845&lang=ENG)
- [Payroll in Korea Guide 2025-2026 (Ian Labor Law)](https://www.ianhr.com/en/guidetopayrollinkorea/)
- [South Korea Labour Laws Guide (Asanify)](https://asanify.com/blog/labour-laws/labour-laws-in-south-korea-2025-guide/)
- [South Korea Leave Laws (Vacation Tracker)](https://vacationtracker.io/leave-laws/asia/south-korea/)
- [Leave Policy Compliance Guide (AYP Group)](https://ayp-group.com/blog/leave-policy-in-south-korea)
- [Korean Leave System (Kowork)](https://kowork.kr/en/blog/LeaveSystem)
- [South Korea Working Hours (Playroll)](https://www.playroll.com/working-hours/south-korea)
- [Korea Overtime Regulations (Atlas HXM)](https://www.atlashxm.com/resources/navigating-south-korea-overtime-regulations-what-employers-need-to-know)
- [Labor Laws in Korea (KOTRA/InvestKorea)](https://www.investkorea.org/file/ik-en/252025Labor_Laws_in_Korea.pdf)

### shadcn/ui
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table)
- [shadcn/ui Form](https://ui.shadcn.com/docs/forms/react-hook-form)
- [Advanced Forms with React Hook Form + Zod + shadcn](https://wasp.sh/blog/2025/01/22/advanced-react-hook-form-zod-shadcn)
- [tablecn - Server-side shadcn table](https://github.com/sadmann7/tablecn)
