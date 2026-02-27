// ============================================================
// Town (타운) - Core TypeScript Types
// Aligned with ARCHITECTURE.md flat collection schema
// ============================================================

import type { Timestamp } from "firebase/firestore";

// ---- Enums & Literal Types ----

export type MemberRole = "admin" | "manager" | "employee";
export type MemberStatus = "active" | "on_leave" | "resigned";
export type WorkType = "fixed" | "flexible" | "staggered" | "remote" | "hybrid";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "half_day"
  | "on_leave"
  | "holiday";

export type LeaveType = "annual" | "sick" | "menstrual" | "parental" | "special";
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type ContractStatus =
  | "draft"
  | "sent"
  | "pending_signature"
  | "signed"
  | "expired"
  | "cancelled";
export type ContractCategory = "employment" | "nda" | "security" | "other";

export type WorkflowStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "on_hold"
  | "cancelled";
export type ApprovalDecision = "approved" | "rejected" | "on_hold";
export type ApprovalType = "sequential" | "parallel";
export type ApproverType = "specific" | "role" | "department_head" | "team_lead";

export type FormFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "file"
  | "textarea";

export type NotificationType =
  | "approval_request"
  | "approval_result"
  | "leave_request"
  | "leave_result"
  | "contract_sent"
  | "contract_signed"
  | "overtime_warning"
  | "system";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "approve"
  | "reject";

export type PositionCategory = "rank" | "job";

export type SealType = "company" | "representative";

export type OnboardingPhase = "day1" | "week1" | "month1" | "month3";

// ---- Company (Singleton at company/settings) ----

export interface WorkPolicy {
  defaultWorkType: WorkType;
  weeklyHoursLimit: number;
  workStartTime: string;
  workEndTime: string;
  flexRange: number;
  lunchBreakMinutes: number;
  lunchStartTime: string;
  weekStartDay: "monday" | "sunday";
  overtimeAlertThreshold: number;
}

export interface LeavePolicyConfig {
  annualLeaveBase: "hire_date" | "fiscal_year";
  fiscalYearStart: string;
  probationMonths: number;
}

export interface Company {
  name: string;
  representativeName: string;
  businessNumber: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  allowedEmailDomains: string[];
  workPolicy: WorkPolicy;
  leavePolicy: LeavePolicyConfig;
  setupCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---- Members ----

export interface Member {
  id: string;
  uid: string;
  email: string;
  name: string;
  phone: string | null;
  birthDate: string | null;
  profileImageUrl: string | null;
  departmentId: string | null;
  teamId: string | null;
  positionId: string | null;
  jobTitle: string | null;
  role: MemberRole;
  status: MemberStatus;
  hireDate: string;
  resignDate: string | null;
  workType: WorkType;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---- Departments & Teams ----

export interface Department {
  id: string;
  name: string;
  description: string | null;
  headMemberId: string | null;
  parentDepartmentId: string | null;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Team {
  id: string;
  name: string;
  departmentId: string;
  leadMemberId: string | null;
  description: string | null;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---- Positions ----

export interface Position {
  id: string;
  name: string;
  level: number;
  category: PositionCategory;
  description: string | null;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---- Attendance ----

export interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string;
  checkInTime: Timestamp | null;
  checkOutTime: Timestamp | null;
  workMinutes: number | null;
  overtimeMinutes: number;
  status: AttendanceStatus;
  modifiedBy: string | null;
  modifiedReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AttendanceWeeklySummary {
  id: string;
  memberId: string;
  weekStartDate: string;
  weekEndDate: string;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  dailyBreakdown: Record<string, number>;
  isOverLimit: boolean;
  alertSent: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---- Leave ----

export interface LeavePolicy {
  id: string;
  name: string;
  type: LeaveType;
  annualDays: number | null;
  isPaid: boolean;
  requiresApproval: boolean;
  autoApprove: boolean;
  minNoticeDays: number;
  description: string | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LeaveBalance {
  id: string;
  memberId: string;
  year: number;
  policyId: string;
  granted: number;
  used: number;
  pending: number;
  remaining: number;
  grantedAt: Timestamp;
  grantReason: string;
  expiresAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LeaveRequest {
  id: string;
  memberId: string;
  policyId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  attachmentUrls: string[];
  status: LeaveRequestStatus;
  approverId: string | null;
  approverComment: string | null;
  processedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---- Contracts ----

export interface ContractTemplate {
  id: string;
  name: string;
  category: ContractCategory;
  content: string;
  variables: string[];
  isDefault: boolean;
  createdBy: string;
  version: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContractStatusChange {
  status: string;
  changedBy: string;
  changedAt: Timestamp;
  comment: string | null;
}

export interface Contract {
  id: string;
  templateId: string;
  templateVersion: number;
  title: string;
  recipientId: string;
  senderId: string;
  content: string;
  status: ContractStatus;
  sealId: string | null;
  signatureImageUrl: string | null;
  signedAt: Timestamp | null;
  sentAt: Timestamp | null;
  expiresAt: Timestamp | null;
  pdfUrl: string | null;
  statusHistory: ContractStatusChange[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CompanySeal {
  id: string;
  name: string;
  imageUrl: string;
  type: SealType;
  allowedRoles: MemberRole[];
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---- Workflows / E-Approval ----

export interface WorkflowFormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder: string | null;
  options: string[] | null;
  defaultValue: string | null;
  order: number;
}

export interface WorkflowForm {
  id: string;
  name: string;
  category: "leave" | "expense" | "purchase" | "general";
  description: string | null;
  fields: WorkflowFormField[];
  policyId: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdBy: string;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WorkflowPolicyStep {
  order: number;
  approverType: ApproverType;
  approverId: string | null;
  approverRole: string | null;
  isRequired: boolean;
  deadlineHours: number;
}

export interface WorkflowPolicyCondition {
  field: string;
  operator: "gt" | "lt" | "eq";
  value: number;
  addStepOrder: number;
}

export interface WorkflowPolicy {
  id: string;
  name: string;
  description: string | null;
  formIds: string[];
  approvalType: ApprovalType;
  steps: WorkflowPolicyStep[];
  conditions: WorkflowPolicyCondition[] | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApprovalRecord {
  stepOrder: number;
  approverId: string;
  approverName: string;
  decision: ApprovalDecision | null;
  comment: string | null;
  delegatedFrom: string | null;
  processedAt: Timestamp | null;
}

export interface WorkflowDocument {
  id: string;
  formId: string;
  policyId: string;
  title: string;
  submittedBy: string;
  formData: Record<string, unknown>;
  attachmentUrls: string[];
  status: WorkflowStatus;
  currentStepOrder: number;
  approvals: ApprovalRecord[];
  pdfUrl: string | null;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---- Notifications ----

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: Timestamp;
}

// ---- Audit Log ----

export interface AuditLog {
  id: string;
  action: AuditAction;
  collection: string;
  documentId: string;
  performedBy: string;
  performedByName: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  ipAddress: string | null;
  createdAt: Timestamp;
}

// ---- Onboarding ----

export interface OnboardingChecklistItem {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: Timestamp | null;
  completedBy: string | null;
  duePhase: OnboardingPhase;
}

export interface OnboardingChecklist {
  id: string;
  memberId: string;
  assigneeId: string;
  items: OnboardingChecklistItem[];
  status: "in_progress" | "completed";
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
