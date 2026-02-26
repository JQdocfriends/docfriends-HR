"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Calendar, Building2, Briefcase } from "lucide-react";
import { useMember } from "@/hooks/use-members";
import { useDepartments, usePositions, useTeams } from "@/hooks/use-departments";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { MemberStatus } from "@/types";

const STATUS_CONFIG: Record<MemberStatus, { label: string; className: string }> = {
  active: { label: "재직중", className: "bg-[#DCFCE7] text-[#16A34A]" },
  on_leave: { label: "휴직중", className: "bg-[#FEF3C7] text-[#F59E0B]" },
  resigned: { label: "퇴사", className: "bg-[#F5F5F5] text-[#737373]" },
};

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  manager: "매니저",
  employee: "직원",
};

const WORK_TYPE_LABELS: Record<string, string> = {
  fixed: "고정근무",
  flexible: "유연근무",
  staggered: "시차근무",
  remote: "재택근무",
  hybrid: "하이브리드",
};

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="w-24 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "-"}</span>
    </div>
  );
}

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { member, loading } = useMember(id);
  const { departments } = useDepartments();
  const { teams } = useTeams();
  const { positions } = usePositions();
  const { role: currentUserRole } = useAuthContext();

  const canEdit = currentUserRole === "admin" || currentUserRole === "manager";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
        <p>구성원을 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => router.push("/members")}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const status = STATUS_CONFIG[member.status];
  const departmentName =
    departments.find((d) => d.id === member.departmentId)?.name ?? "-";
  const teamName = teams.find((t) => t.id === member.teamId)?.name ?? "-";
  const positionName =
    positions.find((p) => p.id === member.positionId)?.name ?? "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/members">
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={member.profileImageUrl ?? undefined}
                alt={member.name}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {member.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{member.name}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {departmentName} · {positionName}
                {member.jobTitle && ` · ${member.jobTitle}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[member.role] ?? member.role}
              </p>
            </div>
            {canEdit && (
              <Button variant="outline" asChild>
                <Link href={`/members/${member.id}/edit`}>수정</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow icon={Mail} label="이메일" value={member.email} />
            <InfoRow icon={Phone} label="전화번호" value={member.phone} />
            <InfoRow icon={Calendar} label="생년월일" value={member.birthDate} />
            <InfoRow icon={Calendar} label="입사일" value={member.hireDate} />
            {member.resignDate && (
              <InfoRow icon={Calendar} label="퇴사일" value={member.resignDate} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">소속 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow icon={Building2} label="부서" value={departmentName} />
            <InfoRow icon={Building2} label="팀" value={teamName} />
            <InfoRow icon={Briefcase} label="직급" value={positionName} />
            <InfoRow icon={Briefcase} label="직책" value={member.jobTitle} />
            <Separator className="my-2" />
            <InfoRow
              icon={Briefcase}
              label="근무형태"
              value={WORK_TYPE_LABELS[member.workType] ?? member.workType}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
