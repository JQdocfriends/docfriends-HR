"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Mail,
  RotateCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useDepartments } from "@/hooks/use-departments";
import { useAuthContext } from "@/contexts/auth-context";
import {
  useInvitations,
  cancelInvitation,
  resendInvitation,
} from "@/hooks/use-invitations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const { invitations, loading: invitationsLoading, mutate } =
    useInvitations("pending");

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
    setRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.id !== id) : prev
    );
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

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitations: invites }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "초대 처리에 실패했습니다");
        setProcessing(false);
        return;
      }

      const errors = data.results
        .filter((r: { success: boolean }) => !r.success)
        .map(
          (r: { email: string; error?: string }) =>
            `${r.email}: ${r.error || "알 수 없는 오류"}`
        );

      setResults({
        success: data.successCount,
        failed: data.failedCount,
        errors,
      });

      if (data.failedCount === 0) {
        toast.success(`${data.successCount}명에게 초대 이메일을 발송했습니다`);
      } else {
        toast.error(
          `${data.successCount}명 성공, ${data.failedCount}명 실패`
        );
      }

      // Refresh pending invitations list
      mutate();
    } catch {
      toast.error("초대 처리 중 오류가 발생했습니다");
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelInvitation(id);
      toast.success("초대가 취소되었습니다");
      mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "초대 취소에 실패했습니다"
      );
    }
  }

  async function handleResend(id: string) {
    try {
      await resendInvitation(id);
      toast.success("초대 이메일을 재발송했습니다");
      mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "재발송에 실패했습니다"
      );
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
            {rows.map((row) => (
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
            <p className="text-sm">초대 이메일을 발송하고 있습니다...</p>
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
              onClick={() => {
                setResults(null);
                setRows([createEmptyRow()]);
                setTextareaValue("");
              }}
            >
              새 초대하기
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
            <Mail className="mr-1 h-4 w-4" />
            {processing
              ? "발송 중..."
              : `초대 이메일 발송 (${inviteCount}명)`}
          </Button>
        </div>
      )}

      {/* Pending invitations section */}
      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-semibold">보류 중인 초대</h2>

        {invitationsLoading ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">로딩 중...</p>
            </CardContent>
          </Card>
        ) : invitations.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              보류 중인 초대가 없습니다
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>권한</TableHead>
                  <TableHead>초대일</TableHead>
                  <TableHead>만료일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const roleLabel =
                    ROLE_OPTIONS.find((o) => o.value === inv.role)?.label ??
                    inv.role;
                  const createdAt = inv.createdAt
                    ? new Date(inv.createdAt).toLocaleDateString("ko-KR")
                    : "-";
                  const expiresAt = inv.expiresAt
                    ? new Date(inv.expiresAt).toLocaleDateString("ko-KR")
                    : "-";
                  const isExpired = inv.expiresAt
                    ? new Date(inv.expiresAt) < new Date()
                    : false;

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        {inv.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {createdAt}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            isExpired
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          {expiresAt}
                          {isExpired && " (만료)"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(inv.id)}
                            title="재발송"
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(inv.id)}
                            title="취소"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
