"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onSnapshot } from "firebase/firestore";
import { companyDocRef } from "@/lib/firebase/collections";
import type { Company } from "@/types";

interface CompanyContextType {
  company: Company | null;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  company: null,
  loading: true,
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      companyDocRef,
      (doc) => {
        if (doc.exists()) {
          setCompany(doc.data() as Company);
        } else {
          setCompany(null);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return (
    <CompanyContext.Provider value={{ company, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
