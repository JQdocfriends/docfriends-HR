"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useContracts } from "@/hooks/use-contracts";
import { useMembers } from "@/hooks/use-members";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { Contract, ContractStatus, ContractStatusChange } from "@/types";

const STATUS_CONFIG: Record<ContractStatus, { label: string; className: string; dotColor: string }> = {
  draft: { label: "초안", className: "bg-[#F5F5F5] text-[#737373]", dotColor: "bg-[#737373]" },
  sent: { label: "발송됨", className: "bg-[#DBEAFE] text-[#2563EB]", dotColor: "bg-[#2563EB]" },
  pending_signature: { label: "서명대기", className: "bg-[#FEF3C7] text-[#F59E0B]", dotColor: "bg-[#F59E0B]" },
  signed: { label: "서명완료", className: "bg-[#DCFCE7] text-[#16A34A]", dotColor: "bg-[#16A34A]" },
  expired: { label: "만료됨", className: "bg-[#FEE2E2] text-[#DC2626]", dotColor: "bg-[#DC2626]" },
  cancelled: { label: "취소됨", className: "bg-[#F5F5F5] text-[#737373]", dotColor: "bg-[#737373]" },
};

const PAGE_SIZE = 20;

function StatusTimeline({ history, getMemberName }: { history: ContractStatusChange[]; getMemberName: (id: string) => string }) {
  if (!history || history.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 py-2">
      {history.map((entry, i) => {
        const config = STATUS_CONFIG[entry.status as ContractStatus];
        return (
          <div key={i} className="flex items-start gap-2">
            <div className="flex flex-col items-center">
              <div className={`h-2.5 w-2.5 rounded-full mt-1 ${config?.dotColor ?? "bg-gray-400"}`} />
              {i < history.length - 1 && <div className="w-px flex-1 bg-border min-h-[16px]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config?.className ?? "bg-gray-100 text-gray-600"}`}>
                  {config?.label ?? entry.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getMemberName(entry.changedBy)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.changedAt
                  ? new Date(entry.changedAt.toMillis()).toLocaleString("ko-KR")
                  : "-"}
                {entry.comment && ` - ${entry.comment}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ContractHistoryPage() {
  const router = useRouter();
  const { contracts, loading } = useContracts();
  const { members } = useMembers();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  function getMemberName(id: string) {
    return members.find((m) => m.id === id)?.name ?? "-";
  }

  function formatDate(ts: { toMillis: () => number } | null): string {
    if (!ts) return "-";
    return new Date(ts.toMillis()).toLocaleDateString("ko-KR");
  }

  const filtered = useMemo(() => {
    let result = [...contracts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        const recipientName = getMemberName(c.recipientId).toLowerCase();
        return c.title.toLowerCase().includes(q) || recipientName.includes(q);
      });
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((c) => c.createdAt && c.createdAt.toMillis() >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      result = result.filter((c) => c.createdAt && c.createdAt.toMillis() < to);
    }

    result.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() ?? 0;
      const bTime = b.createdAt?.toMillis() ?? 0;
      return bTime - aTime;
    });

    return result;
  }, [contracts, searchQuery, statusFilter, dateFrom, dateTo, members]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
          <div>
            <h1 className="text-2xl font-bold tracking-tight">계약 이력</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              전체 계약서 이력과 상태 변경 타임라인을 조회합니다
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="제목 또는 수신자 이름 검색..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="w-[150px]"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="w-[150px]"
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          <FileText className="mb-2 h-8 w-8" />
          조건에 맞는 계약서가 없습니다
        </div>
      ) : (
        <>
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
                {paginated.map((contract) => {
                  const statusInfo = STATUS_CONFIG[contract.status];
                  const isExpanded = expandedRow === contract.id;
                  return (
                    <>
                      <TableRow
                        key={contract.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(isExpanded ? null : contract.id)}
                      >
                        <TableCell>
                          <Link
                            href={`/contracts/${contract.id}`}
                            className="font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contract.title}
                          </Link>
                        </TableCell>
                        <TableCell>{getMemberName(contract.recipientId)}</TableCell>
                        <TableCell>{getMemberName(contract.senderId)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(contract.createdAt)}</TableCell>
                        <TableCell>{formatDate(contract.signedAt)}</TableCell>
                      </TableRow>
                      {isExpanded && contract.statusHistory && contract.statusHistory.length > 0 && (
                        <TableRow key={`${contract.id}-timeline`}>
                          <TableCell colSpan={6} className="bg-muted/30 px-6">
                            <div className="py-2">
                              <p className="text-xs font-medium text-muted-foreground mb-2">상태 변경 이력</p>
                              <StatusTimeline history={contract.statusHistory} getMemberName={getMemberName} />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              총 {filtered.length}건 중 {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)}건
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
