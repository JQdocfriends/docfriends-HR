import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// Korean holidays to skip (Lunar New Year 2026)
const KOREAN_HOLIDAYS_2026 = new Set(["2026-01-27", "2026-01-28", "2026-01-29"]);

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(dateStr: string): boolean {
  return KOREAN_HOLIDAYS_2026.has(dateStr);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekdaysBetween(startStr: string, endStr: string): string[] {
  const result: string[] = [];
  const current = new Date(startStr + "T00:00:00Z");
  const end = new Date(endStr + "T00:00:00Z");
  while (current <= end) {
    const dateStr = formatDate(current);
    if (!isWeekend(current) && !isHoliday(dateStr)) {
      result.push(dateStr);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return result;
}

function getWeekBounds(dateStr: string): { weekStart: string; weekEnd: string } {
  // Parse as UTC to avoid TZ issues with date arithmetic
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay(); // 0=Sun, 1=Mon...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { weekStart: formatDate(monday), weekEnd: formatDate(sunday) };
}

// Generate a random integer in [min, max] inclusive
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface DailyRecord {
  date: string;
  checkInTime: Timestamp;
  checkOutTime: Timestamp;
  workMinutes: number;
  overtimeMinutes: number;
  status: "present" | "half_day" | "absent";
}

function buildAttendanceRecords(uid: string, weekdays: string[]): DailyRecord[] {
  // Designate special days: 2 half-days and 1 absent
  const shuffled = [...weekdays].sort(() => Math.random() - 0.5);
  const halfDayDates = new Set([shuffled[0], shuffled[1]]);
  const absentDate = shuffled[2];

  return weekdays.map((dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);

    if (dateStr === absentDate) {
      // Absent: no check-in/out, work 0
      const midnight = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      const ts = Timestamp.fromDate(midnight);
      return {
        date: dateStr,
        checkInTime: ts,
        checkOutTime: ts,
        workMinutes: 0,
        overtimeMinutes: 0,
        status: "absent" as const,
      };
    }

    if (halfDayDates.has(dateStr)) {
      // Half day: ~4 hours, check-in 09:00, check-out 13:30
      const checkInHour = 9;
      const checkInMin = randInt(0, 10);
      const checkOutHour = 13;
      const checkOutMin = randInt(20, 40);

      // KST = UTC+9, so subtract 9 hours for UTC storage
      const checkIn = new Date(Date.UTC(y, m - 1, d, checkInHour - 9, checkInMin, 0));
      const checkOut = new Date(Date.UTC(y, m - 1, d, checkOutHour - 9, checkOutMin, 0));
      const totalMinutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000);
      const workMinutes = Math.max(0, totalMinutes - 30); // 30 min lunch for half day
      const overtimeMinutes = 0;

      return {
        date: dateStr,
        checkInTime: Timestamp.fromDate(checkIn),
        checkOutTime: Timestamp.fromDate(checkOut),
        workMinutes,
        overtimeMinutes,
        status: "half_day" as const,
      };
    }

    // Determine check-out category: 70% normal, 25% overtime, 5% late night
    const roll = Math.random();
    let checkOutHour: number;
    let checkOutMin: number;

    if (roll < 0.70) {
      // Normal: 17:50 – 18:20
      checkOutHour = 17 + Math.floor(randInt(50, 80) / 60);
      checkOutMin = randInt(50, 80) % 60;
      // Simpler: pick from 17:50..18:20
      const totalCheckOutMinutes = randInt(17 * 60 + 50, 18 * 60 + 20);
      checkOutHour = Math.floor(totalCheckOutMinutes / 60);
      checkOutMin = totalCheckOutMinutes % 60;
    } else if (roll < 0.95) {
      // Overtime: 18:30 – 19:30
      const totalCheckOutMinutes = randInt(18 * 60 + 30, 19 * 60 + 30);
      checkOutHour = Math.floor(totalCheckOutMinutes / 60);
      checkOutMin = totalCheckOutMinutes % 60;
    } else {
      // Late night: 20:00+
      const totalCheckOutMinutes = randInt(20 * 60, 21 * 60 + 30);
      checkOutHour = Math.floor(totalCheckOutMinutes / 60);
      checkOutMin = totalCheckOutMinutes % 60;
    }

    // Check-in: 08:50 – 09:20 KST
    const totalCheckInMinutes = randInt(8 * 60 + 50, 9 * 60 + 20);
    const checkInHour = Math.floor(totalCheckInMinutes / 60);
    const checkInMin = totalCheckInMinutes % 60;

    // Store as UTC (KST - 9h)
    const checkIn = new Date(Date.UTC(y, m - 1, d, checkInHour - 9, checkInMin, 0));
    const checkOut = new Date(Date.UTC(y, m - 1, d, checkOutHour - 9, checkOutMin, 0));

    const totalMinutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000);
    const workMinutes = Math.max(0, totalMinutes - 60); // 60 min lunch
    const overtimeMinutes = Math.max(0, workMinutes - 480); // 8h standard

    return {
      date: dateStr,
      checkInTime: Timestamp.fromDate(checkIn),
      checkOutTime: Timestamp.fromDate(checkOut),
      workMinutes,
      overtimeMinutes,
      status: "present" as const,
    };
  });
}

interface WeeklySummaryData {
  weekStart: string;
  weekEnd: string;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  dailyBreakdown: Record<string, number>;
  isOverLimit: boolean;
}

function buildWeeklySummaries(records: DailyRecord[]): Map<string, WeeklySummaryData> {
  const weekMap = new Map<string, WeeklySummaryData>();

  for (const rec of records) {
    const { weekStart, weekEnd } = getWeekBounds(rec.date);
    const key = weekStart;

    if (!weekMap.has(key)) {
      weekMap.set(key, {
        weekStart,
        weekEnd,
        totalWorkMinutes: 0,
        totalOvertimeMinutes: 0,
        dailyBreakdown: {},
        isOverLimit: false,
      });
    }

    const summary = weekMap.get(key)!;
    summary.dailyBreakdown[rec.date] = rec.workMinutes;
    summary.totalWorkMinutes += rec.workMinutes;
    summary.totalOvertimeMinutes += rec.overtimeMinutes;
    summary.isOverLimit = summary.totalWorkMinutes > 2400; // 40h limit
  }

  return weekMap;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const sessionCookie = request.cookies.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie);
    const uid = decoded.uid;

    const db = getAdminDb();
    const memberDoc = await db.collection("members").doc(uid).get();
    if (!memberDoc.exists || memberDoc.data()!.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    // 2. Delete existing data first
    const collectionsToClean = [
      "attendance_records",
      "attendance_weekly_summaries",
      "leave_requests",
      "leave_balances",
    ];

    for (const collName of collectionsToClean) {
      const snap = await db
        .collection(collName)
        .where("memberId", "==", uid)
        .get();
      if (!snap.empty) {
        const deleteBatch = db.batch();
        snap.docs.forEach((doc) => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();
      }
    }

    // 3. Fetch leave policies
    const leavePoliciesSnap = await db.collection("leave_policies").get();
    let annualPolicyId: string | null = null;
    let sickPolicyId: string | null = null;

    for (const doc of leavePoliciesSnap.docs) {
      const data = doc.data();
      if (data.type === "annual" && !annualPolicyId) annualPolicyId = doc.id;
      if (data.type === "sick" && !sickPolicyId) sickPolicyId = doc.id;
    }

    const hasLeavePolicies = annualPolicyId !== null && sickPolicyId !== null;

    // 4. Build attendance data
    const weekdays = getWeekdaysBetween("2026-01-06", "2026-02-28");
    const dailyRecords = buildAttendanceRecords(uid, weekdays);
    const weeklySummaries = buildWeeklySummaries(dailyRecords);

    // 5. Write all data in batches (Firestore limit: 500 per batch)
    // Attendance records (~40) + weekly summaries (~8) + leave requests (5) + balances (2) = well under 500
    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    // Attendance records
    for (const rec of dailyRecords) {
      const docId = `${uid}_${rec.date}`;
      const docRef = db.collection("attendance_records").doc(docId);

      if (rec.status === "absent") {
        batch.set(docRef, {
          memberId: uid,
          date: rec.date,
          checkInTime: null,
          checkOutTime: null,
          workMinutes: 0,
          overtimeMinutes: 0,
          status: "absent",
          modifiedBy: null,
          modifiedReason: null,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        batch.set(docRef, {
          memberId: uid,
          date: rec.date,
          checkInTime: rec.checkInTime,
          checkOutTime: rec.checkOutTime,
          workMinutes: rec.workMinutes,
          overtimeMinutes: rec.overtimeMinutes,
          status: rec.status,
          modifiedBy: null,
          modifiedReason: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Weekly summaries
    for (const [weekStart, summary] of weeklySummaries) {
      const summaryId = `${uid}_${weekStart}`;
      const summaryRef = db.collection("attendance_weekly_summaries").doc(summaryId);
      batch.set(summaryRef, {
        memberId: uid,
        weekStartDate: summary.weekStart,
        weekEndDate: summary.weekEnd,
        totalWorkMinutes: summary.totalWorkMinutes,
        totalOvertimeMinutes: summary.totalOvertimeMinutes,
        dailyBreakdown: summary.dailyBreakdown,
        isOverLimit: summary.isOverLimit,
        alertSent: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Leave requests and balances (only if policies exist)
    const leaveWarnings: string[] = [];

    if (!hasLeavePolicies) {
      leaveWarnings.push(
        "No leave policies found. Skipping leave requests and leave balances."
      );
    } else {
      // Leave requests
      const leaveRequests = [
        {
          policyId: annualPolicyId!,
          startDate: "2026-01-15",
          endDate: "2026-01-16",
          days: 2,
          reason: "가족 행사",
          status: "approved" as const,
          approverId: uid,
          approverComment: null,
          processedAt: Timestamp.fromDate(new Date("2026-01-14T09:00:00Z")),
          createdAt: Timestamp.fromDate(new Date("2026-01-13T08:00:00Z")),
        },
        {
          policyId: annualPolicyId!,
          startDate: "2026-02-12",
          endDate: "2026-02-13",
          days: 2,
          reason: "개인 사유",
          status: "approved" as const,
          approverId: uid,
          approverComment: null,
          processedAt: Timestamp.fromDate(new Date("2026-02-11T10:00:00Z")),
          createdAt: Timestamp.fromDate(new Date("2026-02-10T09:00:00Z")),
        },
        {
          policyId: sickPolicyId!,
          startDate: "2026-02-05",
          endDate: "2026-02-05",
          days: 1,
          reason: "병원 방문",
          status: "approved" as const,
          approverId: uid,
          approverComment: null,
          processedAt: Timestamp.fromDate(new Date("2026-02-04T16:00:00Z")),
          createdAt: Timestamp.fromDate(new Date("2026-02-04T15:00:00Z")),
        },
        {
          policyId: annualPolicyId!,
          startDate: "2026-03-20",
          endDate: "2026-03-20",
          days: 1,
          reason: "개인 일정",
          status: "pending" as const,
          approverId: null,
          approverComment: null,
          processedAt: null,
          createdAt: Timestamp.fromDate(new Date("2026-03-01T10:00:00Z")),
        },
        {
          policyId: annualPolicyId!,
          startDate: "2026-03-05",
          endDate: "2026-03-05",
          days: 1,
          reason: "개인 사유",
          status: "rejected" as const,
          approverId: uid,
          approverComment: "해당 기간 프로젝트 마감으로 불가합니다",
          processedAt: Timestamp.fromDate(new Date("2026-02-28T14:00:00Z")),
          createdAt: Timestamp.fromDate(new Date("2026-02-27T09:00:00Z")),
        },
      ];

      for (const req of leaveRequests) {
        const leaveRef = db.collection("leave_requests").doc();
        batch.set(leaveRef, {
          memberId: uid,
          policyId: req.policyId,
          startDate: req.startDate,
          endDate: req.endDate,
          days: req.days,
          reason: req.reason,
          attachmentUrls: [],
          status: req.status,
          approverId: req.approverId,
          approverComment: req.approverComment,
          processedAt: req.processedAt ?? null,
          createdAt: req.createdAt ?? now,
          updatedAt: now,
        });
      }

      // Leave balances
      const jan1_2026 = Timestamp.fromDate(new Date("2026-01-01T00:00:00Z"));
      const dec31_2026 = Timestamp.fromDate(new Date("2026-12-31T23:59:59Z"));

      const annualBalanceRef = db.collection("leave_balances").doc();
      batch.set(annualBalanceRef, {
        memberId: uid,
        year: 2026,
        policyId: annualPolicyId!,
        granted: 15,
        used: 5,
        pending: 1,
        remaining: 9,
        grantedAt: jan1_2026,
        grantReason: "2026년 연차 부여",
        expiresAt: dec31_2026,
        createdAt: now,
        updatedAt: now,
      });

      const sickBalanceRef = db.collection("leave_balances").doc();
      batch.set(sickBalanceRef, {
        memberId: uid,
        year: 2026,
        policyId: sickPolicyId!,
        granted: 30,
        used: 1,
        pending: 0,
        remaining: 29,
        grantedAt: jan1_2026,
        grantReason: "2026년 연차 부여",
        expiresAt: dec31_2026,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 6. Commit batch
    await batch.commit();

    // 7. Return summary
    return NextResponse.json({
      success: true,
      summary: {
        attendanceRecords: dailyRecords.length,
        weeklySummaries: weeklySummaries.size,
        leaveRequests: hasLeavePolicies ? 5 : 0,
        leaveBalances: hasLeavePolicies ? 2 : 0,
        memberId: uid,
        dateRange: "2026-01-06 to 2026-02-28",
        warnings: leaveWarnings.length > 0 ? leaveWarnings : undefined,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Seed dummy data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
