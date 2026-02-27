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
 * GET /api/contracts/[id]
 * Get a single contract by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthenticatedUid(request);
    const { id } = await params;

    const db = getAdminDb();
    const docSnap = await db.collection("contracts").doc(id).get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Get contract error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contracts/[id]
 * Update contract: send, sign, or update content.
 * Body: { action: "send" | "sign" | "update", ...data }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const uid = await getAuthenticatedUid(request);
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    const db = getAdminDb();
    const docRef = db.collection("contracts").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    if (action === "send") {
      const data = docSnap.data()!;
      if (data.status !== "draft") {
        return NextResponse.json(
          { error: "Only draft contracts can be sent" },
          { status: 400 }
        );
      }

      await docRef.update({
        status: "sent",
        sentAt: FieldValue.serverTimestamp(),
        statusHistory: FieldValue.arrayUnion({
          status: "sent",
          changedBy: uid,
          changedAt: Timestamp.now(),
          comment: null,
        }),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ status: "sent" });
    }

    if (action === "sign") {
      const { signatureImageUrl } = body;
      if (!signatureImageUrl) {
        return NextResponse.json(
          { error: "signatureImageUrl is required" },
          { status: 400 }
        );
      }

      const data = docSnap.data()!;
      if (data.status !== "sent") {
        return NextResponse.json(
          { error: "Only sent contracts can be signed" },
          { status: 400 }
        );
      }

      await docRef.update({
        status: "signed",
        signatureImageUrl,
        signedAt: FieldValue.serverTimestamp(),
        statusHistory: FieldValue.arrayUnion({
          status: "signed",
          changedBy: uid,
          changedAt: Timestamp.now(),
          comment: null,
        }),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ status: "signed" });
    }

    if (action === "update") {
      const { title, content } = body;
      const updateData: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (title) updateData.title = title;
      if (content) updateData.content = content;

      await docRef.update(updateData);
      return NextResponse.json({ status: "updated" });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'send', 'sign', or 'update'" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Update contract error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
