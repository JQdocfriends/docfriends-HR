"use client";

import useSWR from "swr";
import type { Contract, ContractTemplate } from "@/types";
import {
  fetchContracts,
  fetchContractTemplates,
  fetchContract,
  createContract,
  sendContract,
  signContract,
  createContractTemplate,
  type CreateContractData,
} from "@/lib/repositories/contract-repository";

export type { CreateContractData };
export { createContract, sendContract, signContract, createContractTemplate };

export function useContracts(recipientId?: string) {
  const { data, isLoading, mutate } = useSWR(
    recipientId ? `contracts/${recipientId}` : "contracts",
    () => fetchContracts(recipientId)
  );

  return { contracts: data ?? [], loading: isLoading, mutate };
}

export function useContract(id: string) {
  const { data, isLoading } = useSWR(
    id ? `contracts/doc/${id}` : null,
    () => fetchContract(id)
  );

  return { contract: data ?? null, loading: isLoading };
}

export function useContractTemplates() {
  const { data, isLoading, mutate } = useSWR(
    "contract-templates",
    fetchContractTemplates
  );

  return { templates: data ?? [], loading: isLoading, mutate };
}
