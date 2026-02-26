import {
  query,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { membersRef } from "@/lib/firebase/collections";
import { fetchCollection, fetchDocument } from "@/lib/firebase/swr";
import type { Member } from "@/types";

export type CreateMemberData = Omit<Member, "id" | "createdAt" | "updatedAt">;

export function getMembersQuery() {
  return query(membersRef, orderBy("name", "asc"));
}

export function getMemberRef(id: string) {
  return doc(db, "members", id);
}

export async function fetchMembers(): Promise<Member[]> {
  return fetchCollection<Member>(getMembersQuery());
}

export async function fetchMember(id: string): Promise<Member | null> {
  return fetchDocument<Member>(getMemberRef(id));
}

export async function createMember(data: CreateMemberData): Promise<string> {
  const docRef = await addDoc(membersRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateMember(
  id: string,
  data: Partial<CreateMemberData>
): Promise<void> {
  await updateDoc(getMemberRef(id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deactivateMember(id: string): Promise<void> {
  await updateDoc(getMemberRef(id), {
    status: "resigned",
    updatedAt: serverTimestamp(),
  });
}

/** @deprecated Use deactivateMember instead — hard delete violates data retention */
export async function deleteMember(id: string): Promise<void> {
  await deactivateMember(id);
}
