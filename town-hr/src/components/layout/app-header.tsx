"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "./notification-bell";

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: "대시보드",
  members: "구성원",
  attendance: "근무",
  contracts: "전자계약",
  workflows: "전자결재",
  organization: "조직",
  settings: "설정",
  profile: "내 프로필",
  new: "등록",
  edit: "수정",
  templates: "템플릿",
  seals: "법인인감",
  policies: "결재정책",
  forms: "양식",
};

export function AppHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-6">
      <nav className="flex flex-1 items-center gap-1.5 text-sm">
        {segments.map((segment, index) => {
          const label = BREADCRUMB_MAP[segment] || segment;
          const isLast = index === segments.length - 1;

          return (
            <span key={segment + index} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-muted-foreground">/</span>
              )}
              <span
                className={
                  isLast
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }
              >
                {label}
              </span>
            </span>
          );
        })}
      </nav>
      <NotificationBell />
    </header>
  );
}
