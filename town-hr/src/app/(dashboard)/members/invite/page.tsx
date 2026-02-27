"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { createMember } from "@/hooks/use-members";
import { useDepartments } from "@/hooks/use-departments";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { MemberRole } from "@/types";

interface InviteRow {
  id: string;
  email: string;
  role: MemberRole;
  departmentId: string;
}

type InputMode = "textarea" | "rows";

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "employee", label: "직원" },
  { value: "manager", label: "매니저" },
  { value: "admin", label: "관리자" },
];

function createEmptyRow(): InviteRow {
  return {
    id: crypto.randomUUID(),
    email: "",
    role: "employee",
    departmentId: "",
  };
}

export default function MemberInvitePage() {
  const router = useRouter();
  const { role: currentUserRole } = useAuthContext();
  const { departments } = useDepartments();

  const [inputMode, setInputMode] = useState<InputMode>("rows");
  const [textareaValue, setTextareaValue] = useState("");
  const [rows, setRows] = useState<InviteRow[]>([createEmptyRow()]);
  const [bulkRole, setBulkRole] = useState<MemberRole>("employee");
  const [bulkDepartmentId, setBulkDepartmentId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const canAccess =
    currentUserRole === "admin" || currentUserRole === "manager";

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  function updateRow(id: string, field: keyof InviteRow, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function parseTextareaEmails(): string[] {
    return textareaValue
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  }

  function getInviteList(): {
    email: string;
    role: MemberRole;
    departmentId: string;
  }[] {
    if (inputMode === "textarea") {
      return parseTextareaEmails().map((email) => ({
        email,
        role: bulkRole,
        departmentId: bulkDepartmentId,
      }));
    }
    return rows
      .filter((r) => r.email.trim().length > 0)
      .map((r) => ({
        email: r.email.trim(),
        role: r.role,
        departmentId: r.departmentId,
      }));
  }

  async function handleInvite() {
    const invites = getInviteList();
    if (invites.length === 0) {
      toast.error("초대할 이메일을 입력해주세요.");
      return;
    }

    setProcessing(true);
    setResults(null);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const invite of invites) {
      try {
        const nameFromEmail = invite.email.split("@")[0];
        await createMember({
          uid: "",
          email: invite.email,
          name: nameFromEmail,
          phone: null,
          birthDate: null,
          profileImageUrl: null,
          departmentId: invite.departmentId || null,
          teamId: null,
          positionId: null,
          jobTitle: null,
          role: invite.role,
          status: "active",
          hireDate: new Date().toISOString().split("T")[0],
          resignDate: null,
          workType: "fixed",
        });
        success++;
      } catch (err) {
        failed++;
        errors.push(`${invite.email}: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
      }
    }

    setResults({ success, failed, errors });
    setProcessing(false);

    if (failed === 0) {
      toast.success(`${success}명 초대 완료`);
    } else {
      toast.error(`${success}명 성공, ${failed}명 실패`);
    }
  }

  if (!canAccess) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
        <p>초대 권한이 없습니다.</p>
        <Button variant="outline" onClick={() => router.push("/members")}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const inviteCount = getInviteList().length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/members">
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">구성원 초대</h1>
      </div>

      {/* Input mode toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">입력 방식</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={inputMode === "rows" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("rows")}
            >
              개별 입력
            </Button>
            <Button
              variant={inputMode === "textarea" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("textarea")}
            >
              일괄 입력
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Textarea mode */}
      {inputMode === "textarea" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">이메일 일괄 입력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emails">
                이메일 주소 (쉼표 또는 줄바꿈으로 구분)
              </Label>
              <textarea
                id="emails"
                className="border-input bg-background flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]"
                placeholder={"hong@company.com\nkim@company.com\nlee@company.com"}
                value={textareaValue}
                onChange={(e) => setTextareaValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {parseTextareaEmails().length}개의 이메일이 감지되었습니다.
              </p>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>기본 권한</Label>
                <Select
                  value={bulkRole}
                  onValueChange={(v) => setBulkRole(v as MemberRole)}
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
              <div className="space-y-2">
                <Label>기본 부서 (선택)</Label>
                <Select
                  value={bulkDepartmentId}
                  onValueChange={setBulkDepartmentId}
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual rows mode */}
      {inputMode === "rows" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">초대 목록</CardTitle>
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-1 h-3 w-3" />
                추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row, idx) => (
              <div
                key={row.id}
                className="flex items-end gap-3 rounded-md border p-3"
              >
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">이메일</Label>
                  <Input
                    type="email"
                    placeholder="email@company.com"
                    value={row.email}
                    onChange={(e) =>
                      updateRow(row.id, "email", e.target.value)
                    }
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">권한</Label>
                  <Select
                    value={row.role}
                    onValueChange={(v) => updateRow(row.id, "role", v)}
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
                <div className="w-36 space-y-1">
                  <Label className="text-xs">부서</Label>
                  <Select
                    value={row.departmentId}
                    onValueChange={(v) =>
                      updateRow(row.id, "departmentId", v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="선택" />
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Progress / Results */}
      {processing && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">초대를 처리하고 있습니다...</p>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">처리 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Badge variant="default" className="bg-[#DCFCE7] text-[#16A34A]">
                성공: {results.success}명
              </Badge>
              {results.failed > 0 && (
                <Badge variant="destructive">실패: {results.failed}명</Badge>
              )}
            </div>
            {results.errors.length > 0 && (
              <div className="rounded-md bg-destructive/10 p-3">
                {results.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {err}
                  </p>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/members")}
            >
              구성원 목록으로
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {!results && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/members">취소</Link>
          </Button>
          <Button
            onClick={handleInvite}
            disabled={processing || inviteCount === 0}
          >
            <Users className="mr-1 h-4 w-4" />
            {processing
              ? "처리중..."
              : `초대하기 (${inviteCount}명)`}
          </Button>
        </div>
      )}
    </div>
  );
}
