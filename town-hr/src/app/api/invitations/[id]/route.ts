import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminOrManager, AuthError } from "@/lib/api/auth-helpers";
import { FieldValue } from "firebase-admin/firestore";

// DELETE /api/invitations/[id] - Cancel a pending invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrManager();

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
        { error: "보류 중인 초대만 취소할 수 있습니다" },
        { status: 400 }
      );
    }

    await invitationRef.update({
      status: "cancelled",
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
    console.error("Invitation cancel error:", error);
    return NextResponse.json(
      { error: "초대 취소 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
