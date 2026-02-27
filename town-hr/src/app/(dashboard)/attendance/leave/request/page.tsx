"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useLeavePolicies, createLeaveRequest } from "@/hooks/use-leave";
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

export default function LeaveRequestPage() {
  const router = useRouter();
  const { member } = useAuthContext();
  const { policies, loading: policiesLoading } = useLeavePolicies();

  const [policyId, setPolicyId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function calculateDays(): number {
    if (!startDate || !endDate) return 0;
    if (isHalfDay) return 0.5;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff + 1;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member || !policyId || !startDate || !endDate || !reason.trim()) {
      toast.error("모든 필수 항목을 입력하세요.");
      return;
    }

    const days = calculateDays();
    if (days <= 0) {
      toast.error("종료일은 시작일 이후여야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      await createLeaveRequest({
        memberId: member.id,
        policyId,
        startDate,
        endDate: isHalfDay ? startDate : endDate,
        days,
        reason: reason.trim(),
      });
      toast.success("휴가 신청이 완료되었습니다.");
      router.push("/attendance/leave");
    } catch (error) {
      console.error("Leave request error:", error);
      toast.error("휴가 신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/attendance/leave">
            <ArrowLeft className="mr-1 h-4 w-4" />
            뒤로
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">휴가 신청</h1>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-[600px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">휴가 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>휴가 종류 *</Label>
              <Select value={policyId} onValueChange={setPolicyId}>
                <SelectTrigger>
                  <SelectValue placeholder="휴가 종류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="halfDay"
                checked={isHalfDay}
                onChange={(e) => setIsHalfDay(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="halfDay" className="font-normal">
                반차 사용
              </Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{isHalfDay ? "날짜 *" : "시작일 *"}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (isHalfDay) setEndDate(e.target.value);
                  }}
                  required
                />
              </div>
              {!isHalfDay && (
                <div className="space-y-1.5">
                  <Label>종료일 *</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    required
                  />
                </div>
              )}
            </div>

            {startDate && (endDate || isHalfDay) && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                신청 일수:{" "}
                <span className="font-semibold text-primary">
                  {calculateDays()}일
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>사유 *</Label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="휴가 사유를 입력하세요"
                rows={3}
                required
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/attendance/leave">취소</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "신청 중..." : "휴가 신청"}
          </Button>
        </div>
      </form>
    </div>
  );
}
