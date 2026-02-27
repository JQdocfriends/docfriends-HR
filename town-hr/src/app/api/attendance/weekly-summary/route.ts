import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  calculateWeeklyTotal,
  getOvertimeWarningLevel,
} from "@/lib/utils/work-hours";

async function getAuthenticatedUid(request: NextRequest): Promise<string> {
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) {
    throw new Error("Not authenticated");
  }
  const decoded = await getAdminAuth().verifySessionCookie(sessionCookie);
  return decoded.uid;
}

function getWeekBounds(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

/**
 * GET /api/attendance/weekly-summary?memberId=xxx&date=2026-03-15
 * Returns weekly summary for the given member and week containing the date.
 */
export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUid(request);

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      );
    }

    const { weekStart, weekEnd } = getWeekBounds(date);
    const db = getAdminDb();

    // Check for existing denormalized summary
    const summaryId = `${memberId}_${weekStart}`;
    const existingSummary = await db
      .collection("attendance_weekly_summaries")
      .doc(summaryId)
      .get();

    if (existingSummary.exists) {
      const data = existingSummary.data()!;
      return NextResponse.json({
        ...data,
        id: existingSummary.id,
        warningLevel: getOvertimeWarningLevel(data.totalWorkMinutes),
      });
    }

    // Compute from attendance records
    const summary = await computeWeeklySummary(db, memberId, weekStart, weekEnd);
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Weekly summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attendance/weekly-summary
 * Recompute and persist weekly summary for a member.
 * Called after clock-out to update denormalized data.
 * Body: { memberId, date }
 */
export async function POST(request: NextRequest) {
  try {
    const uid = await getAuthenticatedUid(request);
    const { memberId, date } = await request.json();

    if (!memberId || !date) {
      return NextResponse.json(
        { error: "memberId and date are required" },
        { status: 400 }
      );
    }

    if (uid !== memberId) {
      return NextResponse.json(
        { error: "Cannot compute summary for another member" },
        { status: 403 }
      );
    }

    const { weekStart, weekEnd } = getWeekBounds(date);
    const db = getAdminDb();

    const summary = await computeWeeklySummary(db, memberId, weekStart, weekEnd);

    // Persist denormalized summary
    const summaryId = `${memberId}_${weekStart}`;
    await db
      .collection("attendance_weekly_summaries")
      .doc(summaryId)
      .set(
        {
          memberId,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          totalWorkMinutes: summary.totalWorkMinutes,
          totalOvertimeMinutes: summary.totalOvertimeMinutes,
          dailyBreakdown: summary.dailyBreakdown,
          isOverLimit: summary.isOverLimit,
          alertSent: false,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Weekly summary compute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function computeWeeklySummary(
  db: FirebaseFirestore.Firestore,
  memberId: string,
  weekStart: string,
  weekEnd: string
) {
  const snapshot = await db
    .collection("attendance_records")
    .where("memberId", "==", memberId)
    .where("date", ">=", weekStart)
    .where("date", "<=", weekEnd)
    .orderBy("date", "asc")
    .get();

  const dailyBreakdown: Record<string, number> = {};
  const dailyMinutes: number[] = [];

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const minutes = data.workMinutes ?? 0;
    dailyBreakdown[data.date] = minutes;
    dailyMinutes.push(minutes);
  });

  const weeklyResult = calculateWeeklyTotal(dailyMinutes);
  const warningLevel = getOvertimeWarningLevel(weeklyResult.totalWorkMinutes);

  return {
    memberId,
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    totalWorkMinutes: weeklyResult.totalWorkMinutes,
    totalOvertimeMinutes: weeklyResult.totalOvertimeMinutes,
    dailyBreakdown,
    isOverLimit: weeklyResult.isOverLimit,
    remainingMinutes: weeklyResult.remainingMinutes,
    utilizationPercent: weeklyResult.utilizationPercent,
    warningLevel,
  };
}
