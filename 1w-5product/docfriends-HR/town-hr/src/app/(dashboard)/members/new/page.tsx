"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createMember } from "@/hooks/use-members";
import { useDepartments, useTeams, usePositions } from "@/hooks/use-departments";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { MemberRole, MemberStatus, WorkType } from "@/types";

export default function NewMemberPage() {
  const router = useRouter();
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin", "manager"]);
  const { departments } = useDepartments();
  const { teams } = useTeams();
  const { positions } = usePositions();

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    hireDate: new Date().toISOString().split("T")[0],
    departmentId: "",
    teamId: "",
    positionId: "",
    jobTitle: "",
    role: "employee" as MemberRole,
    workType: "fixed" as WorkType,
  });

  if (guardLoading) return null;
  if (!isAllowed) return null;

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  const filteredTeams = form.departmentId
    ? teams.filter((t) => t.departmentId === form.departmentId)
    : teams;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.hireDate) {
      toast.error("이름, 이메일, 입사일은 필수 항목입니다.");
      return;
    }

    setSubmitting(true);
    try {
      await createMember({
        uid: "",
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone || null,
        birthDate: form.birthDate || null,
        profileImageUrl: null,
        departmentId: form.departmentId || null,
        teamId: form.teamId || null,
        positionId: form.positionId || null,
        jobTitle: form.jobTitle || null,
        role: form.role,
        status: "active" as MemberStatus,
        hireDate: form.hireDate,
        resignDate: null,
        workType: form.workType,
      });
      toast.success("구성원이 등록되었습니다.");
      router.push("/members");
    } catch (error) {
      console.error("Failed to create member:", error);
      toast.error("구성원 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/members">
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">구성원 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-[800px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="hong@company.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">전화번호</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) =>
                    updateField("phone", formatPhone(e.target.value))
                  }
                  placeholder="010-1234-5678"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="birthDate">생년월일</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => updateField("birthDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hireDate">입사일 *</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => updateField("hireDate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">권한</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => updateField("role", v)}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">관리자</SelectItem>
                    <SelectItem value="manager">매니저</SelectItem>
                    <SelectItem value="employee">직원</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">소속 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="department">부서</Label>
                <Select
                  value={form.departmentId}
                  onValueChange={(v) => {
                    updateField("departmentId", v);
                    updateField("teamId", "");
                  }}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="부서 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team">팀</Label>
                <Select
                  value={form.teamId}
                  onValueChange={(v) => updateField("teamId", v)}
                >
                  <SelectTrigger id="team">
                    <SelectValue placeholder="팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="position">직급</Label>
                <Select
                  value={form.positionId}
                  onValueChange={(v) => updateField("positionId", v)}
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder="직급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jobTitle">직책</Label>
                <Input
                  id="jobTitle"
                  value={form.jobTitle}
                  onChange={(e) => updateField("jobTitle", e.target.value)}
                  placeholder="예: 팀장, CTO"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workType">근무형태</Label>
                <Select
                  value={form.workType}
                  onValueChange={(v) => updateField("workType", v)}
                >
                  <SelectTrigger id="workType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">고정근무</SelectItem>
                    <SelectItem value="flexible">유연근무</SelectItem>
                    <SelectItem value="staggered">시차근무</SelectItem>
                    <SelectItem value="remote">재택근무</SelectItem>
                    <SelectItem value="hybrid">하이브리드</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/members">취소</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "등록 중..." : "구성원 등록"}
          </Button>
        </div>
      </form>
    </div>
  );
}
