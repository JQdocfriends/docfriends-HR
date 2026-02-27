import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  FileText,
  GitPullRequestArrow,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { MemberRole } from "@/types";

export interface MenuItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: MemberRole[];
  children?: MenuItem[];
}

export const SIDEBAR_MENUS: MenuItem[] = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "구성원",
    href: "/members",
    icon: Users,
    roles: ["admin", "manager", "employee"],
    children: [
      {
        title: "구성원 목록",
        href: "/members",
        icon: Users,
        roles: ["admin", "manager", "employee"],
      },
      {
        title: "구성원 등록",
        href: "/members/new",
        icon: Users,
        roles: ["admin", "manager"],
      },
      {
        title: "일괄 초대",
        href: "/members/invite",
        icon: Users,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    title: "조직 관리",
    href: "/organization",
    icon: Building2,
    roles: ["admin", "manager", "employee"],
    children: [
      {
        title: "조직도",
        href: "/organization",
        icon: Building2,
        roles: ["admin", "manager", "employee"],
      },
      {
        title: "부서/팀 관리",
        href: "/organization/departments",
        icon: Building2,
        roles: ["admin"],
      },
      {
        title: "직급/직책 관리",
        href: "/organization/positions",
        icon: Building2,
        roles: ["admin"],
      },
      {
        title: "권한 관리",
        href: "/organization/roles",
        icon: Building2,
        roles: ["admin"],
      },
    ],
  },
  {
    title: "근태 관리",
    href: "/attendance",
    icon: Clock,
    roles: ["admin", "manager", "employee"],
    children: [
      {
        title: "근태 현황",
        href: "/attendance",
        icon: Clock,
        roles: ["admin", "manager", "employee"],
      },
      {
        title: "출퇴근",
        href: "/attendance/clock",
        icon: Clock,
        roles: ["admin", "manager", "employee"],
      },
      {
        title: "근무 캘린더",
        href: "/attendance/calendar",
        icon: Clock,
        roles: ["admin", "manager", "employee"],
      },
      {
        title: "휴가 관리",
        href: "/attendance/leave",
        icon: Clock,
        roles: ["admin", "manager", "employee"],
      },
      {
        title: "초과근무 모니터링",
        href: "/attendance/overtime",
        icon: Clock,
        roles: ["admin", "manager"],
      },
      {
        title: "리포트",
        href: "/attendance/reports",
        icon: Clock,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    title: "전자계약서",
    href: "/contracts",
    icon: FileText,
    roles: ["admin", "manager", "employee"],
    children: [
      {
        title: "계약 현황",
        href: "/contracts",
        icon: FileText,
        roles: ["admin", "manager", "employee"],
      },
      {
        title: "템플릿 관리",
        href: "/contracts/templates",
        icon: FileText,
        roles: ["admin", "manager"],
      },
      {
        title: "계약서 발송",
        href: "/contracts/new",
        icon: FileText,
        roles: ["admin", "manager"],
      },
      {
        title: "직인 관리",
        href: "/contracts/seals",
        icon: FileText,
        roles: ["admin", "manager"],
      },
      {
        title: "계약 이력",
        href: "/contracts/history",
        icon: FileText,
        roles: ["admin", "manager", "employee"],
      },
    ],
  },
  {
    title: "전자결재",
    href: "/workflows",
    icon: GitPullRequestArrow,
    roles: ["admin", "manager", "employee"],
    children: [
      {
        title: "결재함",
        href: "/workflows",
        icon: GitPullRequestArrow,
        roles: ["admin", "manager", "employee"],
      },
      {
        title: "결재 신청",
        href: "/workflows/submit",
        icon: GitPullRequestArrow,
        roles: ["admin", "manager", "employee"],
      },
      {
        title: "양식 관리",
        href: "/workflows/forms",
        icon: GitPullRequestArrow,
        roles: ["admin"],
      },
      {
        title: "결재선 관리",
        href: "/workflows/policies",
        icon: GitPullRequestArrow,
        roles: ["admin"],
      },
      {
        title: "문서 보관함",
        href: "/workflows/archive",
        icon: GitPullRequestArrow,
        roles: ["admin", "manager", "employee"],
      },
    ],
  },
  {
    title: "알림",
    href: "/notifications",
    icon: Bell,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "설정",
    href: "/settings",
    icon: Settings,
    roles: ["admin"],
    children: [
      {
        title: "일반 설정",
        href: "/settings",
        icon: Settings,
        roles: ["admin"],
      },
      {
        title: "회사 정보",
        href: "/settings/company",
        icon: Settings,
        roles: ["admin"],
      },
      {
        title: "근무 정책",
        href: "/settings/work-policy",
        icon: Settings,
        roles: ["admin"],
      },
      {
        title: "휴가 정책",
        href: "/settings/leave-policy",
        icon: Settings,
        roles: ["admin"],
      },
    ],
  },
];

/**
 * Filter menu items by role
 */
export function getMenusForRole(role: MemberRole): MenuItem[] {
  return SIDEBAR_MENUS.filter((menu) => menu.roles.includes(role)).map(
    (menu) => ({
      ...menu,
      children: menu.children?.filter((child) => child.roles.includes(role)),
    })
  );
}
