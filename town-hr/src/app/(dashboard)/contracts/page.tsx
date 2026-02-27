"use client";

import Link from "next/link";
import { Plus, FileText, Settings } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useContracts } from "@/hooks/use-contracts";
import { useMembers } from "@/hooks/use-members";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContractStatus } from "@/types";

const STATUS_CONFIG: Record<ContractStatus, { label: string; className: string }> = {
  draft: { label: "초안", className: "bg-[#F5F5F5] text-[#737373]" },
  sent: { label: "발송됨", className: "bg-[#DBEAFE] text-[#2563EB]" },
  pending_signature: { label: "서명대기", className: "bg-[#FEF3C7] text-[#F59E0B]" },
  signed: { label: "서명완료", className: "bg-[#DCFCE7] text-[#16A34A]" },
  expired: { label: "만료됨", className: "bg-[#FEE2E2] text-[#DC2626]" },
  cancelled: { label: "취소됨", className: "bg-[#F5F5F5] text-[#737373]" },
};

export default function ContractsPage() {
  const { member, role } = useAuthContext();
  const canManage = role === "admin" || role === "manager";
  const { contracts, loading } = useContracts(
    canManage ? undefined : member?.id
  );
  const { members } = useMembers();

  function getMemberName(id: string) {
    return members.find((m) => m.id === id)?.name ?? "-";
  }

  function formatDate(ts: { toMillis: () => number } | null): string {
    if (!ts) return "-";
    return new Date(ts.toMillis()).toLocaleDateString("ko-KR");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">전자계약</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            계약서 생성, 발송, 서명을 관리합니다
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/contracts/templates">
                  <Settings className="mr-1 h-4 w-4" />
                  템플릿 관리
                </Link>
              </Button>
              <Button asChild>
                <Link href="/contracts/new">
                  <Plus className="mr-1 h-4 w-4" />
                  계약서 생성
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          <FileText className="mb-2 h-8 w-8" />
          계약서가 없습니다
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>수신자</TableHead>
                <TableHead>발신자</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>서명일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => {
                const statusInfo = STATUS_CONFIG[contract.status];
                return (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <Link
                        href={`/contracts/${contract.id}`}
                        className="font-medium hover:underline"
                      >
                        {contract.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {getMemberName(contract.recipientId)}
                    </TableCell>
                    <TableCell>
                      {getMemberName(contract.senderId)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(contract.createdAt)}</TableCell>
                    <TableCell>{formatDate(contract.signedAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
