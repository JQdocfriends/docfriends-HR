import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

async function getAuthenticatedUid(request: NextRequest): Promise<string> {
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) {
    throw new Error("Not authenticated");
  }
  const decoded = await getAdminAuth().verifySessionCookie(sessionCookie);
  return decoded.uid;
}

/**
 * GET /api/contracts?recipientId=xxx
 * List contracts, optionally filtered by recipientId.
 */
export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUid(request);

    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get("recipientId");

    const db = getAdminDb();
    let q = db.collection("contracts").orderBy("createdAt", "desc");

    if (recipientId) {
      q = db
        .collection("contracts")
        .where("recipientId", "==", recipientId)
        .orderBy("createdAt", "desc");
    }

    const snapshot = await q.get();
    const contracts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ contracts });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("List contracts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts
 * Create a new contract.
 */
export async function POST(request: NextRequest) {
  try {
    const uid = await getAuthenticatedUid(request);
    const body = await request.json();

    const {
      templateId,
      templateVersion,
      title,
      recipientId,
      content,
      sealId,
    } = body;

    if (!templateId || !title || !recipientId || !content) {
      return NextResponse.json(
        { error: "templateId, title, recipientId, and content are required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = await db.collection("contracts").add({
      templateId,
      templateVersion: templateVersion ?? 1,
      title,
      recipientId,
      senderId: uid,
      content,
      status: "draft",
      sealId: sealId ?? null,
      signatureImageUrl: null,
      signedAt: null,
      sentAt: null,
      expiresAt: null,
      pdfUrl: null,
      statusHistory: [
        {
          status: "draft",
          changedBy: uid,
          changedAt: Timestamp.now(),
          comment: null,
        },
      ],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id, status: "draft" }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Create contract error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
