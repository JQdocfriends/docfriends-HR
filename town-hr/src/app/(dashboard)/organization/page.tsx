"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Building2, Users, Award } from "lucide-react";
import {
  useDepartments,
  useTeams,
  usePositions,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createTeam,
  updateTeam,
  deleteTeam,
  createPosition,
  updatePosition,
  deletePosition,
} from "@/hooks/use-organization";
import { useMembers } from "@/hooks/use-members";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function OrganizationPage() {
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin", "manager"]);

  if (guardLoading) return null;
  if (!isAllowed) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">조직</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            부서, 팀, 직급을 관리합니다
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/organization/chart">조직도 보기</Link>
        </Button>
      </div>

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">
            <Building2 className="mr-1.5 h-4 w-4" />
            부서
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="mr-1.5 h-4 w-4" />
            팀
          </TabsTrigger>
          <TabsTrigger value="positions">
            <Award className="mr-1.5 h-4 w-4" />
            직급
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-4">
          <DepartmentTab />
        </TabsContent>
        <TabsContent value="teams" className="mt-4">
          <TeamTab />
        </TabsContent>
        <TabsContent value="positions" className="mt-4">
          <PositionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Department Tab ──

function DepartmentTab() {
  const { departments, loading } = useDepartments();
  const { members } = useMembers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [headMemberId, setHeadMemberId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setEditId(null);
    setName("");
    setDescription("");
    setHeadMemberId("");
    setDialogOpen(true);
  }

  function openEdit(dept: { id: string; name: string; description: string | null; headMemberId: string | null }) {
    setEditId(dept.id);
    setName(dept.name);
    setDescription(dept.description ?? "");
    setHeadMemberId(dept.headMemberId ?? "");
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("부서명을 입력하세요.");
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        headMemberId: headMemberId || null,
        parentDepartmentId: null,
        order: editId
          ? departments.find((d) => d.id === editId)?.order ?? 0
          : departments.length,
      };
      if (editId) {
        await updateDepartment(editId, data);
        toast.success("부서가 수정되었습니다.");
      } else {
        await createDepartment(data);
        toast.success("부서가 등록되었습니다.");
      }
      setDialogOpen(false);
    } catch {
      toast.error("작업에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, deptName: string) {
    if (!confirm(`"${deptName}" 부서를 삭제하시겠습니까?`)) return;
    try {
      await deleteDepartment(id);
      toast.success("부서가 삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">부서 목록</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            부서 추가
          </Button>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              등록된 부서가 없습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>부서명</TableHead>
                  <TableHead>부서장</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>
                      {members.find((m) => m.id === dept.headMemberId)?.name ??
                        "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dept.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(dept)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(dept.id, dept.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "부서 수정" : "부서 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>부서명 *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 개발팀"
              />
            </div>
            <div className="space-y-1.5">
              <Label>부서장</Label>
              <Select value={headMemberId} onValueChange={setHeadMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="선택 안함" />
                </SelectTrigger>
                <SelectContent>
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
            <div className="space-y-1.5">
              <Label>설명</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="부서 설명 (선택)"
              />
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
    </>
  );
}

// ── Team Tab ──

function TeamTab() {
  const { teams, loading } = useTeams();
  const { departments } = useDepartments();
  const { members } = useMembers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [leadMemberId, setLeadMemberId] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setEditId(null);
    setName("");
    setDepartmentId("");
    setLeadMemberId("");
    setDescription("");
    setDialogOpen(true);
  }

  function openEdit(team: { id: string; name: string; departmentId: string; leadMemberId: string | null; description: string | null }) {
    setEditId(team.id);
    setName(team.name);
    setDepartmentId(team.departmentId);
    setLeadMemberId(team.leadMemberId ?? "");
    setDescription(team.description ?? "");
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim() || !departmentId) {
      toast.error("팀명과 소속 부서를 입력하세요.");
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        departmentId,
        leadMemberId: leadMemberId || null,
        description: description.trim() || null,
        order: editId
          ? teams.find((t) => t.id === editId)?.order ?? 0
          : teams.length,
      };
      if (editId) {
        await updateTeam(editId, data);
        toast.success("팀이 수정되었습니다.");
      } else {
        await createTeam(data);
        toast.success("팀이 등록되었습니다.");
      }
      setDialogOpen(false);
    } catch {
      toast.error("작업에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, teamName: string) {
    if (!confirm(`"${teamName}" 팀을 삭제하시겠습니까?`)) return;
    try {
      await deleteTeam(id);
      toast.success("팀이 삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">팀 목록</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            팀 추가
          </Button>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              등록된 팀이 없습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>팀명</TableHead>
                  <TableHead>소속 부서</TableHead>
                  <TableHead>팀장</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      {departments.find((d) => d.id === team.departmentId)
                        ?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      {members.find((m) => m.id === team.leadMemberId)?.name ??
                        "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {team.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(team)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(team.id, team.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "팀 수정" : "팀 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>팀명 *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 프론트엔드팀"
              />
            </div>
            <div className="space-y-1.5">
              <Label>소속 부서 *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
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
              <Label>팀장</Label>
              <Select value={leadMemberId} onValueChange={setLeadMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="선택 안함" />
                </SelectTrigger>
                <SelectContent>
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
            <div className="space-y-1.5">
              <Label>설명</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="팀 설명 (선택)"
              />
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
    </>
  );
}

// ── Position Tab ──

function PositionTab() {
  const { positions, loading } = usePositions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("1");
  const [category, setCategory] = useState<"rank" | "job">("rank");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setEditId(null);
    setName("");
    setLevel("1");
    setCategory("rank");
    setDescription("");
    setDialogOpen(true);
  }

  function openEdit(pos: { id: string; name: string; level: number; category: "rank" | "job"; description: string | null }) {
    setEditId(pos.id);
    setName(pos.name);
    setLevel(String(pos.level));
    setCategory(pos.category);
    setDescription(pos.description ?? "");
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("직급명을 입력하세요.");
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        level: parseInt(level, 10),
        category,
        description: description.trim() || null,
        order: editId
          ? positions.find((p) => p.id === editId)?.order ?? 0
          : positions.length,
      };
      if (editId) {
        await updatePosition(editId, data);
        toast.success("직급이 수정되었습니다.");
      } else {
        await createPosition(data);
        toast.success("직급이 등록되었습니다.");
      }
      setDialogOpen(false);
    } catch {
      toast.error("작업에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, posName: string) {
    if (!confirm(`"${posName}" 직급을 삭제하시겠습니까?`)) return;
    try {
      await deletePosition(id);
      toast.success("직급이 삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">직급 목록</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            직급 추가
          </Button>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              등록된 직급이 없습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>직급명</TableHead>
                  <TableHead>레벨</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-medium">{pos.name}</TableCell>
                    <TableCell>{pos.level}</TableCell>
                    <TableCell>
                      {pos.category === "rank" ? "직급" : "직무"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {pos.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(pos)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(pos.id, pos.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "직급 수정" : "직급 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>직급명 *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 시니어"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>레벨</Label>
                <Input
                  type="number"
                  min="1"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>구분</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as "rank" | "job")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rank">직급</SelectItem>
                    <SelectItem value="job">직무</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>설명</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="직급 설명 (선택)"
              />
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
    </>
  );
}
