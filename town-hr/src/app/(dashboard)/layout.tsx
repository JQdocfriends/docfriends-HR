"use client";

import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/auth-context";
import { useCompany } from "@/contexts/company-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { IdleTimeoutDialog } from "@/components/auth/idle-timeout-dialog";
import { signOut } from "@/lib/firebase/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthContext();
  const { company, loading: companyLoading } = useCompany();
  const router = useRouter();

  if (loading || companyLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (company && !company.setupCompleted) {
    router.push("/setup");
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </SidebarInset>
      <IdleTimeoutDialog onLogout={signOut} />
    </SidebarProvider>
  );
}
