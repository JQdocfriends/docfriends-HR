import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export async function getAuthenticatedUid(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("__session");
    if (!session?.value) return null;

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function requireAdminOrManager(): Promise<{
  uid: string;
  memberName: string;
}> {
  const uid = await getAuthenticatedUid();
  if (!uid) {
    throw new AuthError("인증이 필요합니다", 401);
  }

  const adminDb = getAdminDb();
  const memberDoc = await adminDb.collection("members").doc(uid).get();

  if (!memberDoc.exists) {
    throw new AuthError("구성원 정보를 찾을 수 없습니다", 403);
  }

  const member = memberDoc.data()!;
  if (member.role !== "admin" && member.role !== "manager") {
    throw new AuthError("권한이 없습니다", 403);
  }

  return { uid, memberName: member.name };
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
