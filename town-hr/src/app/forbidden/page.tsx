import { Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">접근 권한이 없습니다</h1>
        <p className="text-muted-foreground max-w-sm">
          이 페이지에 접근할 권한이 부족합니다. 관리자에게 문의하세요.
        </p>
        <Button asChild>
          <Link href="/dashboard">홈으로 돌아가기</Link>
        </Button>
      </div>
    </div>
  );
}
