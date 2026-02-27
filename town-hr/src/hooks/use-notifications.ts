"use client";

import { useEffect, useState } from "react";
import {
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { notificationsRef } from "@/lib/firebase/collections";
import type { Notification } from "@/types";

export function useNotifications(recipientId: string, maxCount: number = 20) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!recipientId) {
      setLoading(false);
      return;
    }

    const q = query(
      notificationsRef,
      where("recipientId", "==", recipientId),
      orderBy("createdAt", "desc"),
      limit(maxCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Notification
        );
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.isRead).length);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, [recipientId, maxCount]);

  return { notifications, unreadCount, loading };
}

export async function markAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notificationId), {
    isRead: true,
  });
}

export async function markAllAsRead(recipientId: string, notificationIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  notificationIds.forEach((id) => {
    batch.update(doc(db, "notifications", id), { isRead: true });
  });
  await batch.commit();
}
