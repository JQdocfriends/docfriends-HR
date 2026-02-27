"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface VerifyResult {
  valid: boolean;
  email?: string;
  companyName?: string;
  invitedByName?: string;
  error?: string;
}

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyToken = useCallback(async () => {
    if (!token) {
      setVerifyResult({ valid: false, error: "초대 링크가 유효하지 않습니다" });
      setVerifying(false);
      return;
    }

    try {
      const res = await fetch(`/api/invitations/verify?token=${token}`);
      const data = await res.json();
      setVerifyResult(data);
    } catch {
      setVerifyResult({ valid: false, error: "초대 확인 중 오류가 발생했습니다" });
    } finally {
      setVerifying(false);
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  async function handleAccept() {
    if (!token) return;

    setError(null);
    setLoading(true);

    try {
      const firebaseUser = await signInWithGoogle();
      const idToken = await firebaseUser.getIdToken(true);

      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "초대 수락에 실패했습니다");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Accept error:", err);
      setError("초대 수락에 실패했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  }

  // Loading state
  if (verifying) {
    return (
      <Card className="border-[#E5E5E5] shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
            T
          </div>
          <CardTitle className="text-2xl font-bold">타운 (Town)</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            초대를 확인하고 있습니다...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  // Invalid/expired/error state
  if (!verifyResult?.valid) {
    return (
      <Card className="border-[#E5E5E5] shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
            T
          </div>
          <CardTitle className="text-2xl font-bold">타운 (Town)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="rounded-lg bg-[#FEE2E2] p-4 text-sm text-[#DC2626]">
            {verifyResult?.error || "초대 링크가 유효하지 않습니다"}
          </div>
          <Button variant="outline" onClick={() => router.push("/login")} className="w-full">
            로그인 페이지로
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Valid invitation
  return (
    <Card className="border-[#E5E5E5] shadow-sm">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
          T
        </div>
        <CardTitle className="text-2xl font-bold">구성원 초대</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {verifyResult.invitedByName}님이{" "}
          <strong>{verifyResult.companyName}</strong>에 초대했습니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-[#F5F5F5] p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">초대된 이메일</p>
          <p className="text-sm font-medium">{verifyResult.email}</p>
        </div>

        {error && (
          <div className="rounded-lg bg-[#FEE2E2] p-3 text-sm text-[#DC2626]">
            {error}
          </div>
        )}

        <Button
          onClick={handleAccept}
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
          {loading ? "처리 중..." : "Google 계정으로 가입"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          초대된 이메일과 동일한 Google 계정으로 로그인하세요
        </p>
      </CardContent>
    </Card>
  );
}

export default function JoinPage() {
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
      <JoinForm />
    </Suspense>
  );
}
