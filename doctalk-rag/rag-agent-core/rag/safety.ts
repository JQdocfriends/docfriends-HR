/**
 * Safety Service - Pre/Post Safety Check
 * 
 * (A) Safety Pre-check: 응급/자살/흉통/호흡곤란/소아 고열 등 triage
 * (F) Safety Post-check: 금지표현, 과도한 확정진단, 약물용량 등
 */

export interface SafetyCheckResult {
  isPass: boolean;
  flags: SafetyFlag[];
  emergencyResponse?: string;
  modifiedContent?: string;
}

export interface SafetyFlag {
  type: SafetyFlagType;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  matchedKeyword?: string;
}

export type SafetyFlagType = 
  | "EMERGENCY"
  | "MENTAL_HEALTH"
  | "PEDIATRIC_EMERGENCY"
  | "DEFINITIVE_DIAGNOSIS"
  | "DRUG_DOSAGE"
  | "PROHIBITED_EXPRESSION"
  | "PATIENT_PII"
  | "LOW_CONFIDENCE";

const EMERGENCY_KEYWORDS = [
  { keyword: "흉통", response: "흉통이 있으시면 즉시 119에 연락하시거나 가까운 응급실을 방문해주세요." },
  { keyword: "가슴통증", response: "가슴 통증이 있으시면 즉시 119에 연락하시거나 가까운 응급실을 방문해주세요." },
  { keyword: "심장마비", response: "심장마비가 의심되면 즉시 119에 연락해주세요." },
  { keyword: "호흡곤란", response: "호흡곤란이 심하시면 즉시 119에 연락하시거나 가까운 응급실을 방문해주세요." },
  { keyword: "숨막힘", response: "숨쉬기가 어려우시면 즉시 119에 연락해주세요." },
  { keyword: "의식불명", response: "의식이 없으시면 즉시 119에 연락해주세요." },
  { keyword: "기절", response: "기절 증상이 있으시면 가까운 응급실을 방문해주세요." },
  { keyword: "대량출혈", response: "출혈이 심하시면 즉시 119에 연락해주세요." },
  { keyword: "경련", response: "경련 증상이 있으시면 즉시 119에 연락하시거나 응급실을 방문해주세요." },
  { keyword: "발작", response: "발작 증상이 있으시면 즉시 119에 연락해주세요." },
  { keyword: "뇌졸중", response: "뇌졸중이 의심되면 즉시 119에 연락해주세요. 시간이 중요합니다." },
  { keyword: "마비", response: "갑자기 마비 증상이 나타나면 즉시 119에 연락해주세요." },
];

const MENTAL_HEALTH_KEYWORDS = [
  { keyword: "자살", response: "힘드신 마음을 이해합니다. 자살예방상담전화 1393으로 연락해주세요. 24시간 상담 가능합니다." },
  { keyword: "자해", response: "힘드신 마음을 이해합니다. 정신건강 위기상담전화 1577-0199로 연락해주세요." },
  { keyword: "죽고싶", response: "힘드신 마음을 이해합니다. 자살예방상담전화 1393으로 연락해주세요. 혼자 힘들어하지 마세요." },
];

const PEDIATRIC_EMERGENCY_KEYWORDS = [
  { keyword: "아기열", response: "아기에게 고열이 있으면 즉시 소아응급실을 방문해주세요." },
  { keyword: "영아경련", response: "영아 경련은 응급상황입니다. 즉시 119에 연락해주세요." },
  { keyword: "분유거부", response: "영아가 분유를 거부하고 상태가 안 좋아 보이면 소아과에 방문해주세요." },
];

const PROHIBITED_PATTERNS = [
  { pattern: /확실히\s*(~|에|는)\s*(입니다|이에요|예요)/g, type: "DEFINITIVE_DIAGNOSIS" as const },
  { pattern: /분명히\s*\w+\s*(입니다|이에요)/g, type: "DEFINITIVE_DIAGNOSIS" as const },
  { pattern: /\d+\s*(mg|정|알|cc|ml)\s*(드세요|복용|먹으세요)/g, type: "DRUG_DOSAGE" as const },
  { pattern: /하루\s*\d+\s*번?\s*(드세요|복용|먹으세요)/g, type: "DRUG_DOSAGE" as const },
  { pattern: /주민번호|주민등록번호/g, type: "PATIENT_PII" as const },
  { pattern: /\d{6}-\d{7}/g, type: "PATIENT_PII" as const },
  { pattern: /010-\d{4}-\d{4}/g, type: "PATIENT_PII" as const },
];

const SAFE_REPLACEMENTS: Record<string, string> = {
  "확실히": "가능성이 있습니다. 정확한 진단은 의사 선생님께 확인하시기 바랍니다",
  "분명히": "~일 수 있습니다",
};

export function preCheckSafety(userMessage: string): SafetyCheckResult {
  const flags: SafetyFlag[] = [];
  const lowerMessage = userMessage.toLowerCase();
  
  for (const item of EMERGENCY_KEYWORDS) {
    if (lowerMessage.includes(item.keyword)) {
      return {
        isPass: false,
        flags: [{
          type: "EMERGENCY",
          severity: "HIGH",
          description: "응급 상황 감지",
          matchedKeyword: item.keyword,
        }],
        emergencyResponse: item.response,
      };
    }
  }
  
  for (const item of MENTAL_HEALTH_KEYWORDS) {
    if (lowerMessage.includes(item.keyword)) {
      return {
        isPass: false,
        flags: [{
          type: "MENTAL_HEALTH",
          severity: "HIGH",
          description: "정신건강 위기 상황 감지",
          matchedKeyword: item.keyword,
        }],
        emergencyResponse: item.response,
      };
    }
  }
  
  for (const item of PEDIATRIC_EMERGENCY_KEYWORDS) {
    if (lowerMessage.includes(item.keyword)) {
      return {
        isPass: false,
        flags: [{
          type: "PEDIATRIC_EMERGENCY",
          severity: "HIGH",
          description: "소아 응급 상황 감지",
          matchedKeyword: item.keyword,
        }],
        emergencyResponse: item.response,
      };
    }
  }
  
  return { isPass: true, flags: [] };
}

export function postCheckSafety(aiResponse: string): SafetyCheckResult {
  const flags: SafetyFlag[] = [];
  let modifiedContent = aiResponse;
  
  for (const { pattern, type } of PROHIBITED_PATTERNS) {
    const matches = aiResponse.match(pattern);
    if (matches) {
      flags.push({
        type,
        severity: type === "PATIENT_PII" ? "HIGH" : "MEDIUM",
        description: `금지 표현 감지: ${type}`,
        matchedKeyword: matches[0],
      });
      
      if (type === "PATIENT_PII") {
        modifiedContent = modifiedContent.replace(pattern, "[개인정보 마스킹]");
      } else if (type === "DRUG_DOSAGE") {
        modifiedContent = modifiedContent.replace(
          pattern, 
          "(정확한 복용량은 담당 의사 선생님께 확인해주세요)"
        );
      }
    }
  }
  
  if (!modifiedContent.includes("의사") && !modifiedContent.includes("진료")) {
    modifiedContent += "\n\n※ 정확한 진단과 치료는 담당 의사 선생님께 확인해주세요.";
  }
  
  const highSeverityFlags = flags.filter(f => f.severity === "HIGH");
  
  return {
    isPass: highSeverityFlags.length === 0,
    flags,
    modifiedContent: flags.length > 0 ? modifiedContent : undefined,
  };
}

export function combineSafetyFlags(
  preCheck: SafetyCheckResult,
  postCheck: SafetyCheckResult
): SafetyFlag[] {
  return [...preCheck.flags, ...postCheck.flags];
}

export function getSafetyScore(flags: SafetyFlag[]): number {
  if (flags.length === 0) return 100;
  
  let score = 100;
  for (const flag of flags) {
    switch (flag.severity) {
      case "HIGH":
        score -= 30;
        break;
      case "MEDIUM":
        score -= 15;
        break;
      case "LOW":
        score -= 5;
        break;
    }
  }
  
  return Math.max(0, score);
}
