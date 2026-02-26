import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

async function getAuthenticatedUid(request: NextRequest): Promise<string> {
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) {
    throw new Error("Not authenticated");
  }
  const decoded = await getAdminAuth().verifySessionCookie(sessionCookie);
  return decoded.uid;
}

/**
 * GET /api/contracts/templates
 * List active contract templates.
 */
export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUid(request);

    const db = getAdminDb();
    const snapshot = await db
      .collection("contract_templates")
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    const templates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("List templates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/templates
 * Create a new contract template.
 */
export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedUid(request);
    const body = await request.json();

    const { name, content, category, version } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: "name and content are required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = await db.collection("contract_templates").add({
      name,
      content,
      category: category ?? "general",
      version: version ?? 1,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Create template error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
