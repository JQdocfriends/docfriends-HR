"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileCheck,
  CheckCircle2,
  Calendar,
  CalendarCheck,
  Send,
  PenTool,
  AlertTriangle,
  Info,
  Mail,
  UserCheck,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  useNotifications,
  markAsRead,
  markAllAsRead,
} from "@/hooks/use-notifications";
import { useAuthContext } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notification, NotificationType } from "@/types";

// ---- helpers ----

const ICON_BY_TYPE: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  approval_request: FileCheck,
  approval_result: CheckCircle2,
  leave_request: Calendar,
  leave_result: CalendarCheck,
  contract_sent: Send,
  contract_signed: PenTool,
  overtime_warning: AlertTriangle,
  invitation_sent: Mail,
  invitation_accepted: UserCheck,
  system: Info,
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay === 1) return "어제";
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString("ko-KR");
}

async function deleteNotification(notificationId: string): Promise<void> {
  await deleteDoc(doc(db, "notifications", notificationId));
}

// ---- main page ----

type FilterTab = "all" | "unread";

export default function NotificationsPage() {
  const { member } = useAuthContext();
  const recipientId = member?.id ?? "";
  const { notifications, unreadCount, loading } = useNotifications(recipientId, 50);
  const [filter, setFilter] = useState<FilterTab>("all");
  const router = useRouter();

  const filtered =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  async function handleClick(n: Notification) {
    if (!n.isRead) {
      await markAsRead(n.id);
    }
    if (n.link) {
      router.push(n.link);
    }
  }

  async function handleMarkAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAllAsRead(recipientId, unreadIds);
    }
  }

  async function handleDelete(e: React.MouseEvent, notificationId: string) {
    e.stopPropagation();
    await deleteNotification(notificationId);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">알림</h1>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white border-0">
              {unreadCount}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="mr-1.5 h-4 w-4" />
          모두 읽음
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          전체
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          읽지 않음
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-4 p-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          알림이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const Icon = ICON_BY_TYPE[n.type] ?? Info;
            const createdDate = n.createdAt?.toDate
              ? n.createdAt.toDate()
              : null;

            return (
              <Card
                key={n.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  !n.isRead ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""
                }`}
                onClick={() => handleClick(n)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      !n.isRead
                        ? "bg-blue-100 text-blue-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm ${
                          !n.isRead ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                      {n.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {createdDate ? formatRelativeTime(createdDate) : "-"}
                    </p>
                  </div>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDelete(e, n.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
