"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { onAuthChange, type User } from "@/lib/firebase/auth";
import type { Member, MemberRole } from "@/types";

interface AuthContextType {
  user: User | null;
  member: Member | null;
  role: MemberRole | null;
  loading: boolean;
  setMember: (member: Member | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  member: null,
  role: null,
  loading: true,
  setMember: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setMember(null);
        setLoading(false);
        return;
      }

      // Auto-fetch member document on session restore
      if (!member) {
        try {
          await firebaseUser.getIdToken();
          const memberDoc = await getDoc(
            doc(db, "members", firebaseUser.uid)
          );
          if (memberDoc.exists()) {
            setMember({ id: memberDoc.id, ...memberDoc.data() } as Member);
          }
        } catch (err) {
          console.error("Failed to fetch member:", err);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const role = member?.role ?? null;

  return (
    <AuthContext.Provider
      value={{ user, member, role, loading, setMember }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
