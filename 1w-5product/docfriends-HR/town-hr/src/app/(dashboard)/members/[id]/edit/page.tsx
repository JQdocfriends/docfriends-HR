"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { useMember, updateMember } from "@/hooks/use-members";
import { useDepartments, useTeams, usePositions } from "@/hooks/use-departments";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { MemberRole, MemberStatus, WorkType } from "@/types";

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "admin", label: "관리자" },
  { value: "manager", label: "매니저" },
  { value: "employee", label: "직원" },
];

const WORK_TYPE_OPTIONS: { value: WorkType; label: string }[] = [
  { value: "fixed", label: "고정근무" },
  { value: "flexible", label: "유연근무" },
  { value: "staggered", label: "시차근무" },
  { value: "remote", label: "재택근무" },
  { value: "hybrid", label: "하이브리드" },
];

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "재직중",
  on_leave: "휴직중",
  resigned: "퇴사",
};

export default function MemberEditPage({
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

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [workType, setWorkType] = useState<WorkType>("fixed");
  const [role, setRole] = useState<MemberRole>("employee");
  const [status, setStatus] = useState<MemberStatus>("active");
  const [saving, setSaving] = useState(false);
  const [resignDialogOpen, setResignDialogOpen] = useState(false);
  const [resignDate, setResignDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const isAdmin = currentUserRole === "admin";
  const canEdit = isAdmin || currentUserRole === "manager";

  // Populate form when member loads
  useEffect(() => {
    if (member) {
      setName(member.name);
      setPhone(member.phone ?? "");
      setBirthDate(member.birthDate ?? "");
      setDepartmentId(member.departmentId ?? "");
      setTeamId(member.teamId ?? "");
      setPositionId(member.positionId ?? "");
      setJobTitle(member.jobTitle ?? "");
      setWorkType(member.workType);
      setRole(member.role);
      setStatus(member.status);
    }
  }, [member]);

  // Filter teams by selected department
  const filteredTeams = departmentId
    ? teams.filter((t) => t.departmentId === departmentId)
    : teams;

  async function handleSave() {
    if (!member) return;
    setSaving(true);
    try {
      await updateMember(id, {
        name,
        phone: phone || null,
        birthDate: birthDate || null,
        departmentId: departmentId || null,
        teamId: teamId || null,
        positionId: positionId || null,
        jobTitle: jobTitle || null,
        workType,
        status,
        ...(isAdmin ? { role } : {}),
      });
      toast.success("구성원 정보가 저장되었습니다.");
      router.push(`/members/${id}`);
    } catch (err) {
      console.error("Failed to update member:", err);
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResign() {
    if (!member) return;
    setSaving(true);
    try {
      await updateMember(id, {
        status: "resigned",
        resignDate: resignDate,
      });
      toast.success("퇴사 처리가 완료되었습니다.");
      setResignDialogOpen(false);
      router.push(`/members/${id}`);
    } catch (err) {
      console.error("Failed to process resignation:", err);
      toast.error("퇴사 처리에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
        <p>수정 권한이 없습니다.</p>
        <Button variant="outline" onClick={() => router.push("/members")}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/members/${id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">구성원 수정</h1>
      </div>

      {/* Profile photo section */}
      <Card>
        <CardContent className="flex items-center gap-6 pt-6">
          <Avatar className="h-20 w-20">
            <AvatarImage
              src={member.profileImageUrl ?? undefined}
              alt={member.name}
            />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {member.name.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium">{member.name}</p>
            <p className="text-xs text-muted-foreground">
              프로필 사진 변경은 추후 지원 예정입니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">생년월일</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">소속 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>부서</Label>
              <Select
                value={departmentId}
                onValueChange={(v) => {
                  setDepartmentId(v);
                  setTeamId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="부서 선택" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>팀</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="팀 선택" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>직급</Label>
              <Select value={positionId} onValueChange={setPositionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="직급 선택" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">직책</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="예: CTO, 팀장"
              />
            </div>

            <div className="space-y-2">
              <Label>근무형태</Label>
              <Select
                value={workType}
                onValueChange={(v) => setWorkType(v as WorkType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label>권한</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as MemberRole)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">상태 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {member.status !== "resigned" && (
            <>
              <div className="flex items-center gap-4">
                <Label>현재 상태</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as MemberStatus)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      {STATUS_LABELS.active}
                    </SelectItem>
                    <SelectItem value="on_leave">
                      {STATUS_LABELS.on_leave}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  퇴사 처리 시 해당 구성원의 상태가 &quot;퇴사&quot;로 변경됩니다.
                </p>
                <Dialog
                  open={resignDialogOpen}
                  onOpenChange={setResignDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      퇴사 처리
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>퇴사 처리</DialogTitle>
                      <DialogDescription>
                        {member.name}님을 퇴사 처리하시겠습니까? 이 작업은
                        되돌리기 어렵습니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                      <Label htmlFor="resignDate">퇴사일</Label>
                      <Input
                        id="resignDate"
                        type="date"
                        value={resignDate}
                        onChange={(e) => setResignDate(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setResignDialogOpen(false)}
                      >
                        취소
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleResign}
                        disabled={saving}
                      >
                        {saving ? "처리중..." : "퇴사 처리"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </>
          )}

          {member.status === "resigned" && (
            <p className="text-sm text-muted-foreground">
              퇴사 처리된 구성원입니다. (퇴사일: {member.resignDate ?? "-"})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href={`/members/${id}`}>취소</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "저장중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}
