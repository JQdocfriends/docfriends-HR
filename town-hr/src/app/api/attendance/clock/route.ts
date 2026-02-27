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

export async function POST(request: NextRequest) {
  try {
    const uid = await getAuthenticatedUid(request);
    const { action, memberId, lunchBreakMinutes = 60 } = await request.json();

    if (!action || !memberId) {
      return NextResponse.json(
        { error: "action and memberId are required" },
        { status: 400 }
      );
    }

    // Ensure users can only clock in/out for themselves
    if (uid !== memberId) {
      return NextResponse.json(
        { error: "Cannot clock in/out for another member" },
        { status: 403 }
      );
    }

    const db = getAdminDb();
    const today = new Date().toISOString().split("T")[0];
    const docId = `${memberId}_${today}`;
    const docRef = db.collection("attendance_records").doc(docId);

    if (action === "clock-in") {
      const existing = await docRef.get();
      if (existing.exists) {
        return NextResponse.json(
          { error: "Already clocked in today" },
          { status: 409 }
        );
      }

      await docRef.set({
        memberId,
        date: today,
        checkInTime: FieldValue.serverTimestamp(),
        checkOutTime: null,
        workMinutes: null,
        overtimeMinutes: 0,
        status: "present",
        modifiedBy: null,
        modifiedReason: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ status: "clocked-in", docId });
    }

    if (action === "clock-out") {
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return NextResponse.json(
          { error: "No clock-in record found for today" },
          { status: 404 }
        );
      }

      const data = docSnap.data()!;
      if (data.checkOutTime) {
        return NextResponse.json(
          { error: "Already clocked out today" },
          { status: 409 }
        );
      }

      const checkInTime = data.checkInTime as FirebaseFirestore.Timestamp;
      const now = Date.now();
      const totalMinutes = Math.floor(
        (now - checkInTime.toMillis()) / 60000
      );
      const workMinutes = Math.max(0, totalMinutes - lunchBreakMinutes);
      const standardMinutes = 8 * 60;
      const overtimeMinutes = Math.max(0, workMinutes - standardMinutes);

      await docRef.update({
        checkOutTime: FieldValue.serverTimestamp(),
        workMinutes,
        overtimeMinutes,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Recompute weekly summary after clock-out
      const weeklySummary = await recomputeWeeklySummary(db, memberId, today);

      return NextResponse.json({
        status: "clocked-out",
        docId,
        workMinutes,
        overtimeMinutes,
        weeklySummary,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'clock-in' or 'clock-out'" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Attendance clock error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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

async function recomputeWeeklySummary(
  db: FirebaseFirestore.Firestore,
  memberId: string,
  today: string
) {
  const { weekStart, weekEnd } = getWeekBounds(today);
  const snapshot = await db
    .collection("attendance_records")
    .where("memberId", "==", memberId)
    .where("date", ">=", weekStart)
    .where("date", "<=", weekEnd)
    .orderBy("date", "asc")
    .get();

  const dailyBreakdown: Record<string, number> = {};
  const dailyMinutes: number[] = [];
  snapshot.docs.forEach((d) => {
    const rec = d.data();
    const minutes = rec.workMinutes ?? 0;
    dailyBreakdown[rec.date] = minutes;
    dailyMinutes.push(minutes);
  });

  const result = calculateWeeklyTotal(dailyMinutes);
  const warningLevel = getOvertimeWarningLevel(result.totalWorkMinutes);
  const summaryId = `${memberId}_${weekStart}`;
  await db.collection("attendance_weekly_summaries").doc(summaryId).set({
    memberId,
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    totalWorkMinutes: result.totalWorkMinutes,
    totalOvertimeMinutes: result.totalOvertimeMinutes,
    dailyBreakdown,
    isOverLimit: result.isOverLimit,
    alertSent: false,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return {
    totalWorkMinutes: result.totalWorkMinutes,
    totalOvertimeMinutes: result.totalOvertimeMinutes,
    isOverLimit: result.isOverLimit,
    remainingMinutes: result.remainingMinutes,
    warningLevel,
  };
}
