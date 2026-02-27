"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, ChevronsUpDown } from "lucide-react";
import { signOut } from "@/lib/firebase/auth";
import { useAuthContext } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  manager: "매니저",
  employee: "직원",
};

export function UserMenu() {
  const router = useRouter();
  const { user, member, role } = useAuthContext();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const displayName = member?.name || user?.displayName || "사용자";
  const email = user?.email || "";
  const photoUrl = member?.profileImageUrl || user?.photoURL || undefined;
  const initials = displayName.slice(0, 1);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={photoUrl} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {role ? ROLE_LABELS[role] : email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-[--radix-dropdown-menu-trigger-width]"
          >
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              내 프로필
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
