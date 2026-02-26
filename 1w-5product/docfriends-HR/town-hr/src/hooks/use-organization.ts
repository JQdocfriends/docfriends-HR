"use client";

import {
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  departmentsRef,
  teamsRef,
  positionsRef,
} from "@/lib/firebase/collections";
import type { Department, Team, Position } from "@/types";

// Re-export the read hooks
export { useDepartments, useTeams, usePositions } from "./use-departments";

// Department CRUD
export type CreateDepartmentData = Pick<
  Department,
  "name" | "description" | "headMemberId" | "parentDepartmentId" | "order"
>;

export async function createDepartment(
  data: CreateDepartmentData
): Promise<string> {
  const docRef = await addDoc(departmentsRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateDepartment(
  id: string,
  data: Partial<CreateDepartmentData>
): Promise<void> {
  await updateDoc(doc(db, "departments", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDepartment(id: string): Promise<void> {
  await deleteDoc(doc(db, "departments", id));
}

// Team CRUD
export type CreateTeamData = Pick<
  Team,
  "name" | "departmentId" | "leadMemberId" | "description" | "order"
>;

export async function createTeam(data: CreateTeamData): Promise<string> {
  const docRef = await addDoc(teamsRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTeam(
  id: string,
  data: Partial<CreateTeamData>
): Promise<void> {
  await updateDoc(doc(db, "teams", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTeam(id: string): Promise<void> {
  await deleteDoc(doc(db, "teams", id));
}

// Position CRUD
export type CreatePositionData = Pick<
  Position,
  "name" | "level" | "category" | "description" | "order"
>;

export async function createPosition(
  data: CreatePositionData
): Promise<string> {
  const docRef = await addDoc(positionsRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePosition(
  id: string,
  data: Partial<CreatePositionData>
): Promise<void> {
  await updateDoc(doc(db, "positions", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePosition(id: string): Promise<void> {
  await deleteDoc(doc(db, "positions", id));
}
