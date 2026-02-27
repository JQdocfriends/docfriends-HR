import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

// GET /api/invitations/verify?token=xxx - Public endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "토큰이 필요합니다" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection("invitations")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { valid: false, error: "초대 링크가 유효하지 않습니다" },
        { status: 404 }
      );
    }

    const invitation = snapshot.docs[0].data();

    if (invitation.status === "accepted") {
      return NextResponse.json(
        { valid: false, error: "이미 수락된 초대입니다" },
        { status: 409 }
      );
    }

    if (invitation.status === "cancelled") {
      return NextResponse.json(
        { valid: false, error: "취소된 초대입니다" },
        { status: 410 }
      );
    }

    // Check expiry
    const expiresAt = invitation.expiresAt?.toDate?.() ?? new Date(invitation.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        {
          valid: false,
          error: "초대가 만료되었습니다. 관리자에게 재초대를 요청하세요",
        },
        { status: 410 }
      );
    }

    // Mask email: show first 2 chars + mask + domain
    const email = invitation.email;
    const [localPart, domain] = email.split("@");
    const maskedEmail =
      localPart.length <= 2
        ? localPart + "***@" + domain
        : localPart.slice(0, 2) + "***@" + domain;

    // Get company name
    const companyDoc = await adminDb.doc("company/settings").get();
    const companyName = companyDoc.exists
      ? companyDoc.data()?.name || "타운"
      : "타운";

    return NextResponse.json({
      valid: true,
      email: maskedEmail,
      companyName,
      invitedByName: invitation.invitedByName,
    });
  } catch (error) {
    console.error("Invitation verify error:", error);
    return NextResponse.json(
      { valid: false, error: "초대 확인 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
