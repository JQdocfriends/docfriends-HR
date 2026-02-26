import { query, where, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { onboardingChecklistsRef } from "@/lib/firebase/collections";
import type { OnboardingChecklist } from "@/types";

export async function fetchOnboardingChecklist(memberId: string): Promise<OnboardingChecklist | null> {
  const q = query(onboardingChecklistsRef, where("memberId", "==", memberId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as OnboardingChecklist;
}

export async function createOnboardingChecklist(memberId: string, assigneeId: string): Promise<string> {
  const ref = doc(onboardingChecklistsRef);
  const defaultItems = [
    { id: "1", title: "근로계약서 서명", description: "전자계약서 시스템에서 서명", isCompleted: false, completedAt: null, completedBy: null, duePhase: "day1" as const },
    { id: "2", title: "계정 설정 완료", description: "이메일, 슬랙 등 계정 생성", isCompleted: false, completedAt: null, completedBy: null, duePhase: "day1" as const },
    { id: "3", title: "장비 수령", description: "노트북, 모니터 등 장비 수령", isCompleted: false, completedAt: null, completedBy: null, duePhase: "day1" as const },
    { id: "4", title: "팀 미팅 참석", description: "소속 팀 미팅 참석", isCompleted: false, completedAt: null, completedBy: null, duePhase: "week1" as const },
    { id: "5", title: "사내 규정 숙지", description: "취업규칙 및 사내 규정 확인", isCompleted: false, completedAt: null, completedBy: null, duePhase: "week1" as const },
    { id: "6", title: "업무 교육 완료", description: "담당 업무 관련 교육 이수", isCompleted: false, completedAt: null, completedBy: null, duePhase: "month1" as const },
    { id: "7", title: "1개월 면담", description: "매니저와 1개월 적응 면담", isCompleted: false, completedAt: null, completedBy: null, duePhase: "month1" as const },
    { id: "8", title: "3개월 평가", description: "수습 기간 평가 진행", isCompleted: false, completedAt: null, completedBy: null, duePhase: "month3" as const },
  ];
  await setDoc(ref, {
    memberId, assigneeId, items: defaultItems, status: "in_progress",
    completedAt: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateChecklistItem(
  checklistId: string, checklist: OnboardingChecklist, itemId: string, completed: boolean, completedBy: string
) {
  const updatedItems = checklist.items.map((item) =>
    item.id === itemId ? { ...item, isCompleted: completed, completedAt: completed ? serverTimestamp() : null, completedBy: completed ? completedBy : null } : item
  );
  const allDone = updatedItems.every((i) => i.isCompleted);
  await setDoc(doc(onboardingChecklistsRef, checklistId), {
    items: updatedItems, status: allDone ? "completed" : "in_progress",
    completedAt: allDone ? serverTimestamp() : null, updatedAt: serverTimestamp(),
  }, { merge: true });
}
