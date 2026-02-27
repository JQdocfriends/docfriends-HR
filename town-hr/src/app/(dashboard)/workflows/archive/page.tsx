"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, FileText, Filter } from "lucide-react";
import { useWorkflowDocuments } from "@/hooks/use-workflows";
import { useMembers } from "@/hooks/use-members";
import { useAuthContext } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkflowStatus } from "@/types";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  approved: { label: "승인됨", className: "bg-[#DCFCE7] text-[#16A34A]" },
  rejected: { label: "반려됨", className: "bg-[#FEE2E2] text-[#DC2626]" },
  cancelled: { label: "취소됨", className: "bg-[#F5F5F5] text-[#737373]" },
};

const TERMINAL_STATUSES: WorkflowStatus[] = ["approved", "rejected", "cancelled"];

type FilterTab = "all" | "approved" | "rejected" | "cancelled";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "approved", label: "승인됨" },
  { value: "rejected", label: "반려됨" },
  { value: "cancelled", label: "취소됨" },
];

export default function WorkflowArchivePage() {
  const { documents, loading } = useWorkflowDocuments();
  const { members } = useMembers();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  function getMemberName(memberId: string) {
    return members.find((m) => m.id === memberId)?.name ?? memberId;
  }

  const filteredDocuments = useMemo(() => {
    let filtered = documents.filter((doc) =>
      TERMINAL_STATUSES.includes(doc.status)
    );

    if (activeTab !== "all") {
      filtered = filtered.filter((doc) => doc.status === activeTab);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((doc) =>
        doc.title.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [documents, activeTab, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">결재 보관함</h1>
        <p className="text-sm text-muted-foreground">
          완료된 결재 문서를 조회합니다
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 rounded-lg border p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="문서 제목으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Document List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <FileText className="h-10 w-10" />
            <p className="text-sm">
              {searchQuery.trim()
                ? "검색 결과가 없습니다"
                : "보관된 결재 문서가 없습니다"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredDocuments.map((doc) => {
                const statusInfo = STATUS_CONFIG[doc.status];
                return (
                  <Link
                    key={doc.id}
                    href={`/workflows/${doc.id}`}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {doc.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getMemberName(doc.submittedBy)}
                        {doc.completedAt &&
                          ` \u00B7 ${new Date(
                            doc.completedAt.toMillis()
                          ).toLocaleDateString("ko-KR")}`}
                      </p>
                    </div>
                    {statusInfo && (
                      <span
                        className={`ml-4 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
