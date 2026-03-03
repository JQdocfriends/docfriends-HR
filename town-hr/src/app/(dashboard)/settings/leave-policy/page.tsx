"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
import { companyDocRef, leavePoliciesRef } from "@/lib/firebase/collections";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { LeavePolicy, LeaveType } from "@/types";
import { LegalDisclaimer } from "@/components/common/legal-disclaimer";

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "annual", label: "연차" },
  { value: "family_care", label: "가족돌봄" },
  { value: "military", label: "군소집훈련" },
  { value: "infertility", label: "난임 치료" },
  { value: "spouse_birth", label: "배우자출산" },
  { value: "marriage_self", label: "결혼 - 본인" },
  { value: "marriage_child", label: "결혼 - 자녀" },
  { value: "condolence_spouse", label: "조의 - 배우자" },
  { value: "condolence_parents", label: "조의 - 부모/자녀" },
  { value: "condolence_grandparents", label: "조의 - 조부모/형제/자매" },
  { value: "first_snow", label: "첫눈 휴가" },
  { value: "health_checkup", label: "건강검진 휴가" },
];

const DEFAULT_POLICIES: Omit<LeavePolicy, "id" | "createdAt" | "updatedAt">[] = [
  { name: "연차휴가", type: "annual", grantType: "annual", annualDays: 15, grantDays: null, unit: "days", isPaid: true, requiresApproval: true, autoApprove: false, minNoticeDays: 3, description: "근로기준법 제60조에 의한 연차유급휴가", isActive: true },
  { name: "가족돌봄", type: "family_care", grantType: "per_request", annualDays: null, grantDays: 1, unit: "days", isPaid: false, requiresApproval: true, autoApprove: false, minNoticeDays: 0, description: "가족의 질병·사고·노령으로 인한 돌봄 휴가", isActive: true },
  { name: "군소집훈련", type: "military", grantType: "per_request", annualDays: null, grantDays: null, unit: "days", isPaid: true, requiresApproval: true, autoApprove: false, minNoticeDays: 7, description: "예비군/민방위 훈련 휴가", isActive: true },
  { name: "난임 치료", type: "infertility", grantType: "annual", annualDays: 3, grantDays: null, unit: "days", isPaid: true, requiresApproval: true, autoApprove: false, minNoticeDays: 3, description: "난임 치료를 위한 휴가 (연 3일)", isActive: true },
  { name: "배우자출산", type: "spouse_birth", grantType: "per_request", annualDays: null, grantDays: 10, unit: "days", isPaid: true, requiresApproval: true, autoApprove: false, minNoticeDays: 0, description: "배우자 출산 시 부여되는 휴가", isActive: true },
  { name: "결혼 - 본인", type: "marriage_self", grantType: "per_request", annualDays: null, grantDays: 5, unit: "days", isPaid: true, requiresApproval: true, autoApprove: false, minNoticeDays: 7, description: "본인 결혼 경조사 휴가", isActive: true },
  { name: "결혼 - 자녀", type: "marriage_child", grantType: "per_request", annualDays: null, grantDays: 1, unit: "days", isPaid: true, requiresApproval: true, autoApprove: false, minNoticeDays: 3, description: "자녀 결혼 경조사 휴가", isActive: true },
  { name: "조의 - 배우자", type: "condolence_spouse", grantType: "per_request", annualDays: null, grantDays: 5, unit: "days", isPaid: true, requiresApproval: true, autoApprove: false, minNoticeDays: 0, description: "배우자 사망 시 경조사 휴가", isActive: true },
  { name: "조의 - 부모/자녀", type: "condolence_parents", grantType: "per_request", annualDays: null, grantDays: 3, unit: "days", isPaid: true, requiresApproval: true, autoApprove: false, minNoticeDays: 0, description: "부모 또는 자녀 사망 시 경조사 휴가", isActive: true },
  { name: "조의 - 조부모/형제/자매", type: "condolence_grandparents", grantType: "per_request", annualDays: null, grantDays: 2, unit: "days", isPaid: true, requiresApproval: true, autoApprove: false, minNoticeDays: 0, description: "조부모, 형제, 자매 사망 시 경조사 휴가", isActive: true },
  { name: "첫눈 휴가", type: "first_snow", grantType: "per_request", annualDays: null, grantDays: 4, unit: "hours", isPaid: true, requiresApproval: true, autoApprove: false, minNoticeDays: 0, description: "첫눈 오는 날 조기 퇴근", isActive: true },
  { name: "건강검진 휴가", type: "health_checkup", grantType: "per_request", annualDays: null, grantDays: 4, unit: "hours", isPaid: true, requiresApproval: true, autoApprove: false, minNoticeDays: 1, description: "건강검진을 위한 휴가", isActive: true },
];

export default function LeavePolicySettingsPage() {
  const { company, loading: companyLoading } = useCompany();
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Global config
  const [annualLeaveBase, setAnnualLeaveBase] = useState<"hire_date" | "fiscal_year">("hire_date");
  const [fiscalYearStart, setFiscalYearStart] = useState("01-01");
  const [probationMonths, setProbationMonths] = useState(3);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<LeaveType>("annual");
  const [formAnnualDays, setFormAnnualDays] = useState<number | "">(15);
  const [formIsPaid, setFormIsPaid] = useState(true);
  const [formRequiresApproval, setFormRequiresApproval] = useState(true);
  const [formAutoApprove, setFormAutoApprove] = useState(false);
  const [formMinNoticeDays, setFormMinNoticeDays] = useState(3);
  const [formDescription, setFormDescription] = useState("");
  const [formGrantType, setFormGrantType] = useState<"annual" | "per_request">("annual");
  const [formGrantDays, setFormGrantDays] = useState<number | "">(1);
  const [formUnit, setFormUnit] = useState<"days" | "hours">("days");

  const fetchPolicies = useCallback(async () => {
    try {
      const snapshot = await getDocs(leavePoliciesRef);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LeavePolicy));
      setPolicies(data);
    } catch (error) {
      console.error("Failed to fetch leave policies:", error);
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    if (company?.leavePolicy) {
      setAnnualLeaveBase(company.leavePolicy.annualLeaveBase);
      setFiscalYearStart(company.leavePolicy.fiscalYearStart);
      setProbationMonths(company.leavePolicy.probationMonths);
    }
  }, [company]);

  async function handleSaveGlobalConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(companyDocRef, {
        leavePolicy: { annualLeaveBase, fiscalYearStart, probationMonths },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success("휴가 정책이 저장되었습니다");
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  async function seedDefaults() {
    setSaving(true);
    try {
      for (const policy of DEFAULT_POLICIES) {
        const ref = doc(leavePoliciesRef);
        await setDoc(ref, { ...policy, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      toast.success("기본 휴가 유형이 생성되었습니다");
      await fetchPolicies();
    } catch (error) {
      console.error("Failed to seed:", error);
      toast.error("생성에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditingPolicy(null);
    setFormName("");
    setFormType("annual");
    setFormAnnualDays(15);
    setFormIsPaid(true);
    setFormRequiresApproval(true);
    setFormAutoApprove(false);
    setFormMinNoticeDays(3);
    setFormDescription("");
    setFormGrantType("annual");
    setFormGrantDays("");
    setFormUnit("days");
    setDialogOpen(true);
  }

  function openEdit(policy: LeavePolicy) {
    setEditingPolicy(policy);
    setFormName(policy.name);
    setFormType(policy.type);
    setFormAnnualDays(policy.annualDays ?? "");
    setFormIsPaid(policy.isPaid);
    setFormRequiresApproval(policy.requiresApproval);
    setFormAutoApprove(policy.autoApprove);
    setFormMinNoticeDays(policy.minNoticeDays);
    setFormDescription(policy.description ?? "");
    setFormGrantType(policy.grantType ?? "annual");
    setFormGrantDays(policy.grantDays ?? "");
    setFormUnit(policy.unit ?? "days");
    setDialogOpen(true);
  }

  async function handleSavePolicy() {
    if (!formName.trim()) {
      toast.error("휴가명을 입력해주세요");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: formName.trim(),
        type: formType,
        annualDays: formAnnualDays === "" ? null : Number(formAnnualDays),
        isPaid: formIsPaid,
        requiresApproval: formRequiresApproval,
        autoApprove: formAutoApprove,
        minNoticeDays: formMinNoticeDays,
        description: formDescription.trim() || null,
        grantType: formGrantType,
        grantDays: formGrantDays === "" ? null : Number(formGrantDays),
        unit: formUnit,
        isActive: editingPolicy?.isActive ?? true,
        updatedAt: serverTimestamp(),
      };

      if (editingPolicy) {
        await setDoc(doc(leavePoliciesRef, editingPolicy.id), { ...data }, { merge: true });
      } else {
        const ref = doc(leavePoliciesRef);
        await setDoc(ref, { ...data, createdAt: serverTimestamp() });
      }

      toast.success(editingPolicy ? "수정되었습니다" : "추가되었습니다");
      setDialogOpen(false);
      await fetchPolicies();
    } catch (error) {
      console.error("Failed to save policy:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePolicy(policy: LeavePolicy) {
    if (!confirm(`"${policy.name}" 휴가 유형을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(leavePoliciesRef, policy.id));
      toast.success("삭제되었습니다");
      await fetchPolicies();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("삭제에 실패했습니다");
    }
  }

  async function handleToggleActive(policy: LeavePolicy) {
    try {
      await setDoc(doc(leavePoliciesRef, policy.id), { isActive: !policy.isActive, updatedAt: serverTimestamp() }, { merge: true });
      await fetchPolicies();
    } catch (error) {
      console.error("Failed to toggle:", error);
    }
  }

  if (companyLoading || policiesLoading) {
    return <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent className="space-y-4">{Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full" />))}</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      {/* Global Config */}
      <Card>
        <CardHeader>
          <CardTitle>휴가 정책 설정</CardTitle>
          <CardDescription>연차 산정 기준과 수습 기간을 설정합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveGlobalConfig} className="space-y-4">
            <div className="space-y-2">
              <Label>연차 산정 기준</Label>
              <Select value={annualLeaveBase} onValueChange={(v) => setAnnualLeaveBase(v as "hire_date" | "fiscal_year")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hire_date">입사일 기준</SelectItem>
                  <SelectItem value="fiscal_year">회계연도 기준</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {annualLeaveBase === "fiscal_year" && (
              <div className="space-y-2">
                <Label htmlFor="fiscalYearStart">회계연도 시작일</Label>
                <Input id="fiscalYearStart" value={fiscalYearStart} onChange={(e) => setFiscalYearStart(e.target.value)} placeholder="MM-DD (예: 01-01)" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="probationMonths">수습 기간 (개월)</Label>
              <Input id="probationMonths" type="number" min={0} max={12} value={probationMonths} onChange={(e) => setProbationMonths(Number(e.target.value))} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Leave Types Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>휴가 유형</CardTitle>
            <CardDescription>휴가 유형별 세부 정책을 관리합니다</CardDescription>
          </div>
          <div className="flex gap-2">
            {policies.length === 0 && (
              <Button variant="outline" onClick={seedDefaults} disabled={saving}>
                기본값 생성
              </Button>
            )}
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              등록된 휴가 유형이 없습니다. 기본값을 생성하거나 직접 추가해주세요.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>휴가명</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>부여</TableHead>
                  <TableHead>유급</TableHead>
                  <TableHead>승인필요</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.name}</TableCell>
                    <TableCell>{LEAVE_TYPES.find((t) => t.value === policy.type)?.label}</TableCell>
                    <TableCell>
                      {policy.grantType === "annual"
                        ? `연 ${policy.annualDays ?? "-"}${policy.unit === "hours" ? "시간" : "일"}`
                        : policy.grantDays
                          ? `${policy.grantDays}${policy.unit === "hours" ? "시간" : "일"}/건`
                          : "건별"}
                    </TableCell>
                    <TableCell>{policy.isPaid ? "유급" : "무급"}</TableCell>
                    <TableCell>{policy.requiresApproval ? "필요" : "불필요"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={policy.isActive ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggleActive(policy)}
                      >
                        {policy.isActive ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(policy)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePolicy(policy)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPolicy ? "휴가 유형 수정" : "휴가 유형 추가"}</DialogTitle>
            <DialogDescription>휴가 유형의 세부 정책을 설정합니다</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="policyName">휴가명 *</Label>
              <Input id="policyName" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="예: 연차휴가" />
            </div>
            <div className="space-y-2">
              <Label>유형</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as LeaveType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="annualDays">연간 일수 (무제한은 비워두세요)</Label>
              <Input id="annualDays" type="number" min={0} value={formAnnualDays} onChange={(e) => setFormAnnualDays(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>부여 방식</Label>
              <Select value={formGrantType} onValueChange={(v) => setFormGrantType(v as "annual" | "per_request")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">연간 배정</SelectItem>
                  <SelectItem value="per_request">건별 부여</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formGrantType === "per_request" && (
              <div className="space-y-2">
                <Label htmlFor="grantDays">건당 부여 일수/시간 (미정은 비워두세요)</Label>
                <Input id="grantDays" type="number" min={0} value={formGrantDays} onChange={(e) => setFormGrantDays(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>단위</Label>
              <Select value={formUnit} onValueChange={(v) => setFormUnit(v as "days" | "hours")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">일</SelectItem>
                  <SelectItem value="hours">시간</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minNoticeDays">최소 사전 신청일</Label>
              <Input id="minNoticeDays" type="number" min={0} value={formMinNoticeDays} onChange={(e) => setFormMinNoticeDays(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Input id="description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="isPaid" checked={formIsPaid} onCheckedChange={(c) => setFormIsPaid(c === true)} />
                <Label htmlFor="isPaid">유급 휴가</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="requiresApproval" checked={formRequiresApproval} onCheckedChange={(c) => setFormRequiresApproval(c === true)} />
                <Label htmlFor="requiresApproval">승인 필요</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="autoApprove" checked={formAutoApprove} onCheckedChange={(c) => setFormAutoApprove(c === true)} />
                <Label htmlFor="autoApprove">자동 승인</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSavePolicy} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LegalDisclaimer message="연차 계산은 참고용이며, 실제 적용은 노무사와 상담하세요." />
    </div>
  );
}
