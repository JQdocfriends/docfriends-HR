"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useContractTemplates, createContract } from "@/hooks/use-contracts";
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
import { toast } from "sonner";

export default function NewContractPage() {
  const router = useRouter();
  const { member } = useAuthContext();
  const { isAllowed, loading: guardLoading } = useRoleGuard(["admin", "manager"]);
  const { templates } = useContractTemplates();
  const { members } = useMembers();

  const [templateId, setTemplateId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (guardLoading) return null;
  if (!isAllowed) return null;

  const selectedTemplate = templates.find((t) => t.id === templateId);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      setTitle(template.name);
      setContent(template.content);
    }
  }

  function substituteVariables(text: string): string {
    const recipient = members.find((m) => m.id === recipientId);
    if (!recipient) return text;

    return text
      .replace(/\{\{name\}\}/g, recipient.name)
      .replace(/\{\{email\}\}/g, recipient.email)
      .replace(/\{\{hireDate\}\}/g, recipient.hireDate)
      .replace(/\{\{date\}\}/g, new Date().toISOString().split("T")[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member || !templateId || !recipientId || !title.trim()) {
      toast.error("모든 필수 항목을 입력하세요.");
      return;
    }

    setSubmitting(true);
    try {
      const finalContent = substituteVariables(content);
      const id = await createContract({
        templateId,
        templateVersion: selectedTemplate?.version ?? 1,
        title: title.trim(),
        recipientId,
        senderId: member.id,
        content: finalContent,
      });
      toast.success("계약서가 생성되었습니다.");
      router.push(`/contracts/${id}`);
    } catch (error) {
      console.error("Contract creation error:", error);
      toast.error("계약서 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/contracts">
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">계약서 생성</h1>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-[800px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">계약 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>템플릿 *</Label>
                <Select value={templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="템플릿 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>수신자 *</Label>
                <Select value={recipientId} onValueChange={setRecipientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="수신자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {members
                      .filter((m) => m.status === "active")
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>제목 *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="계약서 제목"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>내용</Label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="계약서 내용을 입력하세요. {{name}}, {{email}}, {{hireDate}}, {{date}} 변수를 사용할 수 있습니다."
              />
              {selectedTemplate && selectedTemplate.variables.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  사용 가능한 변수:{" "}
                  {selectedTemplate.variables
                    .map((v) => `{{${v}}}`)
                    .join(", ")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/contracts">취소</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "생성 중..." : "계약서 생성"}
          </Button>
        </div>
      </form>
    </div>
  );
}
