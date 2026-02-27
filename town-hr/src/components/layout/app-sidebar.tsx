"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  CheckSquare,
  Settings,
  Building2,
} from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserMenu } from "./user-menu";
import type { MemberRole } from "@/types";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: MemberRole[];
}

const mainNavItems: NavItem[] = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "구성원 관리",
    href: "/members",
    icon: Users,
  },
  {
    title: "근태 관리",
    href: "/attendance",
    icon: Clock,
  },
  {
    title: "전자계약",
    href: "/contracts",
    icon: FileText,
  },
  {
    title: "전자결재",
    href: "/workflows",
    icon: CheckSquare,
  },
];

const adminNavItems: NavItem[] = [
  {
    title: "조직 관리",
    href: "/organization",
    icon: Building2,
    roles: ["admin", "manager"],
  },
  {
    title: "설정",
    href: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { role } = useAuthContext();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function filterByRole(items: NavItem[]) {
    return items.filter(
      (item) => !item.roles || (role && item.roles.includes(role))
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4">
        <div className="flex h-14 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            T
          </div>
          <span className="text-lg font-semibold">타운</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filterByRole(adminNavItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>관리</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByRole(adminNavItems).map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
