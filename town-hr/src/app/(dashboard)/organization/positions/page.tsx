"use client";

import { useState, useMemo } from "react";
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePositions } from "@/hooks/use-departments";
import { useMembers } from "@/hooks/use-members";
import { useAuthContext } from "@/contexts/auth-context";
import { positionsRef } from "@/lib/firebase/collections";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { Position, PositionCategory } from "@/types";

type PositionForm = {
  name: string;
  level: string;
  description: string;
};

export default function PositionsPage() {
  const { positions, loading, mutate } = usePositions();
  const { members } = useMembers();
  const { role } = useAuthContext();

  const [activeTab, setActiveTab] = useState<PositionCategory>("rank");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [form, setForm] = useState<PositionForm>({
    name: "",
    level: "1",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const isAdmin = role === "admin";

  const rankPositions = useMemo(
    () =>
      positions
        .filter((p) => p.category === "rank")
        .sort((a, b) => a.level - b.level),
    [positions]
  );

  const jobPositions = useMemo(
    () =>
      positions
        .filter((p) => p.category === "job")
        .sort((a, b) => a.level - b.level),
    [positions]
  );

  function openAdd() {
    setEditing(null);
    setForm({ name: "", level: "1", description: "" });
    setDialogOpen(true);
  }

  function openEdit(position: Position) {
    setEditing(position);
    setForm({
      name: position.name,
      level: String(position.level),
      description: position.description ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("명칭을 입력해주세요");
      return;
    }
    const level = parseInt(form.level, 10);
    if (isNaN(level) || level < 1) {
      toast.error("레벨은 1 이상의 숫자를 입력해주세요");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const ref = doc(positionsRef, editing.id);
        await setDoc(
          ref,
          {
            ...editing,
            name: form.name.trim(),
            level,
            description: form.description.trim() || null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        toast.success("수정되었습니다");
      } else {
        const categoryPositions =
          activeTab === "rank" ? rankPositions : jobPositions;
        const ref = doc(positionsRef);
        await setDoc(ref, {
          name: form.name.trim(),
          level,
          category: activeTab,
          description: form.description.trim() || null,
          order: categoryPositions.length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("추가되었습니다");
      }
      setDialogOpen(false);
      await mutate();
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(position: Position) {
    const assignedMembers = members.filter(
      (m) => m.positionId === position.id
    );
    if (assignedMembers.length > 0) {
      toast.error(
        `${assignedMembers.length}명의 구성원이 사용 중인 직급/직책은 삭제할 수 없습니다`
      );
      return;
    }
    if (!confirm(`"${position.name}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(positionsRef, position.id));
      toast.success("삭제되었습니다");
      await mutate();
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        관리자만 접근할 수 있습니다
      </div>
    );
  }

  function renderTable(items: Position[]) {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          등록된 항목이 없습니다
        </div>
      );
    }

    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">레벨</TableHead>
              <TableHead>명칭</TableHead>
              <TableHead>설명</TableHead>
              <TableHead className="w-[100px]">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((position) => (
              <TableRow key={position.id}>
                <TableCell className="font-mono text-center">
                  {position.level}
                </TableCell>
                <TableCell className="font-medium">{position.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {position.description ?? "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(position)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(position)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">직급/직책 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            직급 {rankPositions.length}개, 직책 {jobPositions.length}개
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {activeTab === "rank" ? "직급 추가" : "직책 추가"}
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PositionCategory)}
      >
        <TabsList>
          <TabsTrigger value="rank">직급 ({rankPositions.length})</TabsTrigger>
          <TabsTrigger value="job">직책 ({jobPositions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rank" className="mt-4">
          {renderTable(rankPositions)}
        </TabsContent>

        <TabsContent value="job" className="mt-4">
          {renderTable(jobPositions)}
        </TabsContent>
      </Tabs>

      {/* Position Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `${activeTab === "rank" ? "직급" : "직책"} 수정`
                : `${activeTab === "rank" ? "직급" : "직책"} 추가`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pos-name">명칭</Label>
              <Input
                id="pos-name"
                placeholder="명칭을 입력하세요"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-level">레벨</Label>
              <Input
                id="pos-level"
                type="number"
                min={1}
                placeholder="1"
                value={form.level}
                onChange={(e) =>
                  setForm((f) => ({ ...f, level: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-desc">설명</Label>
              <Input
                id="pos-desc"
                placeholder="설명 (선택)"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
