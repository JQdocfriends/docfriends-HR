"use client";

import useSWR from "swr";
import { fetchOnboardingChecklist } from "@/lib/repositories/onboarding-repository";

export function useOnboarding(memberId: string) {
  const { data, isLoading, mutate } = useSWR(
    memberId ? `onboarding/${memberId}` : null,
    () => fetchOnboardingChecklist(memberId)
  );
  return { checklist: data ?? null, loading: isLoading, mutate };
}
