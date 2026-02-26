"use client";

import Link from "next/link";
import { Plus, FileText, Settings, BookOpen } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useWorkflowDocuments } from "@/hooks/use-workflows";
import { useMembers } from "@/hooks/use-members";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkflowStatus } from "@/types";

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; className: string }> = {
  draft: { label: "초안", className: "bg-[#F5F5F5] text-[#737373]" },
  pending: { label: "대기중", className: "bg-[#FEF3C7] text-[#F59E0B]" },
  approved: { label: "승인됨", className: "bg-[#DCFCE7] text-[#16A34A]" },
  rejected: { label: "반려됨", className: "bg-[#FEE2E2] text-[#DC2626]" },
  on_hold: { label: "보류", className: "bg-[#DBEAFE] text-[#2563EB]" },
  cancelled: { label: "취소됨", className: "bg-[#F5F5F5] text-[#737373]" },
};

export default function WorkflowsPage() {
  const { member, role } = useAuthContext();
  const canManage = role === "admin" || role === "manager";
  const { documents: myDocs, loading: myLoading } = useWorkflowDocuments(
    member?.id
  );
  const { documents: allDocs, loading: allLoading } = useWorkflowDocuments();
  const { members } = useMembers();

  function getMemberName(id: string) {
    return members.find((m) => m.id === id)?.name ?? "-";
  }

  function formatDate(ts: { toMillis: () => number } | null): string {
    if (!ts) return "-";
    return new Date(ts.toMillis()).toLocaleDateString("ko-KR");
  }

  function DocumentTable({
    docs,
    loading,
    showSubmitter,
  }: {
    docs: typeof myDocs;
    loading: boolean;
    showSubmitter?: boolean;
  }) {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (docs.length === 0) {
      return (
        <div className="flex h-36 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          결재 문서가 없습니다
        </div>
      );
    }

    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              {showSubmitter && <TableHead>신청자</TableHead>}
              <TableHead>상태</TableHead>
              <TableHead>신청일</TableHead>
              <TableHead>완료일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((d) => {
              const statusInfo = STATUS_CONFIG[d.status];
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link
                      href={`/workflows/${d.id}`}
                      className="font-medium hover:underline"
                    >
                      {d.title}
                    </Link>
                  </TableCell>
                  {showSubmitter && (
                    <TableCell>{getMemberName(d.submittedBy)}</TableCell>
                  )}
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(d.createdAt)}</TableCell>
                  <TableCell>{formatDate(d.completedAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">전자결재</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            결재 문서를 작성하고 승인합니다
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/workflows/forms">
                  <BookOpen className="mr-1 h-4 w-4" />
                  양식 관리
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/workflows/policies">
                  <Settings className="mr-1 h-4 w-4" />
                  결재정책
                </Link>
              </Button>
            </>
          )}
          <Button asChild>
            <Link href="/workflows/new">
              <Plus className="mr-1 h-4 w-4" />
              새 결재
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">내 결재</TabsTrigger>
          {canManage && <TabsTrigger value="all">전체 결재</TabsTrigger>}
        </TabsList>
        <TabsContent value="my" className="mt-4">
          <DocumentTable docs={myDocs} loading={myLoading} />
        </TabsContent>
        {canManage && (
          <TabsContent value="all" className="mt-4">
            <DocumentTable
              docs={allDocs}
              loading={allLoading}
              showSubmitter
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
