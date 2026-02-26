import {
  query,
  where,
  orderBy,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  contractsRef,
  contractTemplatesRef,
} from "@/lib/firebase/collections";
import { fetchCollection } from "@/lib/firebase/swr";
import type { Contract, ContractTemplate, ContractStatus } from "@/types";

export function getContractsQuery(recipientId?: string) {
  const constraints: QueryConstraint[] = [];
  if (recipientId) {
    constraints.push(where("recipientId", "==", recipientId));
  }
  constraints.push(orderBy("createdAt", "desc"));
  return query(contractsRef, ...constraints);
}

export function getContractTemplatesQuery() {
  return query(contractTemplatesRef, where("isActive", "==", true));
}

export async function fetchContracts(recipientId?: string): Promise<Contract[]> {
  return fetchCollection<Contract>(getContractsQuery(recipientId));
}

export async function fetchContractTemplates(): Promise<ContractTemplate[]> {
  return fetchCollection<ContractTemplate>(getContractTemplatesQuery());
}

export async function fetchContract(id: string): Promise<Contract | null> {
  const docSnap = await getDoc(doc(db, "contracts", id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Contract;
}

export interface CreateContractData {
  templateId: string;
  templateVersion: number;
  title: string;
  recipientId: string;
  senderId: string;
  content: string;
  sealId?: string | null;
}

export async function createContract(
  data: CreateContractData
): Promise<string> {
  const docRef = await addDoc(contractsRef, {
    ...data,
    status: "draft" as ContractStatus,
    sealId: data.sealId ?? null,
    signatureImageUrl: null,
    signedAt: null,
    sentAt: null,
    expiresAt: null,
    pdfUrl: null,
    statusHistory: [
      {
        status: "draft",
        changedBy: data.senderId,
        changedAt: Timestamp.now(),
        comment: null,
      },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function sendContract(
  id: string,
  senderId: string
): Promise<void> {
  await updateDoc(doc(db, "contracts", id), {
    status: "sent",
    sentAt: serverTimestamp(),
    statusHistory: arrayUnion({
      status: "sent",
      changedBy: senderId,
      changedAt: Timestamp.now(),
      comment: null,
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function signContract(
  id: string,
  signatureImageUrl: string,
  signerId?: string
): Promise<void> {
  await updateDoc(doc(db, "contracts", id), {
    status: "signed",
    signatureImageUrl,
    signedAt: serverTimestamp(),
    statusHistory: arrayUnion({
      status: "signed",
      changedBy: signerId ?? null,
      changedAt: Timestamp.now(),
      comment: null,
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function createContractTemplate(
  data: Omit<ContractTemplate, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await addDoc(contractTemplatesRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}
