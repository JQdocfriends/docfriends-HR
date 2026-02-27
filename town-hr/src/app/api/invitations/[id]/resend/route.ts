import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminOrManager, AuthError } from "@/lib/api/auth-helpers";
import { sendInvitationEmail } from "@/lib/email/send-invitation";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/invitations/[id]/resend - Resend invitation email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { memberName } = await requireAdminOrManager();

    const { id } = await params;
    const adminDb = getAdminDb();
    const invitationRef = adminDb.collection("invitations").doc(id);
    const invitationDoc = await invitationRef.get();

    if (!invitationDoc.exists) {
      return NextResponse.json(
        { error: "초대를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const invitation = invitationDoc.data()!;
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "보류 중인 초대만 재발송할 수 있습니다" },
        { status: 400 }
      );
    }

    // Refresh expiry
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Get company name
    const companyDoc = await adminDb.doc("company/settings").get();
    const companyName = companyDoc.exists
      ? companyDoc.data()?.name || "타운"
      : "타운";

    // Send email
    const emailResult = await sendInvitationEmail({
      to: invitation.email,
      token: invitation.token,
      invitedByName: memberName,
      companyName,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "이메일 발송에 실패했습니다" },
        { status: 500 }
      );
    }

    // Update expiry
    await invitationRef.update({
      expiresAt: newExpiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ status: "success" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Invitation resend error:", error);
    return NextResponse.json(
      { error: "초대 재발송 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
