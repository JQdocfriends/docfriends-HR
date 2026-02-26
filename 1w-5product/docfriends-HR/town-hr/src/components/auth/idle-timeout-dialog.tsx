"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // show warning 5 min before
const WARNING_AT_MS = IDLE_TIMEOUT_MS - WARNING_BEFORE_MS; // 25 minutes

interface IdleTimeoutDialogProps {
  onLogout: () => Promise<void>;
}

export function IdleTimeoutDialog({ onLogout }: IdleTimeoutDialogProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(300);
      countdownRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, WARNING_AT_MS);

    logoutTimerRef.current = setTimeout(async () => {
      await onLogout();
      router.push("/login");
    }, IDLE_TIMEOUT_MS);
  }, [onLogout, router]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "mousemove", "scroll"];

    function handleActivity() {
      if (!showWarning) {
        resetTimers();
      }
    }

    events.forEach((event) => window.addEventListener(event, handleActivity));
    resetTimers();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimers, showWarning]);

  function handleStayLoggedIn() {
    resetTimers();
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>자동 로그아웃 예정</DialogTitle>
          <DialogDescription>
            장시간 활동이 없어 {minutes}분 {seconds.toString().padStart(2, "0")}초 후 자동으로 로그아웃됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleStayLoggedIn}>로그인 유지</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
