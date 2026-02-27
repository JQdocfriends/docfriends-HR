"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Stamp,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuthContext } from "@/contexts/auth-context";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { companySealsRef } from "@/lib/firebase/collections";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { CompanySeal, SealType, MemberRole } from "@/types";

const SEAL_TYPE_LABELS: Record<SealType, string> = {
  company: "법인인감",
  representative: "대표이사인",
};

const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "관리자",
  manager: "매니저",
  employee: "직원",
};

const ALL_ROLES: MemberRole[] = ["admin", "manager", "employee"];

function SealPreview({
  name,
  type,
}: {
  name: string;
  type: SealType;
}) {
  const isCompany = type === "company";
  return (
    <div className="flex items-center justify-center">
      <div
        className={`flex items-center justify-center border-2 border-red-600 text-red-600 font-bold text-xs ${
          isCompany
            ? "h-16 w-16 rounded-full"
            : "h-12 w-20 rounded-md"
        }`}
      >
        <span className="text-center leading-tight px-1 break-all">
          {name || (isCompany ? "법인인감" : "대표이사")}
        </span>
      </div>
    </div>
  );
}

export default function SealsPage() {
  const { member } = useAuthContext();
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin"]);
  const [seals, setSeals] = useState<CompanySeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanySeal | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [sealType, setSealType] = useState<SealType>("company");
  const [imageUrl, setImageUrl] = useState("");
  const [allowedRoles, setAllowedRoles] = useState<MemberRole[]>(["admin"]);
  const [submitting, setSubmitting] = useState(false);

  async function fetchSeals() {
    try {
      const snap = await getDocs(companySealsRef);
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as CompanySeal)
      );
      list.sort((a, b) => a.name.localeCompare(b.name));
      setSeals(list);
    } catch {
      toast.error("인감 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAllowed) fetchSeals();
  }, [isAllowed]);

  if (guardLoading) return null;
  if (!isAllowed) return null;

  function openCreate() {
    setName("");
    setSealType("company");
    setImageUrl("");
    setAllowedRoles(["admin"]);
    setDialogOpen(true);
  }

  function toggleRole(role: MemberRole) {
    setAllowedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSubmit() {
    if (!name.trim() || !member) {
      toast.error("인감 이름을 입력하세요.");
      return;
    }
    if (allowedRoles.length === 0) {
      toast.error("허용 권한을 하나 이상 선택하세요.");
      return;
    }
    setSubmitting(true);
    try {
      const ref = doc(companySealsRef);
      await setDoc(ref, {
        name: name.trim(),
        imageUrl: imageUrl.trim() || "",
        type: sealType,
        allowedRoles,
        isActive: true,
        createdBy: member.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("인감이 등록되었습니다.");
      setDialogOpen(false);
      fetchSeals();
    } catch {
      toast.error("등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(seal: CompanySeal) {
    try {
      const ref = doc(companySealsRef, seal.id);
      await setDoc(
        ref,
        { isActive: !seal.isActive, updatedAt: serverTimestamp() },
        { merge: true }
      );
      toast.success(seal.isActive ? "비활성화되었습니다." : "활성화되었습니다.");
      fetchSeals();
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  }

  function confirmDelete(seal: CompanySeal) {
    setDeleteTarget(seal);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(companySealsRef, deleteTarget.id));
      toast.success("인감이 삭제되었습니다.");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchSeals();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/contracts">
              <ArrowLeft className="mr-1 h-4 w-4" />
              뒤로
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">법인인감 관리</h1>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          인감 추가
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : seals.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          등록된 인감이 없습니다
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">미리보기</TableHead>
                  <TableHead>인감명</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>허용 권한</TableHead>
                  <TableHead>사용 횟수</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-24">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seals.map((seal) => (
                  <TableRow key={seal.id}>
                    <TableCell>
                      {seal.imageUrl ? (
                        <img
                          src={seal.imageUrl}
                          alt={seal.name}
                          className="h-12 w-12 object-contain"
                        />
                      ) : (
                        <SealPreview name={seal.name} type={seal.type} />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{seal.name}</TableCell>
                    <TableCell>{SEAL_TYPE_LABELS[seal.type]}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {seal.allowedRoles.map((r) => (
                          <Badge key={r} variant="secondary" className="text-xs">
                            {ROLE_LABELS[r]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">0회</TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleActive(seal)}
                        className="inline-flex items-center gap-1 text-sm"
                      >
                        {seal.isActive ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-green-600" />
                            <span className="text-green-600">활성</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                            <span className="text-muted-foreground">비활성</span>
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(seal)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Seal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stamp className="h-5 w-5" />
              인감 추가
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>인감명 *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 닥프렌즈 법인인감"
                />
              </div>
              <div className="space-y-1.5">
                <Label>구분</Label>
                <Select
                  value={sealType}
                  onValueChange={(v) => setSealType(v as SealType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">법인인감</SelectItem>
                    <SelectItem value="representative">대표이사인</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>이미지 URL (선택)</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/seal.png"
              />
              <p className="text-xs text-muted-foreground">
                비워두면 텍스트 기반 인감이 표시됩니다.
              </p>
            </div>

            {/* Seal Preview */}
            <div className="space-y-1.5">
              <Label>미리보기</Label>
              <div className="flex items-center justify-center rounded-md border bg-muted/30 p-4">
                {imageUrl.trim() ? (
                  <img
                    src={imageUrl}
                    alt="미리보기"
                    className="h-16 w-16 object-contain"
                  />
                ) : (
                  <SealPreview name={name} type={sealType} />
                )}
              </div>
            </div>

            {/* Allowed Roles */}
            <div className="space-y-1.5">
              <Label>허용 권한 *</Label>
              <div className="flex gap-4">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={allowedRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {ROLE_LABELS[role]}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>인감 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteTarget?.name}&rdquo; 인감을 삭제하시겠습니까? 이 작업은
            되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
