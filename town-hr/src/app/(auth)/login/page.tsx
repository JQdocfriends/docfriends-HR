"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Member } from "@/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setMember } = useAuthContext();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);

    try {
      const firebaseUser = await signInWithGoogle();

      // Look up member document by uid
      const memberDoc = await getDoc(doc(db, "members", firebaseUser.uid));

      if (!memberDoc.exists()) {
        setError("접근 권한이 없습니다. 관리자에게 초대를 요청하세요.");
        setLoading(false);
        return;
      }

      const member = { id: memberDoc.id, ...memberDoc.data() } as Member;

      if (member.status === "resigned") {
        setError("퇴사 처리된 계정입니다. 관리자에게 문의하세요.");
        setLoading(false);
        return;
      }

      setMember(member);

      // Create session cookie via API route
      const idToken = await firebaseUser.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const redirectTo = searchParams.get("redirect") || "/dashboard";
      router.push(redirectTo);
    } catch (err) {
      console.error("Login error:", err);
      setError("로그인에 실패했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <Card className="border-[#E5E5E5] shadow-sm">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
          T
        </div>
        <CardTitle className="text-2xl font-bold">타운 (Town)</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          사내 HR 관리 도구에 로그인하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[#FEE2E2] p-3 text-sm text-[#DC2626]">
            {error}
          </div>
        )}
        <Button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {loading ? "로그인 중..." : "Google 계정으로 로그인"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          회사에서 사용하는 Google 계정으로 로그인하세요
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-[#E5E5E5] shadow-sm">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
              T
            </div>
            <CardTitle className="text-2xl font-bold">타운 (Town)</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              로딩 중...
            </CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
