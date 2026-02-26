"use client";

import { useState } from "react";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { companyDocRef } from "@/lib/firebase/collections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { MemberRole } from "@/types";

interface InviteEntry {
  email: string;
  role: MemberRole;
}

interface StepInviteProps {
  onComplete: () => void;
  onBack: () => void;
}

export function StepInvite({ onComplete, onBack }: StepInviteProps) {
  const [saving, setSaving] = useState(false);
  const [invites, setInvites] = useState<InviteEntry[]>([
    { email: "", role: "employee" },
  ]);

  function addInvite() {
    setInvites([...invites, { email: "", role: "employee" }]);
  }

  function removeInvite(index: number) {
    setInvites(invites.filter((_, i) => i !== index));
  }

  function updateEmail(index: number, email: string) {
    const updated = [...invites];
    updated[index].email = email;
    setInvites(updated);
  }

  function updateRole(index: number, role: MemberRole) {
    const updated = [...invites];
    updated[index].role = role;
    setInvites(updated);
  }

  async function handleComplete(skip: boolean) {
    setSaving(true);
    try {
      // Store invited emails for later processing (TASK-008 will implement actual invite)
      const validInvites = skip
        ? []
        : invites.filter((inv) => inv.email.trim());

      await setDoc(
        companyDocRef,
        {
          setupCompleted: true,
          pendingInvites: validInvites.map((inv) => ({
            email: inv.email.trim().toLowerCase(),
            role: inv.role,
          })),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (validInvites.length > 0) {
        toast.success(`${validInvites.length}명의 초대가 등록되었습니다`);
      }
      toast.success("초기 설정이 완료되었습니다!");
      onComplete();
    } catch (error) {
      console.error("Failed to complete setup:", error);
      toast.error("저장에 실패했습니다. 다시 시도해주세요");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>구성원 초대</CardTitle>
        <CardDescription>
          함께 사용할 구성원을 초대해주세요. 나중에 초대할 수도 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invites.map((invite, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={invite.email}
                onChange={(e) => updateEmail(index, e.target.value)}
                placeholder="이메일 주소"
                type="email"
                className="flex-1"
              />
              <Select
                value={invite.role}
                onValueChange={(v) => updateRole(index, v as MemberRole)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">관리자</SelectItem>
                  <SelectItem value="manager">매니저</SelectItem>
                  <SelectItem value="employee">구성원</SelectItem>
                </SelectContent>
              </Select>
              {invites.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInvite(index)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addInvite}
          >
            <Plus className="mr-2 h-4 w-4" />
            초대 추가
          </Button>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              이전
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleComplete(true)}
                disabled={saving}
              >
                건너뛰기
              </Button>
              <Button
                type="button"
                onClick={() => handleComplete(false)}
                disabled={saving}
              >
                {saving ? "완료 중..." : "완료"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
