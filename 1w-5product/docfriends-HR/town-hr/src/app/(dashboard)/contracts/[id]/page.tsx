"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, PenTool } from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useContract, sendContract, signContract } from "@/hooks/use-contracts";
import { useMembers } from "@/hooks/use-members";
import { useAuthContext } from "@/contexts/auth-context";
import { contractsRef } from "@/lib/firebase/collections";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { ContractStatus } from "@/types";
import { LegalDisclaimer } from "@/components/common/legal-disclaimer";

const STATUS_CONFIG: Record<ContractStatus, { label: string; className: string }> = {
  draft: { label: "초안", className: "bg-[#F5F5F5] text-[#737373]" },
  sent: { label: "발송됨", className: "bg-[#DBEAFE] text-[#2563EB]" },
  pending_signature: { label: "서명대기", className: "bg-[#FEF3C7] text-[#F59E0B]" },
  signed: { label: "서명완료", className: "bg-[#DCFCE7] text-[#16A34A]" },
  expired: { label: "만료됨", className: "bg-[#FEE2E2] text-[#DC2626]" },
  cancelled: { label: "취소됨", className: "bg-[#F5F5F5] text-[#737373]" },
};

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { contract, loading } = useContract(id);
  const { members } = useMembers();
  const { member: currentUser, role } = useAuthContext();
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const canManage = role === "admin" || role === "manager";
  const isRecipient = contract?.recipientId === currentUser?.id;

  function getMemberName(memberId: string) {
    return members.find((m) => m.id === memberId)?.name ?? "-";
  }

  async function handleSend() {
    if (!contract || !currentUser) return;
    try {
      await sendContract(contract.id, currentUser.id);
      toast.success("계약서가 발송되었습니다.");
      router.refresh();
    } catch {
      toast.error("발송에 실패했습니다.");
    }
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0A0A0A";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function startDrawingTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }

  function drawTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0A0A0A";
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
  }

  async function generateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleSign() {
    const canvas = canvasRef.current;
    if (!canvas || !contract) return;
    const signatureDataUrl = canvas.toDataURL("image/png");
    try {
      const contentHash = await generateHash(contract.content + contract.id);
      await signContract(contract.id, signatureDataUrl);
      await setDoc(
        doc(contractsRef, contract.id),
        {
          contentHash,
          signatureAudit: {
            signedAt: serverTimestamp(),
            signerIp: null,
            userAgent: navigator.userAgent,
          },
        },
        { merge: true }
      );
      toast.success("서명이 완료되었습니다.");
      setSignDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("서명에 실패했습니다.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
        <p>계약서를 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => router.push("/contracts")}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[contract.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/contracts">
              <ArrowLeft className="mr-1 h-4 w-4" />
              뒤로
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {contract.title}
            </h1>
            <span
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {canManage && contract.status === "draft" && (
            <Button onClick={handleSend}>
              <Send className="mr-1 h-4 w-4" />
              발송하기
            </Button>
          )}
          {isRecipient &&
            (contract.status === "sent" ||
              contract.status === "pending_signature") && (
              <Button onClick={() => setSignDialogOpen(true)}>
                <PenTool className="mr-1 h-4 w-4" />
                서명하기
              </Button>
            )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">계약 내용</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: contract.content }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">계약 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">수신자</span>
              <p className="font-medium">
                {getMemberName(contract.recipientId)}
              </p>
            </div>
            <Separator />
            <div>
              <span className="text-muted-foreground">발신자</span>
              <p className="font-medium">
                {getMemberName(contract.senderId)}
              </p>
            </div>
            <Separator />
            <div>
              <span className="text-muted-foreground">생성일</span>
              <p className="font-medium">
                {contract.createdAt
                  ? new Date(contract.createdAt.toMillis()).toLocaleDateString(
                      "ko-KR"
                    )
                  : "-"}
              </p>
            </div>
            {contract.signedAt && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground">서명일</span>
                  <p className="font-medium">
                    {new Date(contract.signedAt.toMillis()).toLocaleDateString(
                      "ko-KR"
                    )}
                  </p>
                </div>
              </>
            )}
            {contract.signatureImageUrl && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground">서명</span>
                  <img
                    src={contract.signatureImageUrl}
                    alt="서명"
                    className="mt-1 h-16 rounded border bg-white"
                  />
                </div>
              </>
            )}
            {"contentHash" in contract && typeof (contract as unknown as Record<string, unknown>).contentHash === "string" && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground">문서 해시</span>
                  <p className="font-mono text-xs break-all mt-1">
                    {String((contract as unknown as Record<string, unknown>).contentHash)}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <LegalDisclaimer message="본 전자서명은 참고용이며, 법적 효력을 보장하지 않습니다." />

      {/* Signature Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>전자 서명</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              아래 영역에 서명을 해주세요.
            </p>
            <div className="rounded-lg border bg-white">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawingTouch}
                onTouchMove={drawTouch}
                onTouchEnd={stopDrawing}
              />
            </div>
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              지우기
            </Button>
            <p className="text-xs text-muted-foreground">
              본 전자서명은 참고용이며, 법적 효력을 보장하지 않습니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSign}>서명 완료</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
