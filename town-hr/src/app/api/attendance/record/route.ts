import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuthenticatedUid } from "@/lib/api/auth-helpers";
import {
  calculateWeeklyTotal,
  getOvertimeWarningLevel,
} from "@/lib/utils/work-hours";

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
  date: string
) {
  const { weekStart, weekEnd } = getWeekBounds(date);
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
  await db
    .collection("attendance_weekly_summaries")
    .doc(summaryId)
    .set(
      {
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
      },
      { merge: true }
    );

  return {
    totalWorkMinutes: result.totalWorkMinutes,
    totalOvertimeMinutes: result.totalOvertimeMinutes,
    isOverLimit: result.isOverLimit,
    remainingMinutes: result.remainingMinutes,
    warningLevel,
  };
}

function minutesToTimestamp(date: string, minutesSinceMidnight: number): Timestamp {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setHours(Math.floor(minutesSinceMidnight / 60));
  d.setMinutes(minutesSinceMidnight % 60);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return Timestamp.fromDate(d);
}

// POST: create or update an attendance record
export async function POST(request: NextRequest) {
  try {
    const uid = await getAuthenticatedUid();
    if (!uid) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const {
      memberId,
      date,
      checkInMinutes,
      checkOutMinutes,
      recordId,
      lunchBreakMinutes = 60,
    } = body;

    if (!memberId || !date || checkInMinutes == null || checkOutMinutes == null) {
      return NextResponse.json(
        { error: "memberId, date, checkInMinutes, checkOutMinutes are required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Check permissions: self or admin/manager
    if (uid !== memberId) {
      const memberDoc = await db.collection("members").doc(uid).get();
      if (!memberDoc.exists) {
        return NextResponse.json({ error: "구성원 정보를 찾을 수 없습니다" }, { status: 403 });
      }
      const role = memberDoc.data()!.role;
      if (role !== "admin" && role !== "manager") {
        return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
      }
    }

    const docId = recordId ?? `${memberId}_${date}`;
    const docRef = db.collection("attendance_records").doc(docId);

    const checkInTime = minutesToTimestamp(date, checkInMinutes);
    const checkOutTime = minutesToTimestamp(date, checkOutMinutes);
    const totalMinutes = checkOutMinutes - checkInMinutes;
    const workMinutes = Math.max(0, totalMinutes - lunchBreakMinutes);
    const overtimeMinutes = Math.max(0, workMinutes - 8 * 60);

    const existing = await docRef.get();
    if (existing.exists) {
      await docRef.update({
        checkInTime,
        checkOutTime,
        workMinutes,
        overtimeMinutes,
        status: "present",
        modifiedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await docRef.set({
        memberId,
        date,
        checkInTime,
        checkOutTime,
        workMinutes,
        overtimeMinutes,
        status: "present",
        modifiedBy: uid,
        modifiedReason: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const weeklySummary = await recomputeWeeklySummary(db, memberId, date);

    return NextResponse.json({
      status: existing.exists ? "updated" : "created",
      docId,
      workMinutes,
      overtimeMinutes,
      weeklySummary,
    });
  } catch (error) {
    console.error("Attendance record POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: remove an attendance record
export async function DELETE(request: NextRequest) {
  try {
    const uid = await getAuthenticatedUid();
    if (!uid) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const { recordId, memberId } = body;

    if (!recordId || !memberId) {
      return NextResponse.json(
        { error: "recordId and memberId are required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Check permissions: self or admin/manager
    if (uid !== memberId) {
      const memberDoc = await db.collection("members").doc(uid).get();
      if (!memberDoc.exists) {
        return NextResponse.json({ error: "구성원 정보를 찾을 수 없습니다" }, { status: 403 });
      }
      const role = memberDoc.data()!.role;
      if (role !== "admin" && role !== "manager") {
        return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
      }
    }

    const docRef = db.collection("attendance_records").doc(recordId);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const date = existing.data()!.date as string;
    await docRef.delete();

    const weeklySummary = await recomputeWeeklySummary(db, memberId, date);

    return NextResponse.json({ status: "deleted", recordId, weeklySummary });
  } catch (error) {
    console.error("Attendance record DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
