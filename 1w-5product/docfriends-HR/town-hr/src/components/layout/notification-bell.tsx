"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { useNotifications, markAsRead, markAllAsRead } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export function NotificationBell() {
  const { member } = useAuthContext();
  const { notifications, unreadCount } = useNotifications(member?.id ?? "");
  const [open, setOpen] = useState(false);

  async function handleMarkAllRead() {
    if (!member) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAllAsRead(member.id, unreadIds);
    }
  }

  async function handleClickNotification(id: string, isRead: boolean) {
    if (!isRead) {
      await markAsRead(id);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleMarkAllRead}
            >
              모두 읽음
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              알림이 없습니다
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() =>
                  handleClickNotification(notification.id, notification.isRead)
                }
                className={`flex w-full flex-col gap-1 border-b px-4 py-3 text-left hover:bg-accent/50 transition-colors ${
                  !notification.isRead ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {!notification.isRead && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                  <span className="text-sm font-medium">
                    {notification.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {notification.body}
                </p>
                {notification.createdAt && (
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(
                      notification.createdAt.toMillis()
                    ).toLocaleDateString("ko-KR")}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
