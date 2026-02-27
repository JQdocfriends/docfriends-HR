"use client";

import useSWR from "swr";
import type { Department, Team, Position } from "@/types";
import {
  fetchDepartments,
  fetchTeams,
  fetchPositions,
} from "@/lib/repositories/department-repository";

export function useDepartments() {
  const { data, isLoading, mutate } = useSWR("departments", fetchDepartments);

  return { departments: data ?? [], loading: isLoading, mutate };
}

export function useTeams() {
  const { data, isLoading, mutate } = useSWR("teams", fetchTeams);

  return { teams: data ?? [], loading: isLoading, mutate };
}

export function usePositions() {
  const { data, isLoading, mutate } = useSWR("positions", fetchPositions);

  return { positions: data ?? [], loading: isLoading, mutate };
}
