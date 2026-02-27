"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Download } from "lucide-react";
import { useMembers } from "@/hooks/use-members";
import { useDepartments, usePositions } from "@/hooks/use-departments";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { MemberStatus } from "@/types";

const STATUS_CONFIG: Record<
  MemberStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "재직중", variant: "default" },
  on_leave: { label: "휴직중", variant: "secondary" },
  resigned: { label: "퇴사", variant: "outline" },
};

const PAGE_SIZE = 20;

export default function MembersPage() {
  const { members, loading } = useMembers();
  const { departments } = useDepartments();
  const { positions } = usePositions();
  const { role } = useAuthContext();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const canManage = role === "admin" || role === "manager";

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || m.status === statusFilter;
      const matchesDept =
        departmentFilter === "all" || m.departmentId === departmentFilter;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [members, search, statusFilter, departmentFilter]);

  const totalPages = Math.ceil(filteredMembers.length / PAGE_SIZE);
  const pagedMembers = filteredMembers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  function getDepartmentName(id: string | null) {
    if (!id) return "-";
    return departments.find((d) => d.id === id)?.name ?? "-";
  }

  function getPositionName(id: string | null) {
    if (!id) return "-";
    return positions.find((p) => p.id === id)?.name ?? "-";
  }

  function handleExportCSV() {
    const headers = ["이름", "이메일", "부서", "직급", "상태", "입사일"];
    const rows = filteredMembers.map((m) => [
      m.name,
      m.email,
      getDepartmentName(m.departmentId),
      getPositionName(m.positionId),
      STATUS_CONFIG[m.status]?.label ?? m.status,
      m.hireDate,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `구성원목록_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">구성원</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 {members.length}명의 구성원을 관리합니다
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/members/invite">
              <Plus className="mr-2 h-4 w-4" />
              구성원 초대
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="이름 또는 이메일로 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="active">재직중</SelectItem>
            <SelectItem value="on_leave">휴직중</SelectItem>
            <SelectItem value="resigned">퇴사</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={departmentFilter}
          onValueChange={(v) => {
            setDepartmentFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="부서" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 부서</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManage && (
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : pagedMembers.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {search || statusFilter !== "all" || departmentFilter !== "all"
            ? "검색 결과가 없습니다"
            : "등록된 구성원이 없습니다"}
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>직급</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>입사일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedMembers.map((member) => {
                  const status = STATUS_CONFIG[member.status];
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Link
                          href={`/members/${member.id}`}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={member.profileImageUrl ?? undefined}
                              alt={member.name}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {member.name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {member.email}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {getDepartmentName(member.departmentId)}
                      </TableCell>
                      <TableCell>
                        {getPositionName(member.positionId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>{member.hireDate}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                총 {filteredMembers.length}명
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  이전
                </Button>
                <span className="text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
