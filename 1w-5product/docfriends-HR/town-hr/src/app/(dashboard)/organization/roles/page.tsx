"use client";

import { useMemo } from "react";
import { Check, Shield } from "lucide-react";
import { useMembers } from "@/hooks/use-members";
import { useAuthContext } from "@/contexts/auth-context";
import { getRolePermissions } from "@/lib/utils/permissions";
import type { Permission } from "@/lib/utils/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { MemberRole } from "@/types";

const ROLES: { key: MemberRole; label: string }[] = [
  { key: "admin", label: "관리자" },
  { key: "manager", label: "매니저" },
  { key: "employee", label: "직원" },
];

const PERMISSION_LABELS: Record<string, string> = {
  "members:read": "구성원 조회",
  "members:write": "구성원 수정",
  "members:invite": "구성원 초대",
  "members:delete": "구성원 삭제",
  "departments:read": "부서 조회",
  "departments:write": "부서 수정",
  "attendance:read_own": "본인 근태 조회",
  "attendance:read_team": "팀 근태 조회",
  "attendance:read_all": "전체 근태 조회",
  "attendance:write_own": "본인 출퇴근",
  "attendance:modify": "근태 수정",
  "attendance:reports": "리포트 조회",
  "leave:read_own": "본인 휴가 조회",
  "leave:read_team": "팀 휴가 조회",
  "leave:read_all": "전체 휴가 조회",
  "leave:apply": "휴가 신청",
  "leave:approve": "휴가 승인",
  "leave:policy": "정책 관리",
  "contracts:read_own": "본인 계약 조회",
  "contracts:read_all": "전체 계약 조회",
  "contracts:templates": "템플릿 관리",
  "contracts:send": "계약 발송",
  "contracts:sign": "계약 서명",
  "contracts:seals": "직인 관리",
  "workflows:read_own": "본인 결재 조회",
  "workflows:read_all": "전체 결재 조회",
  "workflows:submit": "결재 신청",
  "workflows:approve": "결재 승인",
  "workflows:forms": "양식 관리",
  "workflows:policies": "결재선 관리",
  "settings:company": "회사 설정",
  "settings:work_policy": "근무 정책",
  "settings:leave_policy": "휴가 정책",
  "settings:roles": "권한 관리",
  "notifications:read": "알림 조회",
  "audit:read": "감사로그 조회",
};

const CATEGORY_LABELS: Record<string, string> = {
  members: "구성원",
  departments: "부서",
  attendance: "근태",
  leave: "휴가",
  contracts: "계약",
  workflows: "결재",
  settings: "설정",
  notifications: "알림",
  audit: "감사",
};

interface PermissionGroup {
  category: string;
  categoryLabel: string;
  permissions: Permission[];
}

function groupPermissions(): PermissionGroup[] {
  const allPermissions = Object.keys(PERMISSION_LABELS) as Permission[];
  const groups = new Map<string, Permission[]>();

  for (const perm of allPermissions) {
    const category = perm.split(":")[0];
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(perm);
  }

  return Array.from(groups.entries()).map(([category, permissions]) => ({
    category,
    categoryLabel: CATEGORY_LABELS[category] ?? category,
    permissions,
  }));
}

export default function RolesPage() {
  const { members, loading } = useMembers();
  const { role } = useAuthContext();

  const isAdmin = role === "admin";

  const permissionGroups = useMemo(() => groupPermissions(), []);

  const rolePermissions = useMemo(() => {
    const map = new Map<MemberRole, Set<string>>();
    for (const r of ROLES) {
      map.set(r.key, new Set(getRolePermissions(r.key)));
    }
    return map;
  }, []);

  const roleMemberCounts = useMemo(() => {
    const counts: Record<MemberRole, number> = { admin: 0, manager: 0, employee: 0 };
    for (const m of members) {
      if (m.status === "active" && counts[m.role] !== undefined) {
        counts[m.role]++;
      }
    }
    return counts;
  }, [members]);

  if (!isAdmin) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        관리자만 접근할 수 있습니다
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">역할/권한 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          역할별 권한 매트릭스를 확인합니다
        </p>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {ROLES.map((r) => (
          <div
            key={r.key}
            className="rounded-lg border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium">{r.label}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Badge variant="secondary">
                {loading ? "..." : `${roleMemberCounts[r.key]}명`}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {getRolePermissions(r.key).length}개 권한
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Permission matrix */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">카테고리</TableHead>
                <TableHead>권한</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r.key} className="w-[100px] text-center">
                    {r.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissionGroups.map((group) =>
                group.permissions.map((perm, idx) => (
                  <TableRow key={perm}>
                    {idx === 0 && (
                      <TableCell
                        rowSpan={group.permissions.length}
                        className="align-top font-medium bg-muted/30"
                      >
                        {group.categoryLabel}
                      </TableCell>
                    )}
                    <TableCell className="text-sm">
                      {PERMISSION_LABELS[perm] ?? perm}
                    </TableCell>
                    {ROLES.map((r) => (
                      <TableCell key={r.key} className="text-center">
                        {rolePermissions.get(r.key)?.has(perm) ? (
                          <Check className="mx-auto h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
