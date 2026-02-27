import { Info, AlertTriangle } from "lucide-react";

interface LegalDisclaimerProps {
  message?: string;
  variant?: "info" | "warning";
}

export function LegalDisclaimer({
  message = "본 서비스는 참고용이며, 법적 효력을 보장하지 않습니다. 정확한 사항은 전문가와 상담하세요.",
  variant = "info",
}: LegalDisclaimerProps) {
  const Icon = variant === "warning" ? AlertTriangle : Info;
  const styles =
    variant === "warning"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : "bg-muted/50 border-border text-muted-foreground";

  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${styles}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}
