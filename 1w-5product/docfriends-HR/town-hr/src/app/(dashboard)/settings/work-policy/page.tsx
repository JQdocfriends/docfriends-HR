"use client";

import { useState, useEffect } from "react";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { companyDocRef } from "@/lib/firebase/collections";
import { useCompany } from "@/contexts/company-context";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { WorkType } from "@/types";

const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: "fixed", label: "고정 근무" },
  { value: "flexible", label: "유연 근무" },
  { value: "staggered", label: "시차 근무" },
  { value: "remote", label: "재택 근무" },
  { value: "hybrid", label: "하이브리드" },
];

export default function WorkPolicySettingsPage() {
  const { company, loading } = useCompany();
  const [saving, setSaving] = useState(false);
  const [defaultWorkType, setDefaultWorkType] = useState<WorkType>("fixed");
  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [workEndTime, setWorkEndTime] = useState("18:00");
  const [flexRange, setFlexRange] = useState(120);
  const [lunchBreakMinutes, setLunchBreakMinutes] = useState(60);
  const [lunchStartTime, setLunchStartTime] = useState("12:00");
  const [weeklyHoursLimit, setWeeklyHoursLimit] = useState(52);
  const [overtimeAlertThreshold, setOvertimeAlertThreshold] = useState(40);
  const [weekStartDay, setWeekStartDay] = useState<"monday" | "sunday">("monday");

  useEffect(() => {
    if (company?.workPolicy) {
      const wp = company.workPolicy;
      setDefaultWorkType(wp.defaultWorkType);
      setWorkStartTime(wp.workStartTime);
      setWorkEndTime(wp.workEndTime);
      setFlexRange(wp.flexRange);
      setLunchBreakMinutes(wp.lunchBreakMinutes);
      setLunchStartTime(wp.lunchStartTime);
      setWeeklyHoursLimit(wp.weeklyHoursLimit);
      setOvertimeAlertThreshold(wp.overtimeAlertThreshold);
      setWeekStartDay(wp.weekStartDay);
    }
  }, [company]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(companyDocRef, {
        workPolicy: {
          defaultWorkType, workStartTime, workEndTime, flexRange,
          lunchBreakMinutes, lunchStartTime, weeklyHoursLimit,
          overtimeAlertThreshold, weekStartDay,
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success("근무 정책이 저장되었습니다");
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent className="space-y-4">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full" />))}</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>근무 정책</CardTitle>
        <CardDescription>회사의 근무 정책을 관리합니다</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>근무 유형</Label>
            <Select value={defaultWorkType} onValueChange={(v) => setDefaultWorkType(v as WorkType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WORK_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workStartTime">출근 시간</Label>
              <Input id="workStartTime" type="time" value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workEndTime">퇴근 시간</Label>
              <Input id="workEndTime" type="time" value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)} />
            </div>
          </div>
          {defaultWorkType === "flexible" && (
            <div className="space-y-2">
              <Label htmlFor="flexRange">유연근무 범위 (분)</Label>
              <Input id="flexRange" type="number" min={0} max={240} value={flexRange} onChange={(e) => setFlexRange(Number(e.target.value))} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lunchStartTime">점심 시작</Label>
              <Input id="lunchStartTime" type="time" value={lunchStartTime} onChange={(e) => setLunchStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lunchBreakMinutes">점심 시간 (분)</Label>
              <Input id="lunchBreakMinutes" type="number" min={30} max={120} value={lunchBreakMinutes} onChange={(e) => setLunchBreakMinutes(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weeklyHoursLimit">주간 근무 상한 (시간)</Label>
              <Input id="weeklyHoursLimit" type="number" min={40} max={68} value={weeklyHoursLimit} onChange={(e) => setWeeklyHoursLimit(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overtimeAlertThreshold">초과근무 알림 기준 (시간)</Label>
              <Input id="overtimeAlertThreshold" type="number" min={20} max={52} value={overtimeAlertThreshold} onChange={(e) => setOvertimeAlertThreshold(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>주 시작일</Label>
            <Select value={weekStartDay} onValueChange={(v) => setWeekStartDay(v as "monday" | "sunday")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">월요일</SelectItem>
                <SelectItem value="sunday">일요일</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
