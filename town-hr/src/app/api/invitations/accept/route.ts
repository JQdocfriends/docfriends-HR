import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/invitations/accept - Accept invitation (public pre-auth)
export async function POST(request: NextRequest) {
  try {
    const { token, idToken } = await request.json();

    if (!token || !idToken) {
      return NextResponse.json(
        { error: "토큰과 인증 정보가 필요합니다" },
        { status: 400 }
      );
    }

    // Verify Firebase ID token
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const userEmail = decoded.email?.toLowerCase();

    if (!userEmail) {
      return NextResponse.json(
        { error: "Google 계정에 이메일이 없습니다" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Find invitation by token
    const snapshot = await adminDb
      .collection("invitations")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: "초대 링크가 유효하지 않습니다" },
        { status: 404 }
      );
    }

    const invitationDoc = snapshot.docs[0];
    const invitation = invitationDoc.data();

    // Validate status
    if (invitation.status === "accepted") {
      return NextResponse.json(
        { error: "이미 수락된 초대입니다" },
        { status: 409 }
      );
    }

    if (invitation.status === "cancelled") {
      return NextResponse.json(
        { error: "취소된 초대입니다" },
        { status: 410 }
      );
    }

    // Check expiry
    const expiresAt = invitation.expiresAt?.toDate?.() ?? new Date(invitation.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        {
          error: "초대가 만료되었습니다. 관리자에게 재초대를 요청하세요",
        },
        { status: 410 }
      );
    }

    // Verify email matches (case-insensitive)
    if (invitation.email.toLowerCase() !== userEmail) {
      return NextResponse.json(
        {
          error:
            "초대된 이메일과 Google 계정 이메일이 일치하지 않습니다",
        },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMember = await adminDb
      .collection("members")
      .doc(uid)
      .get();

    if (existingMember.exists) {
      return NextResponse.json(
        { error: "이미 등록된 구성원입니다" },
        { status: 409 }
      );
    }

    // Atomic batch write: create member + update invitation
    const batch = adminDb.batch();

    // Create member document with UID as document ID
    const memberRef = adminDb.collection("members").doc(uid);
    batch.set(memberRef, {
      uid,
      email: userEmail,
      name: decoded.name || userEmail.split("@")[0],
      phone: null,
      birthDate: null,
      profileImageUrl: decoded.picture || null,
      departmentId: invitation.departmentId || null,
      teamId: null,
      positionId: null,
      jobTitle: null,
      role: invitation.role,
      status: "active",
      hireDate: new Date().toISOString().split("T")[0],
      resignDate: null,
      workType: "fixed",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update invitation status
    batch.update(invitationDoc.ref, {
      status: "accepted",
      acceptedBy: uid,
      acceptedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const response = NextResponse.json({
      status: "success",
      memberId: uid,
    });

    response.cookies.set("__session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Invitation accept error:", error);
    return NextResponse.json(
      { error: "초대 수락 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
