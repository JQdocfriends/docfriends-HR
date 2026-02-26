"use client";

import { useState, useMemo } from "react";
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Building2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useDepartments, useTeams } from "@/hooks/use-departments";
import { useMembers } from "@/hooks/use-members";
import { useAuthContext } from "@/contexts/auth-context";
import { departmentsRef, teamsRef } from "@/lib/firebase/collections";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Department, Team } from "@/types";

type DepartmentForm = { name: string; headMemberId: string };
type TeamForm = { name: string; departmentId: string; leadMemberId: string };

export default function DepartmentsPage() {
  const { departments, loading: deptLoading, mutate: mutateDepts } = useDepartments();
  const { teams, loading: teamLoading, mutate: mutateTeams } = useTeams();
  const { members } = useMembers();
  const { role } = useAuthContext();

  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  // Department dialog
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState<DepartmentForm>({ name: "", headMemberId: "" });
  const [deptSaving, setDeptSaving] = useState(false);

  // Team dialog
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState<TeamForm>({ name: "", departmentId: "", leadMemberId: "" });
  const [teamSaving, setTeamSaving] = useState(false);

  const loading = deptLoading || teamLoading;
  const isAdmin = role === "admin";

  const sortedDepartments = useMemo(
    () => [...departments].sort((a, b) => a.order - b.order),
    [departments]
  );

  function getTeamsForDept(deptId: string) {
    return teams.filter((t) => t.departmentId === deptId).sort((a, b) => a.order - b.order);
  }

  function getMemberName(id: string | null) {
    if (!id) return "-";
    return members.find((m) => m.id === id)?.name ?? "-";
  }

  function toggleExpand(deptId: string) {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  }

  // ---- Department CRUD ----

  function openAddDept() {
    setEditingDept(null);
    setDeptForm({ name: "", headMemberId: "" });
    setDeptDialogOpen(true);
  }

  function openEditDept(dept: Department) {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, headMemberId: dept.headMemberId ?? "" });
    setDeptDialogOpen(true);
  }

  async function handleSaveDept() {
    if (!deptForm.name.trim()) {
      toast.error("부서명을 입력해주세요");
      return;
    }
    setDeptSaving(true);
    try {
      if (editingDept) {
        const ref = doc(departmentsRef, editingDept.id);
        await setDoc(ref, {
          ...editingDept,
          name: deptForm.name.trim(),
          headMemberId: deptForm.headMemberId || null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        toast.success("부서가 수정되었습니다");
      } else {
        const ref = doc(departmentsRef);
        await setDoc(ref, {
          name: deptForm.name.trim(),
          description: null,
          headMemberId: deptForm.headMemberId || null,
          parentDepartmentId: null,
          order: departments.length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("부서가 추가되었습니다");
      }
      setDeptDialogOpen(false);
      await mutateDepts();
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setDeptSaving(false);
    }
  }

  async function handleDeleteDept(dept: Department) {
    const deptTeams = getTeamsForDept(dept.id);
    if (deptTeams.length > 0) {
      toast.error("소속 팀이 있는 부서는 삭제할 수 없습니다. 팀을 먼저 삭제해주세요.");
      return;
    }
    if (!confirm(`"${dept.name}" 부서를 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(departmentsRef, dept.id));
      toast.success("부서가 삭제되었습니다");
      await mutateDepts();
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  }

  // ---- Team CRUD ----

  function openAddTeam(departmentId: string) {
    setEditingTeam(null);
    setTeamForm({ name: "", departmentId, leadMemberId: "" });
    setTeamDialogOpen(true);
  }

  function openEditTeam(team: Team) {
    setEditingTeam(team);
    setTeamForm({ name: team.name, departmentId: team.departmentId, leadMemberId: team.leadMemberId ?? "" });
    setTeamDialogOpen(true);
  }

  async function handleSaveTeam() {
    if (!teamForm.name.trim()) {
      toast.error("팀명을 입력해주세요");
      return;
    }
    setTeamSaving(true);
    try {
      if (editingTeam) {
        const ref = doc(teamsRef, editingTeam.id);
        await setDoc(ref, {
          ...editingTeam,
          name: teamForm.name.trim(),
          leadMemberId: teamForm.leadMemberId || null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        toast.success("팀이 수정되었습니다");
      } else {
        const deptTeams = getTeamsForDept(teamForm.departmentId);
        const ref = doc(teamsRef);
        await setDoc(ref, {
          name: teamForm.name.trim(),
          departmentId: teamForm.departmentId,
          leadMemberId: teamForm.leadMemberId || null,
          description: null,
          order: deptTeams.length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("팀이 추가되었습니다");
      }
      setTeamDialogOpen(false);
      await mutateTeams();
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setTeamSaving(false);
    }
  }

  async function handleDeleteTeam(team: Team) {
    if (!confirm(`"${team.name}" 팀을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(teamsRef, team.id));
      toast.success("팀이 삭제되었습니다");
      await mutateTeams();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">부서/팀 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {departments.length}개 부서, {teams.length}개 팀
          </p>
        </div>
        <Button onClick={openAddDept}>
          <Plus className="mr-2 h-4 w-4" />
          부서 추가
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sortedDepartments.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          등록된 부서가 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDepartments.map((dept) => {
            const deptTeams = getTeamsForDept(dept.id);
            const isExpanded = expandedDepts.has(dept.id);

            return (
              <Card key={dept.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleExpand(dept.id)}
                      className="flex items-center gap-3 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{dept.name}</CardTitle>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">
                            부서장: {getMemberName(dept.headMemberId)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {deptTeams.length}개 팀
                          </Badge>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDept(dept)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDept(dept)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        소속 팀
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddTeam(dept.id)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        팀 추가
                      </Button>
                    </div>

                    {deptTeams.length === 0 ? (
                      <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                        소속 팀이 없습니다
                      </div>
                    ) : (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>팀명</TableHead>
                              <TableHead>팀장</TableHead>
                              <TableHead className="w-[100px]">관리</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deptTeams.map((team) => (
                              <TableRow key={team.id}>
                                <TableCell className="font-medium">
                                  {team.name}
                                </TableCell>
                                <TableCell>
                                  {getMemberName(team.leadMemberId)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openEditTeam(team)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleDeleteTeam(team)}
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
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Department Dialog */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDept ? "부서 수정" : "부서 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">부서명</Label>
              <Input
                id="dept-name"
                placeholder="부서명을 입력하세요"
                value={deptForm.name}
                onChange={(e) =>
                  setDeptForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-head">부서장</Label>
              <Select
                value={deptForm.headMemberId}
                onValueChange={(v) =>
                  setDeptForm((f) => ({ ...f, headMemberId: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger id="dept-head">
                  <SelectValue placeholder="부서장 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">선택 안함</SelectItem>
                  {members
                    .filter((m) => m.status === "active")
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeptDialogOpen(false)}
            >
              취소
            </Button>
            <Button onClick={handleSaveDept} disabled={deptSaving}>
              {deptSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? "팀 수정" : "팀 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">팀명</Label>
              <Input
                id="team-name"
                placeholder="팀명을 입력하세요"
                value={teamForm.name}
                onChange={(e) =>
                  setTeamForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-lead">팀장</Label>
              <Select
                value={teamForm.leadMemberId}
                onValueChange={(v) =>
                  setTeamForm((f) => ({ ...f, leadMemberId: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger id="team-lead">
                  <SelectValue placeholder="팀장 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">선택 안함</SelectItem>
                  {members
                    .filter((m) => m.status === "active")
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTeamDialogOpen(false)}
            >
              취소
            </Button>
            <Button onClick={handleSaveTeam} disabled={teamSaving}>
              {teamSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
