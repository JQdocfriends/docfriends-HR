"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { updateMember } from "@/hooks/use-members";
import { useDepartments, useTeams, usePositions } from "@/hooks/use-departments";
import { useAuthContext } from "@/contexts/auth-context";
import { uploadProfileImage } from "@/lib/firebase/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { MemberRole, MemberStatus, WorkType } from "@/types";

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "admin", label: "관리자" },
  { value: "manager", label: "매니저" },
  { value: "employee", label: "직원" },
];

const WORK_TYPE_OPTIONS: { value: WorkType; label: string }[] = [
  { value: "fixed", label: "고정근무" },
  { value: "flexible", label: "유연근무" },
  { value: "staggered", label: "시차근무" },
  { value: "remote", label: "재택근무" },
  { value: "hybrid", label: "하이브리드" },
];

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "재직중",
  on_leave: "휴직중",
  resigned: "퇴사",
};

export default function ProfilePage() {
  const router = useRouter();
  const { member, role: currentUserRole, loading, setMember } = useAuthContext();
  const { departments } = useDepartments();
  const { teams } = useTeams();
  const { positions } = usePositions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUserRole === "admin";

  // Personal info (always editable by user)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // Org info (only editable by admin)
  const [departmentId, setDepartmentId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [workType, setWorkType] = useState<WorkType>("fixed");
  const [role, setRole] = useState<MemberRole>("employee");
  const [status, setStatus] = useState<MemberStatus>("active");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // Populate form when member loads
  useEffect(() => {
    if (member) {
      setName(member.name);
      setPhone(member.phone ?? "");
      setBirthDate(member.birthDate ?? "");
      setDepartmentId(member.departmentId ?? "");
      setTeamId(member.teamId ?? "");
      setPositionId(member.positionId ?? "");
      setJobTitle(member.jobTitle ?? "");
      setWorkType(member.workType);
      setRole(member.role);
      setStatus(member.status);
      setProfileImageUrl(member.profileImageUrl);
    }
  }, [member]);

  // Filter teams by selected department
  const filteredTeams = departmentId
    ? teams.filter((t) => t.departmentId === departmentId)
    : teams;

  // Find display names for read-only org info
  const departmentName = departments.find((d) => d.id === member?.departmentId)?.name ?? "-";
  const teamName = teams.find((t) => t.id === member?.teamId)?.name ?? "-";
  const positionName = positions.find((p) => p.id === member?.positionId)?.name ?? "-";
  const workTypeLabel = WORK_TYPE_OPTIONS.find((o) => o.value === member?.workType)?.label ?? "-";

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    setUploading(true);
    try {
      const url = await uploadProfileImage(member.uid, file);
      await updateMember(member.id, { profileImageUrl: url });
      setProfileImageUrl(url);
      setMember({ ...member, profileImageUrl: url });
      toast.success("프로필 사진이 변경되었습니다.");
    } catch (err) {
      console.error("Failed to upload profile image:", err);
      toast.error("프로필 사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!member) return;
    setSaving(true);
    try {
      const personalData = {
        name,
        phone: phone || null,
        birthDate: birthDate || null,
      };

      const adminData = isAdmin
        ? {
            departmentId: departmentId || null,
            teamId: teamId || null,
            positionId: positionId || null,
            jobTitle: jobTitle || null,
            workType,
            role,
            status,
          }
        : {};

      const updateData = { ...personalData, ...adminData };
      await updateMember(member.id, updateData);
      setMember({ ...member, ...updateData });
      toast.success("프로필이 저장되었습니다.");
    } catch (err) {
      console.error("Failed to update profile:", err);
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!member) {
    router.push("/members");
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">내 프로필</h1>

      {/* Profile photo */}
      <Card>
        <CardContent className="flex items-center gap-6 pt-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={profileImageUrl ?? undefined}
                alt={member.name}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {member.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{member.name}</p>
            <p className="text-xs text-muted-foreground">
              {uploading ? "업로드 중..." : "사진을 클릭하여 프로필 사진을 변경할 수 있습니다."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Basic info - always editable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>이메일</Label>
              <p className="text-sm text-muted-foreground py-2">{member.email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">생년월일</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Org info - read-only for staff, editable for admin */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">소속 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>부서</Label>
                <Select
                  value={departmentId}
                  onValueChange={(v) => {
                    setDepartmentId(v);
                    setTeamId("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="부서 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>팀</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>직급</Label>
                <Select value={positionId} onValueChange={setPositionId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="직급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">직책</Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="예: CTO, 팀장"
                />
              </div>

              <div className="space-y-2">
                <Label>근무형태</Label>
                <Select
                  value={workType}
                  onValueChange={(v) => setWorkType(v as WorkType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>권한</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as MemberRole)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>상태</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as MemberStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="부서" value={departmentName} />
              <InfoRow label="팀" value={teamName} />
              <InfoRow label="직급" value={positionName} />
              <InfoRow label="직책" value={member.jobTitle ?? "-"} />
              <InfoRow label="근무형태" value={workTypeLabel} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "저장중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-sm text-muted-foreground py-2">{value}</p>
    </div>
  );
}
