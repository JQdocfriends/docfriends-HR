import { query, orderBy } from "firebase/firestore";
import {
  departmentsRef,
  teamsRef,
  positionsRef,
} from "@/lib/firebase/collections";
import { fetchCollection } from "@/lib/firebase/swr";
import type { Department, Team, Position } from "@/types";

export function getDepartmentsQuery() {
  return query(departmentsRef, orderBy("order", "asc"));
}

export function getTeamsQuery() {
  return query(teamsRef, orderBy("order", "asc"));
}

export function getPositionsQuery() {
  return query(positionsRef, orderBy("level", "asc"));
}

export async function fetchDepartments(): Promise<Department[]> {
  return fetchCollection<Department>(getDepartmentsQuery());
}

export async function fetchTeams(): Promise<Team[]> {
  return fetchCollection<Team>(getTeamsQuery());
}

export async function fetchPositions(): Promise<Position[]> {
  return fetchCollection<Position>(getPositionsQuery());
}
