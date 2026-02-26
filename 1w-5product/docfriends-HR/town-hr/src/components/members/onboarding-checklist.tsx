"use client";

import { useState } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useMembers } from "@/hooks/use-members";
import {
  createOnboardingChecklist,
  updateChecklistItem,
} from "@/lib/repositories/onboarding-repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { OnboardingPhase } from "@/types";

const PHASE_LABELS: Record<OnboardingPhase, string> = {
  day1: "Day 1 (입사일)",
  week1: "Week 1 (첫째주)",
  month1: "Month 1 (첫째달)",
  month3: "Month 3 (수습 종료)",
};

const PHASE_ORDER: OnboardingPhase[] = ["day1", "week1", "month1", "month3"];

interface OnboardingChecklistProps {
  memberId: string;
}

export function OnboardingChecklist({ memberId }: OnboardingChecklistProps) {
  const { member } = useAuthContext();
  const { checklist, loading, mutate } = useOnboarding(memberId);
  const { members } = useMembers();
  const [creating, setCreating] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">온보딩 체크리스트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!checklist) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">온보딩 체크리스트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
            <p>등록된 온보딩 체크리스트가 없습니다.</p>
            <Button
              size="sm"
              disabled={creating}
              onClick={async () => {
                if (!member) return;
                setCreating(true);
                try {
                  await createOnboardingChecklist(memberId, member.id);
                  await mutate();
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? "생성 중..." : "체크리스트 생성"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = checklist.items.filter((i) => i.isCompleted).length;
  const totalCount = checklist.items.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const assignee = members.find((m) => m.id === checklist.assigneeId);

  const grouped = PHASE_ORDER.map((phase) => ({
    phase,
    label: PHASE_LABELS[phase],
    items: checklist.items.filter((item) => item.duePhase === phase),
  })).filter((g) => g.items.length > 0);

  async function handleToggle(itemId: string, checked: boolean) {
    if (!checklist || !member) return;
    await updateChecklistItem(checklist.id, checklist, itemId, checked, member.id);
    await mutate();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">온보딩 체크리스트</CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{totalCount} 완료
          </span>
        </div>
        {assignee && (
          <p className="text-xs text-muted-foreground">
            담당자: {assignee.name}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>진행률</span>
            <span>{percentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
            <div
              className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Phase-grouped items */}
        {grouped.map(({ phase, label, items }) => (
          <div key={phase} className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              {label}
            </h4>
            <div className="space-y-1">
              {items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={item.isCompleted}
                    onCheckedChange={(checked) =>
                      handleToggle(item.id, checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium leading-tight ${
                        item.isCompleted
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}

        {checklist.status === "completed" && (
          <div className="rounded-md bg-[#DCFCE7] px-3 py-2 text-center text-sm font-medium text-[#16A34A]">
            온보딩 완료
          </div>
        )}
      </CardContent>
    </Card>
  );
}
