import { collection, doc } from "firebase/firestore";
import { db } from "./config";

// Singleton company document
export const companyDocRef = doc(db, "company", "settings");

// Root-level collections (flat, single-tenant model)
export const membersRef = collection(db, "members");
export const departmentsRef = collection(db, "departments");
export const teamsRef = collection(db, "teams");
export const positionsRef = collection(db, "positions");
export const attendanceRecordsRef = collection(db, "attendance_records");
export const attendanceWeeklySummariesRef = collection(db, "attendance_weekly_summaries");
export const leavePoliciesRef = collection(db, "leave_policies");
export const leaveBalancesRef = collection(db, "leave_balances");
export const leaveRequestsRef = collection(db, "leave_requests");
export const contractTemplatesRef = collection(db, "contract_templates");
export const contractsRef = collection(db, "contracts");
export const companySealsRef = collection(db, "company_seals");
export const workflowFormsRef = collection(db, "workflow_forms");
export const workflowPoliciesRef = collection(db, "workflow_policies");
export const workflowDocumentsRef = collection(db, "workflow_documents");
export const notificationsRef = collection(db, "notifications");
export const auditLogsRef = collection(db, "audit_logs");
export const onboardingChecklistsRef = collection(db, "onboarding_checklists");
