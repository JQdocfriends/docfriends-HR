import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminOrManager, AuthError } from "@/lib/api/auth-helpers";
import { sendInvitationEmail } from "@/lib/email/send-invitation";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/invitations - Create and send invitations
export async function POST(request: NextRequest) {
  try {
    const { uid, memberName } = await requireAdminOrManager();

    const body = await request.json();
    const { invitations } = body as {
      invitations: Array<{
        email: string;
        role: string;
        departmentId?: string;
      }>;
    };

    if (!invitations || !Array.isArray(invitations) || invitations.length === 0) {
      return NextResponse.json(
        { error: "초대할 이메일 목록이 필요합니다" },
        { status: 400 }
      );
    }

    if (invitations.length > 50) {
      return NextResponse.json(
        { error: "한 번에 최대 50명까지 초대할 수 있습니다" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Get company name
    const companyDoc = await adminDb.doc("company/settings").get();
    const companyName = companyDoc.exists
      ? companyDoc.data()?.name || "타운"
      : "타운";

    const results: Array<{ email: string; success: boolean; error?: string }> =
      [];

    for (const invite of invitations) {
      const email = invite.email?.trim().toLowerCase();

      // Validate email format
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({
          email: invite.email,
          success: false,
          error: "유효하지 않은 이메일 형식입니다",
        });
        continue;
      }

      // Validate role
      const validRoles = ["admin", "manager", "employee"];
      if (!validRoles.includes(invite.role)) {
        results.push({
          email,
          success: false,
          error: "유효하지 않은 역할입니다",
        });
        continue;
      }

      try {
        // Check if already a member
        const membersSnap = await adminDb
          .collection("members")
          .where("email", "==", email)
          .limit(1)
          .get();

        if (!membersSnap.empty) {
          results.push({
            email,
            success: false,
            error: "이미 등록된 구성원입니다",
          });
          continue;
        }

        // Check for existing pending invitation
        const existingInvite = await adminDb
          .collection("invitations")
          .where("email", "==", email)
          .where("status", "==", "pending")
          .limit(1)
          .get();

        if (!existingInvite.empty) {
          results.push({
            email,
            success: false,
            error: "이미 보류 중인 초대가 있습니다",
          });
          continue;
        }

        // Create invitation
        const token = crypto.randomUUID();
        const now = FieldValue.serverTimestamp();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const invitationData = {
          token,
          email,
          role: invite.role,
          departmentId: invite.departmentId || null,
          invitedBy: uid,
          invitedByName: memberName,
          status: "pending",
          acceptedBy: null,
          acceptedAt: null,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        };

        await adminDb.collection("invitations").add(invitationData);

        // Send email
        const emailResult = await sendInvitationEmail({
          to: email,
          token,
          invitedByName: memberName,
          companyName,
        });

        if (!emailResult.success) {
          results.push({
            email,
            success: false,
            error: emailResult.error || "이메일 발송에 실패했습니다",
          });
          continue;
        }

        results.push({ email, success: true });
      } catch (err) {
        console.error(`Failed to invite ${email}:`, err);
        results.push({
          email,
          success: false,
          error: "초대 처리 중 오류가 발생했습니다",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({ results, successCount, failedCount });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Invitation creation error:", error);
    return NextResponse.json(
      { error: "초대 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// GET /api/invitations - List invitations
export async function GET(request: NextRequest) {
  try {
    await requireAdminOrManager();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const adminDb = getAdminDb();
    let query = adminDb
      .collection("invitations")
      .orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.limit(200).get();

    const invitations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Timestamps to ISO strings for JSON serialization
      expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString() ?? null,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
      acceptedAt: doc.data().acceptedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json({ invitations });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Invitation list error:", error);
    return NextResponse.json(
      { error: "초대 목록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
