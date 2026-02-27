"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useContractTemplates, createContractTemplate } from "@/hooks/use-contracts";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { ContractCategory } from "@/types";

const CATEGORY_LABELS: Record<ContractCategory, string> = {
  employment: "근로계약서",
  nda: "비밀유지계약",
  security: "보안서약",
  other: "기타",
};

export default function ContractTemplatesPage() {
  const { member } = useAuthContext();
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin", "manager"]);
  const { templates, loading } = useContractTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ContractCategory>("employment");
  const [content, setContent] = useState("");
  const [variables, setVariables] = useState("name,email,hireDate,date");
  const [submitting, setSubmitting] = useState(false);

  if (guardLoading) return null;
  if (!isAllowed) return null;

  function openCreate() {
    setName("");
    setCategory("employment");
    setContent("");
    setVariables("name,email,hireDate,date");
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim() || !content.trim() || !member) {
      toast.error("필수 항목을 입력하세요.");
      return;
    }
    setSubmitting(true);
    try {
      await createContractTemplate({
        name: name.trim(),
        category,
        content: content.trim(),
        variables: variables.split(",").map((v) => v.trim()).filter(Boolean),
        isDefault: false,
        createdBy: member.id,
        version: 1,
        isActive: true,
      });
      toast.success("템플릿이 등록되었습니다.");
      setDialogOpen(false);
    } catch {
      toast.error("등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
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
          <h1 className="text-2xl font-bold tracking-tight">계약서 템플릿</h1>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          템플릿 추가
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : templates.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          등록된 템플릿이 없습니다
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>템플릿명</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>변수</TableHead>
                  <TableHead>버전</TableHead>
                  <TableHead>기본</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tmpl) => (
                  <TableRow key={tmpl.id}>
                    <TableCell className="font-medium">{tmpl.name}</TableCell>
                    <TableCell>
                      {CATEGORY_LABELS[tmpl.category] ?? tmpl.category}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {tmpl.variables.map((v) => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>v{tmpl.version}</TableCell>
                    <TableCell>
                      {tmpl.isDefault && (
                        <Badge variant="outline">기본</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>템플릿 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>템플릿명 *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 표준 근로계약서"
                />
              </div>
              <div className="space-y-1.5">
                <Label>구분</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as ContractCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employment">근로계약서</SelectItem>
                    <SelectItem value="nda">비밀유지계약</SelectItem>
                    <SelectItem value="security">보안서약</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>변수 (쉼표 구분)</Label>
              <Input
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                placeholder="name,email,hireDate,date"
              />
            </div>
            <div className="space-y-1.5">
              <Label>내용 *</Label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="계약서 내용을 입력하세요. {{변수명}} 형식으로 변수를 삽입할 수 있습니다."
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
    </div>
  );
}
