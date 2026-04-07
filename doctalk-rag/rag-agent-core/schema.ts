import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const memberRoleEnum = pgEnum("member_role", ["OWNER", "EDITOR", "VIEWER"]);
export const sourceTypeEnum = pgEnum("source_type", ["PDF", "IMAGE", "TEXT", "LINK", "EMR"]);
export const analysisStatusEnum = pgEnum("analysis_status", ["pending", "processing", "completed", "failed"]);
export const tabTypeEnum = pgEnum("tab_type", ["RESERVATION", "AI_TRIAGE", "CONDITION", "HISTORY", "DOCTOR_RAG", "FINAL", "FINAL_RECOMMENDATION"]);
export const triageEnum = pgEnum("triage", ["RED", "YELLOW", "GREEN"]);
export const messageChannelEnum = pgEnum("message_channel", ["SMS", "KAKAO_ALIMTALK", "NAVER_TALK", "LMS"]);
export const ledgerTypeEnum = pgEnum("ledger_type", [
  "AI_GEN", "SEND_SMS", "SEND_KAKAO", "SEND_NAVER", "TOPUP", "FREE_GRANT", "PURCHASE", "AUTO_REFILL", "SEND_LMS", "REFUND",
  "AGENT_CHAT", "VISION_CHAT", "PATIENT_CHAT", "PATIENT_VISION_CHAT",
  "RAG_FILE", "RAG_YOUTUBE", "EMR_LEARNING", "FLASHCARD_LEARNING",
  "COMMENTARY_PDF", "INTERPRETATION", "INFOGRAPHIC", "A4_REPORT", "HEALTH_CHECKUP_REPORT",
  "VOICE_CLONE_CREATE", "VOICE_CHAT_30SEC", "PATIENT_VOICE_30SEC",
  "BOOKING_CPA", "BOOKING_CPC",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["ACTIVE", "CANCELLED", "EXPIRED", "PENDING"]);
export const paymentTypeEnum = pgEnum("payment_type", ["SUBSCRIPTION", "CREDIT_PURCHASE", "AUTO_REFILL"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "COMPLETED", "FAILED", "REFUNDED"]);

import { index } from "drizzle-orm/pg-core";

// Session storage table (MANDATORY - don't drop)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  firebaseUid: varchar("firebase_uid").unique(),
  emailVerified: boolean("email_verified").default(false),
  rememberToken: varchar("remember_token"),
  rememberTokenExpiry: timestamp("remember_token_expiry"),
  status: varchar("status", { length: 20 }).default("active"),
  lastActiveOrgId: varchar("last_active_org_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const organizations = pgTable("organizations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clinicSlug: text("clinic_slug").unique(),
  clinicDisplayName: text("clinic_display_name"),
  planId: text("plan_id").default("free").notNull(),
  bookingEnabled: boolean("booking_enabled").default(true).notNull(),
  settingsJson: jsonb("settings_json").default({}),
  hospitalUuid: varchar("hospital_uuid", { length: 100 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const organizationMembers = pgTable("organization_members", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  role: memberRoleEnum("role").default("EDITOR").notNull(),
  invitedAt: timestamp("invited_at"),
  acceptedAt: timestamp("accepted_at"),
}, (table) => [
  index("idx_org_members_user").on(table.userId),
  index("idx_org_members_org").on(table.orgId),
]);

export const doctorProfiles = pgTable("doctor_profiles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().unique().references(() => users.id),
  specialty: text("specialty"),
  region: text("region"),
  profileImageUrl: text("profile_image_url"),
  clinicHoursJson: jsonb("clinic_hours_json").default({}),
  ragConfigJson: jsonb("rag_config_json").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const patients = pgTable("patients", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  doctorId: varchar("doctor_id", { length: 36 }),
  name: text("name").notNull(),
  phone: text("phone"),
  chartPatientId: text("chart_patient_id"),
  patientKey: varchar("patient_key", { length: 64 }),
  address: text("address"),
  city: text("city"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  lastVisitAt: timestamp("last_visit_at"),
  nextReservedAt: timestamp("next_reserved_at"),
  tagsJson: jsonb("tags_json").default({}),
  diagnosisCodes: text("diagnosis_codes").array(),
  drugCodes: text("drug_codes").array(),
  visitHistory: jsonb("visit_history").default([]),
  vaccinationHistory: jsonb("vaccination_history").default([]),
  healthCheckupHistory: jsonb("health_checkup_history").default([]),
  isRecommended: boolean("is_recommended").default(false),
  recommendReason: text("recommend_reason"),
  doctalkBookingId: text("doctalk_booking_id"),
  doctalkProfileUrl: text("doctalk_profile_url"),
  language: varchar("language", { length: 10 }).default("ko"),
  healthMonitorConsent: jsonb("health_monitor_consent").default({}),
  kakaoFriendStatus: varchar("kakao_friend_status", { length: 20 }),
  kakaoUserKey: text("kakao_user_key"),
  kakaoFriendAt: timestamp("kakao_friend_at"),
  kakaoConsentAt: timestamp("kakao_consent_at"),
  kakaoConsentSource: varchar("kakao_consent_source", { length: 50 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_patients_org").on(table.orgId),
  index("idx_patients_chart_id").on(table.chartPatientId),
  index("idx_patients_doctor").on(table.doctorId),
]);

export const patientSources = pgTable("patient_sources", {
  id: varchar("id", { length: 128 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  type: sourceTypeEnum("type").notNull(),
  rawFileUrl: text("raw_file_url"),
  originalFilename: text("original_filename"),
  rawText: text("raw_text"),
  normalizedJson: jsonb("normalized_json").default({}),
  analysisStatus: analysisStatusEnum("analysis_status").default("pending").notNull(),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messagePlanRuns = pgTable("message_plan_runs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  runType: text("run_type").notNull(),
  status: text("status").default("DONE").notNull(),
  costCredits: integer("cost_credits").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messageCandidates = pgTable("message_candidates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  tabType: tabTypeEnum("tab_type").notNull(),
  triage: triageEnum("triage").notNull(),
  messageType: text("message_type").notNull(),
  triggerJson: jsonb("trigger_json").default({}),
  channelRecommendation: text("channel_recommendation").array(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  variablesUsed: jsonb("variables_used").default({}),
  rationaleJson: jsonb("rationale_json").default({}),
  expectedOutcomeJson: jsonb("expected_outcome_json").default({}),
  dedupeKey: text("dedupe_key").notNull(),
  isSelected: boolean("is_selected").default(false),
  isDeleted: boolean("is_deleted").default(false),
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at"),
  editedBody: text("edited_body"),
  editedTitle: text("edited_title"),
  patientDataHash: text("patient_data_hash"),
  consultationLink: text("consultation_link"),
  consultationLinkExpiresAt: timestamp("consultation_link_expires_at"),
  bookingReason: text("booking_reason"),
  bookingSlotsJson: jsonb("booking_slots_json").default([]),
  bookingContextJson: jsonb("booking_context_json").default({}),
  experimentGroup: text("experiment_group"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messageFinals = pgTable("message_finals", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  channel: messageChannelEnum("channel").notNull(),
  body: text("body").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").default("DRAFT").notNull(),
  sendCostCredits: integer("send_cost_credits").default(0),
  aiCostCredits: integer("ai_cost_credits").default(0),
  automationSource: text("automation_source"),
  automationRunId: varchar("automation_run_id", { length: 36 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const deliveryLogs = pgTable("delivery_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  messageFinalId: varchar("message_final_id", { length: 36 }).notNull().references(() => messageFinals.id),
  vendor: text("vendor").notNull(),
  vendorMessageId: text("vendor_message_id"),
  status: text("status").notNull(),
  errorCode: text("error_code"),
  sentAt: timestamp("sent_at"),
});

export const creditWallets = pgTable("credit_wallets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().unique().references(() => organizations.id),
  balance: integer("balance").default(1000).notNull(),
});

export const creditLedgers = pgTable("credit_ledgers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  type: ledgerTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  refId: text("ref_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const adminCreditGrants = pgTable("admin_credit_grants", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id", { length: 36 }).notNull().references(() => users.id),
  adminEmail: text("admin_email").notNull(),
  recipientUserId: varchar("recipient_user_id", { length: 36 }).notNull().references(() => users.id),
  recipientEmail: text("recipient_email").notNull(),
  recipientOrgId: varchar("recipient_org_id", { length: 36 }).references(() => organizations.id),
  amount: integer("amount").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  planId: text("plan_id").notNull(),
  status: subscriptionStatusEnum("status").default("ACTIVE").notNull(),
  startedAt: timestamp("started_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: timestamp("expires_at"),
  nextBillingAt: timestamp("next_billing_at"),
  cancelledAt: timestamp("cancelled_at"),
  autoRenew: boolean("auto_renew").default(true).notNull(),
  lastCreditRefillAt: timestamp("last_credit_refill_at"),
  priceKrw: integer("price_krw").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const paymentHistory = pgTable("payment_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  type: paymentTypeEnum("type").notNull(),
  status: paymentStatusEnum("status").default("PENDING").notNull(),
  amountKrw: integer("amount_krw").notNull(),
  credits: integer("credits").default(0),
  planId: text("plan_id"),
  packageId: text("package_id"),
  pgTransactionId: text("pg_transaction_id"),
  pgProvider: text("pg_provider"),
  receiptUrl: text("receipt_url"),
  description: text("description"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({ id: true, createdAt: true });
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type PaymentHistory = typeof paymentHistory.$inferSelect;

// RAG Document Source Types and Status Enums
export const ragSourceTypeEnum = pgEnum("rag_source_type", ["UPLOAD", "EMR", "LEARNED_QA", "POLICY", "FAQ_CARD", "PERSONA"]);
export const ragScopeEnum = pgEnum("rag_scope", ["DOCTOR", "ORG", "PUBLIC"]);
export const ragStatusEnum = pgEnum("rag_status", ["ACTIVE", "DEPRECATED", "QUARANTINED"]);

export const ragDocuments = pgTable("rag_documents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull().references(() => doctorProfiles.id),
  orgId: varchar("org_id", { length: 36 }).references(() => organizations.id),
  sourceType: ragSourceTypeEnum("source_type").notNull().default("UPLOAD"),
  scope: ragScopeEnum("scope").notNull().default("DOCTOR"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  embedding: jsonb("embedding").default([]),
  metadataJson: jsonb("metadata_json").default({}),
  version: integer("version").default(1),
  supersedesId: varchar("supersedes_id", { length: 36 }),
  status: ragStatusEnum("status").notNull().default("ACTIVE"),
  safetyTags: jsonb("safety_tags").default([]),
  priority: integer("priority").default(0),
  chunkIndex: integer("chunk_index").default(0),
  totalChunks: integer("total_chunks").default(1),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const shareLinks = pgTable("share_links", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  token: text("token").notNull().unique(),
  scope: text("scope").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const shareInvites = pgTable("share_invites", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  email: text("email").notNull(),
  role: memberRoleEnum("role").notNull(),
  inviterName: text("inviter_name"),
  inviterUserId: varchar("inviter_user_id", { length: 36 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export const alsShareEvents = pgTable("als_share_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  channel: text("channel").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const alsShareVisits = pgTable("als_share_visits", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  visitorIp: text("visitor_ip"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const updatePeriodEnum = pgEnum("update_period", ["1d", "7d", "30d", "90d"]);
export const deliveryStatusEnum = pgEnum("delivery_status", ["pending", "sent", "delivered", "failed", "opened"]);
export const faqCategoryEnum = pgEnum("faq_category", ["소아과", "내과", "피부과", "정형외과", "안과", "이비인후과", "산부인과", "일반"]);

export const recommendedPatientsCache = pgTable("recommended_patients_cache", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  recommendReason: text("recommend_reason").notNull(),
  priority: integer("priority").default(0),
  cachedAt: timestamp("cached_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Hospital Settings for profile
export const hospitalSettings = pgTable("hospital_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().unique().references(() => organizations.id),
  hospitalName: text("hospital_name"),
  doctorName: text("doctor_name"),
  address: text("address"),
  phone: text("phone"),
  clinicHours: jsonb("clinic_hours").default({}),
  services: text("services").array(),
  bookingProducts: jsonb("booking_products").default([]),
  hospitalType: text("hospital_type"),
  department: text("department").array(),
  mainDepartment: text("main_department"),
  hospitalDescription: text("hospital_description"),
  websiteUrl: text("website_url"),
  blogUrl: text("blog_url"),
  youtubeUrl: text("youtube_url"),
  cafeUrl: text("cafe_url"),
  amenities: text("amenities").array(),
  syncToNetwork: boolean("sync_to_network").default(true),
  numberOfDoctors: integer("number_of_doctors"),
  emrSystem: text("emr_system"),
  emrApiKey: text("emr_api_key"),
  emrConnected: boolean("emr_connected").default(false),
  pubmedEnabled: boolean("pubmed_enabled").default(false),
  inlineCitationEnabled: boolean("inline_citation_enabled").default(false),
  urgentSymptomCheckEnabled: boolean("urgent_symptom_check_enabled").default(false),
  voiceCloneEnabled: boolean("voice_clone_enabled").default(false),
  customVoiceId: text("custom_voice_id"),
  customVoiceName: text("custom_voice_name"),
  logoUrl: text("logo_url"),
  mapUrl: text("map_url"),
  projectAccess: text("project_access").default("restricted"),
  teamAccessScope: text("team_access_scope").default("all-charts"),
  defaultMessageTab: text("default_message_tab").default("auto"),
  facilityCode: text("facility_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  openDate: text("open_date"),
  autoConfirmBooking: boolean("auto_confirm_booking").default(false),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Message Automation Settings
export const messageAutomationSettings = pgTable("message_automation_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().unique().references(() => organizations.id),
  enabled: boolean("enabled").default(false),
  packageTier: text("package_tier").default("essential"),
  tabSettings: jsonb("tab_settings").default({}),
  analysisInterval: text("analysis_interval").default("6months"),
  analysisOnNewVisit: boolean("analysis_on_new_visit").default(true),
  preferredChannel: text("preferred_channel").default("KAKAO_ALIMTALK"),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Automation Run History
export const automationRuns = pgTable("automation_runs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  packageTier: text("package_tier").notNull(),
  status: text("status").default("running").notNull(),
  tabsProcessed: text("tabs_processed").array(),
  totalPatients: integer("total_patients").default(0),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  skippedCount: integer("skipped_count").default(0),
  creditUsed: integer("credit_used").default(0),
  channel: text("channel").notNull(),
  errors: jsonb("errors").default([]),
  startedAt: timestamp("started_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp("completed_at"),
});

// Patient Profile with detailed info
export const patientProfiles = pgTable("patient_profiles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().unique().references(() => patients.id),
  familyMembers: jsonb("family_members").default([]),
  pets: jsonb("pets").default([]),
  occupation: text("occupation"),
  occupationRisks: text("occupation_risks").array(),
  lifestyle: jsonb("lifestyle").default({}),
  preferences: jsonb("preferences").default({}),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Doctor RAG Patterns
export const doctorRagPatterns = pgTable("doctor_rag_patterns", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull().references(() => doctorProfiles.id),
  patternType: text("pattern_type").notNull(),
  conditionCode: text("condition_code"),
  pattern: text("pattern").notNull(),
  examples: text("examples").array(),
  confidence: integer("confidence").default(50),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// FAQ Cards for learning
export const faqCards = pgTable("faq_cards", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  category: faqCategoryEnum("category").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  isSystemDefault: boolean("is_system_default").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Doctor Knowledge Base (learned FAQs)
// SourceType: EMR, FILE, FILE_RAW, VACCINATION, HEALTH_CHECKUP, DIAGNOSIS, MEDIA, FAQ_CARD, PERSONA, POLICY
export const doctorKnowledge = pgTable("doctor_knowledge", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentHash: text("content_hash"),
  encryptedContent: text("encrypted_content"),
  isEncrypted: boolean("is_encrypted").default(false),
  embedding: jsonb("embedding").default([]),
  chunkIndex: integer("chunk_index").default(0),
  metadata: jsonb("metadata").default({}),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_doctor_knowledge_doctor").on(table.doctorId),
  index("idx_doctor_knowledge_org_doctor").on(table.orgId, table.doctorId),
  index("idx_doctor_knowledge_doctor_deleted").on(table.doctorId, table.isDeleted),
  index("idx_doctor_knowledge_source").on(table.sourceId),
  index("idx_doctor_knowledge_created").on(table.createdAt),
]);

// Doctor Knowledge Backup (dual backup for data protection - NO DELETE ALLOWED)
export const doctorKnowledgeBackup = pgTable("doctor_knowledge_backup", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  originalId: varchar("original_id", { length: 36 }).notNull(),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentHash: text("content_hash"),
  encryptedContent: text("encrypted_content"),
  isEncrypted: boolean("is_encrypted").default(false),
  embedding: jsonb("embedding").default([]),
  chunkIndex: integer("chunk_index").default(0),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  backupAt: timestamp("backup_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// RAG Configuration - Dynamic settings for RAG system
export const ragConfig = pgTable("rag_config", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  configKey: text("config_key").unique().notNull(),
  configValue: jsonb("config_value").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: varchar("updated_by", { length: 255 }),
});

export const insertRagConfigSchema = createInsertSchema(ragConfig).omit({
  id: true,
  updatedAt: true,
});
export type InsertRagConfig = z.infer<typeof insertRagConfigSchema>;
export type RagConfig = typeof ragConfig.$inferSelect;

// Weather Data
export const weatherData = pgTable("weather_data", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  temperature: integer("temperature"),
  humidity: integer("humidity"),
  condition: text("condition"),
  pm25: integer("pm25"),
  pm10: integer("pm10"),
  location: text("location").default("Seoul"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Weather-Disease Patterns
export const weatherPatterns = pgTable("weather_patterns", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  conditionCode: text("condition_code").notNull(),
  weatherCondition: text("weather_condition"),
  temperatureRange: text("temperature_range"),
  occurrenceCount: integer("occurrence_count").default(1),
  lastOccurrence: timestamp("last_occurrence"),
});

// Blocked Users for chat
export const blockedUsers = pgTable("blocked_users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  blockedByUserId: varchar("blocked_by_user_id", { length: 36 }).notNull(),
  targetType: text("target_type").notNull(), // 'team' or 'patient'
  targetId: varchar("target_id", { length: 36 }).notNull(),
  targetName: text("target_name").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Schedule Settings for auto-update
export const scheduleSettings = pgTable("schedule_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().unique().references(() => organizations.id),
  updateInterval: updatePeriodEnum("update_interval").default("7d"),
  isEnabled: boolean("is_enabled").default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Enhanced Delivery Results
export const deliveryResults = pgTable("delivery_results", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  messageFinalId: varchar("message_final_id", { length: 36 }).references(() => messageFinals.id),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  patientName: text("patient_name").notNull(),
  channel: messageChannelEnum("channel").notNull(),
  messageContent: text("message_content").notNull(),
  status: deliveryStatusEnum("status").default("pending").notNull(),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  responseMessage: text("response_message"),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Message Categories for card list
export const messageCategories = pgTable("message_categories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  name: text("name").notNull(),
  count: integer("count").default(0),
  color: text("color"),
  icon: text("icon"),
});

// Chat Messages for AI Agent
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  mentionedPatientId: varchar("mentioned_patient_id", { length: 36 }),
  attachments: jsonb("attachments").default([]),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Patient Facts - Normalized data from uploaded documents
export const factTypeEnum = pgEnum("fact_type", ["VISIT", "DIAGNOSIS", "PRESCRIPTION", "LAB", "VACCINE", "NOTE", "PROCEDURE"]);

export const patientFacts = pgTable("patient_facts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  sourceId: varchar("source_id", { length: 128 }).references(() => patientSources.id),
  factType: factTypeEnum("fact_type").notNull(),
  date: timestamp("date").notNull(),
  code: text("code"),
  description: text("description").notNull(),
  metadata: jsonb("metadata").default({}),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Infographic Specs - Generated chart specifications
export const infographicSpecs = pgTable("infographic_specs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  headline: text("headline").notNull(),
  patientSummary: jsonb("patient_summary").default({}),
  phases: jsonb("phases").default([]),
  charts: jsonb("charts").default({}),
  callouts: jsonb("callouts").default([]),
  finalAssessment: jsonb("final_assessment").default([]),
  design: jsonb("design").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Custom System Prompts - Admin-editable prompts for AI generation
export const customPrompts = pgTable("custom_prompts", {
  id: varchar("id", { length: 100 }).primaryKey(), // e.g., "medical-system-prompt"
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // chat, analysis, infographic, message, report, slide, image
  filePath: varchar("file_path", { length: 300 }),
  content: text("content").notNull(),
  variables: jsonb("variables").default([]),
  isCustom: boolean("is_custom").default(true).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: varchar("updated_by", { length: 100 }),
});

export type CustomPrompt = typeof customPrompts.$inferSelect;
export type InsertCustomPrompt = typeof customPrompts.$inferInsert;

// Infographic History - Stores generated infographic history for timeline display
export const infographicTriggerTypeEnum = pgEnum("infographic_trigger_type", ["initial", "update_button", "data_change"]);

export const patientInfographicHistory = pgTable("patient_infographic_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  imageUrl: text("image_url"),
  specData: jsonb("spec_data").default({}),
  dashboardData: jsonb("dashboard_data").default({}),
  triggerType: infographicTriggerTypeEnum("trigger_type").default("initial"),
  dataSnapshot: jsonb("data_snapshot").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Report History - Stores generated slide report history for timeline display
export const patientReportHistory = pgTable("patient_report_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  pages: jsonb("pages").default([]),
  specData: jsonb("spec_data").default({}),
  triggerType: infographicTriggerTypeEnum("trigger_type").default("initial"),
  dataSnapshot: jsonb("data_snapshot").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Chat Evaluations - P1 scoring (simulated patient chat evaluation)
export const chatEvaluationRatingEnum = pgEnum("chat_evaluation_rating", ["positive", "neutral", "negative"]);

export const chatEvaluations = pgTable("chat_evaluations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  rating: chatEvaluationRatingEnum("rating").notNull(),
  feedback: text("feedback"),
  responseQuality: integer("response_quality").default(3),
  medicalAccuracy: integer("medical_accuracy").default(3),
  communicationStyle: integer("communication_style").default(3),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Agent Test Results - P3 scoring (agent test results)
export const testResultStatusEnum = pgEnum("test_result_status", ["passed", "failed", "skipped"]);

export const agentTestResults = pgTable("agent_test_results", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  testName: text("test_name").notNull(),
  testCategory: text("test_category").notNull(),
  status: testResultStatusEnum("status").notNull(),
  score: integer("score").default(0),
  maxScore: integer("max_score").default(100),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Compliance Checks - S1 scoring (compliance guardrail checks)
export const complianceCheckResultEnum = pgEnum("compliance_check_result", ["pass", "violation", "warning"]);

export const complianceChecks = pgTable("compliance_checks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  messageId: varchar("message_id", { length: 36 }),
  checkType: text("check_type").notNull(),
  result: complianceCheckResultEnum("result").notNull(),
  violationDetails: text("violation_details"),
  checkedContent: text("checked_content"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Triage Records - S2 scoring (high-risk triage handling)
export const triageHandlingStatusEnum = pgEnum("triage_handling_status", ["properly_handled", "delayed", "missed"]);

export const triageRecords = pgTable("triage_records", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  triageLevel: triageEnum("triage_level").notNull(),
  handlingStatus: triageHandlingStatusEnum("handling_status").notNull(),
  responseTimeMinutes: integer("response_time_minutes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Patient Analysis History - Gemini API cost optimization (persistent caching)
export const analysisTypeEnum = pgEnum("analysis_type", ["PLANNER", "CHART", "DOCUMENT", "VACCINATION", "HEALTHCHECK"]);

export const patientAnalysisHistory = pgTable("patient_analysis_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  analysisType: analysisTypeEnum("analysis_type").notNull(),
  dataHash: text("data_hash").notNull(),
  analysisResult: jsonb("analysis_result").default({}).notNull(),
  lastDataDate: timestamp("last_data_date"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Patient Generated Messages - Persistent message storage for cost optimization
export const patientGeneratedMessages = pgTable("patient_generated_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  tabType: tabTypeEnum("tab_type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  messageType: text("message_type"),
  triggerJson: jsonb("trigger_json").default({}),
  sourceAnalysisId: varchar("source_analysis_id", { length: 36 }),
  isLatest: boolean("is_latest").default(true),
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Direct Messages - Team and patient chat conversations
export const directMessages = pgTable("direct_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id", { length: 36 }).notNull(),
  senderId: varchar("sender_id", { length: 36 }).notNull(),
  senderName: text("sender_name").notNull(),
  recipientId: varchar("recipient_id", { length: 36 }),
  recipientType: text("recipient_type").default("member"), // 'member' or 'patient'
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Analysis Progress - Real-time analysis progress tracking
export const analysisProgress = pgTable("analysis_progress", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed
  currentStep: text("current_step"), // current step being processed
  totalSteps: integer("total_steps").default(5),
  completedSteps: integer("completed_steps").default(0),
  progressPercent: integer("progress_percent").default(0),
  steps: jsonb("steps").default([]), // Array of step details: [{name, status, startedAt, completedAt}]
  triggerSource: text("trigger_source"), // chartAPI, uploadFile, vaccinationHistory, healthCheckup, manual
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// API Usage Logs - Track AI API usage for admin dashboard
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  endpoint: varchar("endpoint").notNull(),
  model: varchar("model"),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  costUsd: text("cost_usd").default("0"),
  responseTimeMs: integer("response_time_ms"),
  status: varchar("status").default("success"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Daily Stats - Aggregated analytics for admin dashboard
export const dailyStats = pgTable("daily_stats", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull().unique(),
  totalUsers: integer("total_users").default(0),
  dau: integer("dau").default(0),
  mau: integer("mau").default(0),
  totalCreditsUsed: integer("total_credits_used").default(0),
  totalCreditsPurchased: integer("total_credits_purchased").default(0),
  totalApiCalls: integer("total_api_calls").default(0),
  totalApiCostUsd: text("total_api_cost_usd").default("0"),
  revenueKrw: integer("revenue_krw").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// User Activity Logs - Track user actions
export const userActivityLogs = pgTable("user_activity_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  actionType: varchar("action_type").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Google Drive OAuth Tokens - Per-organization Google Drive connection
export const googleDriveTokens = pgTable("google_drive_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().unique().references(() => organizations.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("Bearer"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  email: text("email"), // Connected Google account email
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Patient Commentary Cache - A4 2-page medical record commentary caching
export const patientCommentaryCache = pgTable("patient_commentary_cache", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().unique().references(() => patients.id),
  contentHash: text("content_hash").notNull(),
  commentary: text("commentary").notNull(),
  sections: jsonb("sections").default({}),
  wordCount: integer("word_count").default(0),
  doctorName: text("doctor_name"),
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  isGenerating: boolean("is_generating").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Patient Interpretation History - 진료 기록 해설서 히스토리
export const patientInterpretationHistory = pgTable("patient_interpretation_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  title: text("title").notNull(),
  greeting: text("greeting"),
  interpretation: jsonb("interpretation").default({}).notNull(),
  markdown: text("markdown"),
  doctorName: text("doctor_name"),
  hospitalName: text("hospital_name"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const bookingEventTypeEnum = pgEnum("booking_event_type", ["MESSAGE_VIEWED", "SLOT_CLICKED", "BOOKED", "REMINDER_SENT", "CANCELLED", "CONSENT_AGREED"]);

export const bookingEvents = pgTable("booking_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  messageCandidateId: varchar("message_candidate_id", { length: 36 }).references(() => messageCandidates.id),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  eventType: bookingEventTypeEnum("event_type").notNull(),
  slotData: jsonb("slot_data").default({}),
  metadata: jsonb("metadata").default({}),
  experimentGroup: text("experiment_group"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const bookingRecommendations = pgTable("booking_recommendations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  reasonText: text("reason_text").notNull(),
  reasonType: text("reason_type").notNull(),
  slotsJson: jsonb("slots_json").default([]).notNull(),
  visitPatternJson: jsonb("visit_pattern_json").default({}),
  isActive: boolean("is_active").default(true).notNull(),
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: timestamp("expires_at"),
});

export const bookingRequestStatusEnum = pgEnum("booking_request_status", ["REQUESTED", "CONFIRMED", "CANCELLED", "NO_SHOW", "COMPLETED"]);
export const bookingSourceEnum = pgEnum("booking_source", ["CONSULTATION_LINK", "CLINIC_URL", "MESSAGE_CTA", "PARTNER_API", "MANUAL"]);

export const bookingRequests = pgTable("booking_requests", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }),
  patientName: text("patient_name"),
  patientPhone: text("patient_phone"),
  status: bookingRequestStatusEnum("status").default("REQUESTED").notNull(),
  source: bookingSourceEnum("source").notNull(),
  requestedDate: text("requested_date"),
  requestedTime: text("requested_time"),
  reasonText: text("reason_text"),
  chatRoomId: varchar("chat_room_id", { length: 36 }),
  sessionId: text("session_id"),
  slotData: jsonb("slot_data").default({}),
  metadata: jsonb("metadata").default({}),
  confirmedAt: timestamp("confirmed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  partnerNotifiedAt: timestamp("partner_notified_at"),
  partnerWebhookStatus: text("partner_webhook_status"),
  viewToken: varchar("view_token", { length: 64 }),
  patientLanguage: varchar("patient_language", { length: 5 }).default("ko"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertBookingRequestSchema = createInsertSchema(bookingRequests).omit({ id: true, createdAt: true, updatedAt: true, confirmedAt: true, cancelledAt: true, partnerNotifiedAt: true });

export const insertBookingEventSchema = createInsertSchema(bookingEvents).omit({ id: true, createdAt: true });
export const insertBookingRecommendationSchema = createInsertSchema(bookingRecommendations).omit({ id: true, generatedAt: true });

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true });
export const insertPatientSourceSchema = createInsertSchema(patientSources).omit({ id: true, createdAt: true });
export const insertMessageCandidateSchema = createInsertSchema(messageCandidates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageFinalSchema = createInsertSchema(messageFinals).omit({ id: true, createdAt: true });
export const insertCreditLedgerSchema = createInsertSchema(creditLedgers).omit({ id: true, createdAt: true });
export const insertRagDocumentSchema = createInsertSchema(ragDocuments).omit({ id: true, createdAt: true });
export const insertShareInviteSchema = createInsertSchema(shareInvites).omit({ id: true, createdAt: true, acceptedAt: true });
export const insertRecommendedPatientsCacheSchema = createInsertSchema(recommendedPatientsCache).omit({ id: true, cachedAt: true });
export const insertHospitalSettingsSchema = createInsertSchema(hospitalSettings).omit({ id: true, updatedAt: true });
export const insertMessageAutomationSettingsSchema = createInsertSchema(messageAutomationSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAutomationRunSchema = createInsertSchema(automationRuns).omit({ id: true, startedAt: true });
export const insertPatientProfileSchema = createInsertSchema(patientProfiles).omit({ id: true, updatedAt: true });
export const insertDoctorRagPatternSchema = createInsertSchema(doctorRagPatterns).omit({ id: true, createdAt: true });
export const insertFaqCardSchema = createInsertSchema(faqCards).omit({ id: true, createdAt: true });
export const insertDoctorKnowledgeSchema = createInsertSchema(doctorKnowledge).omit({ id: true, createdAt: true });
export const insertDoctorKnowledgeBackupSchema = createInsertSchema(doctorKnowledgeBackup).omit({ id: true, backupAt: true });
export const insertWeatherDataSchema = createInsertSchema(weatherData).omit({ id: true, createdAt: true });
export const insertWeatherPatternSchema = createInsertSchema(weatherPatterns).omit({ id: true });
export const insertScheduleSettingsSchema = createInsertSchema(scheduleSettings).omit({ id: true, createdAt: true });
export const insertDeliveryResultSchema = createInsertSchema(deliveryResults).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertPatientFactSchema = createInsertSchema(patientFacts).omit({ id: true, createdAt: true });
export const insertInfographicSpecSchema = createInsertSchema(infographicSpecs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPatientInfographicHistorySchema = createInsertSchema(patientInfographicHistory).omit({ id: true, createdAt: true });
export const insertPatientReportHistorySchema = createInsertSchema(patientReportHistory).omit({ id: true, createdAt: true });
export const insertPatientInterpretationHistorySchema = createInsertSchema(patientInterpretationHistory).omit({ id: true, createdAt: true });
export const insertChatEvaluationSchema = createInsertSchema(chatEvaluations).omit({ id: true, createdAt: true });
export const insertAgentTestResultSchema = createInsertSchema(agentTestResults).omit({ id: true, createdAt: true });
export const insertComplianceCheckSchema = createInsertSchema(complianceChecks).omit({ id: true, createdAt: true });
export const insertTriageRecordSchema = createInsertSchema(triageRecords).omit({ id: true, createdAt: true });
export const insertPatientAnalysisHistorySchema = createInsertSchema(patientAnalysisHistory).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPatientGeneratedMessageSchema = createInsertSchema(patientGeneratedMessages).omit({ id: true, createdAt: true });
export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({ id: true, createdAt: true });
export const insertGoogleDriveTokenSchema = createInsertSchema(googleDriveTokens).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPatientCommentaryCacheSchema = createInsertSchema(patientCommentaryCache).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export interface PatientStats {
  sentMessageCount: number;
  visitCount: number;
  pendingMessageCount: number;
}

export type PatientWithStats = Patient & { stats?: PatientStats };
export type PatientSource = typeof patientSources.$inferSelect;
export type InsertPatientSource = z.infer<typeof insertPatientSourceSchema>;
export type MessageCandidate = typeof messageCandidates.$inferSelect;
export type InsertMessageCandidate = z.infer<typeof insertMessageCandidateSchema>;
export type MessageFinal = typeof messageFinals.$inferSelect;
export type InsertMessageFinal = z.infer<typeof insertMessageFinalSchema>;
export type CreditWallet = typeof creditWallets.$inferSelect;
export type CreditLedger = typeof creditLedgers.$inferSelect;
export type InsertCreditLedger = z.infer<typeof insertCreditLedgerSchema>;
export type AdminCreditGrant = typeof adminCreditGrants.$inferSelect;
export type RagDocument = typeof ragDocuments.$inferSelect;
export type InsertRagDocument = z.infer<typeof insertRagDocumentSchema>;
export type ShareLink = typeof shareLinks.$inferSelect;
export type ShareInvite = typeof shareInvites.$inferSelect;
export type InsertShareInvite = z.infer<typeof insertShareInviteSchema>;
export type BookingEvent = typeof bookingEvents.$inferSelect;
export type InsertBookingEvent = z.infer<typeof insertBookingEventSchema>;
export type BookingRecommendation = typeof bookingRecommendations.$inferSelect;
export type InsertBookingRecommendation = z.infer<typeof insertBookingRecommendationSchema>;
export type BookingRequest = typeof bookingRequests.$inferSelect;
export type InsertBookingRequest = z.infer<typeof insertBookingRequestSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type DoctorProfile = typeof doctorProfiles.$inferSelect;
export type DeliveryLog = typeof deliveryLogs.$inferSelect;
export type MessagePlanRun = typeof messagePlanRuns.$inferSelect;
export type RecommendedPatientsCache = typeof recommendedPatientsCache.$inferSelect;
export type InsertRecommendedPatientsCache = z.infer<typeof insertRecommendedPatientsCacheSchema>;
export type HospitalSettings = typeof hospitalSettings.$inferSelect;
export type MessageAutomationSettings = typeof messageAutomationSettings.$inferSelect;
export type InsertMessageAutomationSettings = z.infer<typeof insertMessageAutomationSettingsSchema>;
export type AutomationRun = typeof automationRuns.$inferSelect;
export type InsertAutomationRun = z.infer<typeof insertAutomationRunSchema>;
export type InsertHospitalSettings = z.infer<typeof insertHospitalSettingsSchema>;
export type PatientProfile = typeof patientProfiles.$inferSelect;
export type InsertPatientProfile = z.infer<typeof insertPatientProfileSchema>;
export type DoctorRagPattern = typeof doctorRagPatterns.$inferSelect;
export type InsertDoctorRagPattern = z.infer<typeof insertDoctorRagPatternSchema>;
export type FaqCard = typeof faqCards.$inferSelect;
export type InsertFaqCard = z.infer<typeof insertFaqCardSchema>;
export type DoctorKnowledge = typeof doctorKnowledge.$inferSelect;
export type InsertDoctorKnowledge = z.infer<typeof insertDoctorKnowledgeSchema>;
export type DoctorKnowledgeBackup = typeof doctorKnowledgeBackup.$inferSelect;
export type InsertDoctorKnowledgeBackup = z.infer<typeof insertDoctorKnowledgeBackupSchema>;
export type WeatherData = typeof weatherData.$inferSelect;
export type InsertWeatherData = z.infer<typeof insertWeatherDataSchema>;
export type WeatherPattern = typeof weatherPatterns.$inferSelect;
export type InsertWeatherPattern = z.infer<typeof insertWeatherPatternSchema>;
export type ScheduleSettings = typeof scheduleSettings.$inferSelect;
export type InsertScheduleSettings = z.infer<typeof insertScheduleSettingsSchema>;
export type DeliveryResult = typeof deliveryResults.$inferSelect;
export type InsertDeliveryResult = z.infer<typeof insertDeliveryResultSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type PatientFact = typeof patientFacts.$inferSelect;
export type InsertPatientFact = z.infer<typeof insertPatientFactSchema>;
export type InfographicSpec = typeof infographicSpecs.$inferSelect;
export type InsertInfographicSpec = z.infer<typeof insertInfographicSpecSchema>;
export type PatientInfographicHistory = typeof patientInfographicHistory.$inferSelect;
export type InsertPatientInfographicHistory = z.infer<typeof insertPatientInfographicHistorySchema>;
export type PatientReportHistory = typeof patientReportHistory.$inferSelect;
export type InsertPatientReportHistory = z.infer<typeof insertPatientReportHistorySchema>;
export type ChatEvaluation = typeof chatEvaluations.$inferSelect;
export type InsertChatEvaluation = z.infer<typeof insertChatEvaluationSchema>;
export type AgentTestResult = typeof agentTestResults.$inferSelect;
export type InsertAgentTestResult = z.infer<typeof insertAgentTestResultSchema>;
export type ComplianceCheck = typeof complianceChecks.$inferSelect;
export type InsertComplianceCheck = z.infer<typeof insertComplianceCheckSchema>;
export type TriageRecord = typeof triageRecords.$inferSelect;
export type InsertTriageRecord = z.infer<typeof insertTriageRecordSchema>;
export type PatientAnalysisHistory = typeof patientAnalysisHistory.$inferSelect;
export type InsertPatientAnalysisHistory = z.infer<typeof insertPatientAnalysisHistorySchema>;
export type PatientGeneratedMessage = typeof patientGeneratedMessages.$inferSelect;
export type InsertPatientGeneratedMessage = z.infer<typeof insertPatientGeneratedMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type GoogleDriveToken = typeof googleDriveTokens.$inferSelect;
export type InsertGoogleDriveToken = z.infer<typeof insertGoogleDriveTokenSchema>;
export type AnalysisProgress = typeof analysisProgress.$inferSelect;
export const insertAnalysisProgressSchema = createInsertSchema(analysisProgress).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAnalysisProgress = z.infer<typeof insertAnalysisProgressSchema>;
export type PatientCommentaryCache = typeof patientCommentaryCache.$inferSelect;
export type InsertPatientCommentaryCache = z.infer<typeof insertPatientCommentaryCacheSchema>;

export const messageCandidateJsonSchema = z.object({
  schema_version: z.string().default("1.0"),
  patient_id: z.string(),
  tab_type: z.enum(["RESERVATION", "AI_TRIAGE", "CONDITION", "HISTORY", "DOCTOR_RAG", "FINAL"]),
  triage: z.enum(["RED", "YELLOW", "GREEN"]),
  message_type: z.enum(["PRE_VISIT", "POST_VISIT_REPORT", "MED_ADHERENCE", "VACCINE_GAP", "SEASONAL_PREVENTION", "LOST_PATIENT", "GENERAL_CARE"]),
  trigger: z.object({
    kind: z.enum(["RELATIVE_DATE", "FIXED_ANNUAL", "API_EVENT", "VISIT_EVENT", "PRESCRIPTION_EVENT"]),
    rule_code: z.string(),
    target_date: z.string(),
    send_window: z.string().default("09:00-18:00"),
    dedupe_key: z.string(),
  }),
  channel_recommendation: z.array(z.enum(["KAKAO_ALIMTALK", "SMS", "NAVER_TALK"])),
  title: z.string(),
  body: z.string(),
  variables_used: z.object({
    patient_name: z.string().optional(),
    diagnosis_codes: z.array(z.string()).optional(),
    drug_codes: z.array(z.string()).optional(),
    last_visit_date: z.string().optional(),
    recommended_vaccine: z.string().optional(),
    recommended_date: z.string().optional(),
  }).optional(),
  rationale: z.object({
    why_now: z.string(),
    evidence: z.array(z.string()),
    doc_citation: z.array(z.string()).optional(),
  }),
  expected_outcome: z.object({
    goal: z.enum(["REDUCE_NO_SHOW", "INCREASE_RETURN", "SAFETY_CHECK", "VACCINE_COMPLETION"]),
    priority_score: z.number(),
  }),
  editable: z.boolean().default(true),
});

export type MessageCandidateJson = z.infer<typeof messageCandidateJsonSchema>;

// 진단처방카드 (Flashcard) - AI Agent RAG 학습용
export const flashCards = pgTable("flash_cards", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  isLearned: boolean("is_learned").default(false),
  learnedAt: timestamp("learned_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertFlashCardSchema = createInsertSchema(flashCards).omit({ id: true, createdAt: true });
export type FlashCard = typeof flashCards.$inferSelect;
export type InsertFlashCard = z.infer<typeof insertFlashCardSchema>;

// ========== AI Agent RAG Chat System Tables ==========

// Agent Chat History - 대화 히스토리 저장
export const agentChatRoleEnum = pgEnum("agent_chat_role", ["user", "assistant", "system"]);

export const agentChatHistory = pgTable("agent_chat_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }),
  role: agentChatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  language: text("language").default("ko"),
  safetyFlags: jsonb("safety_flags").default([]),
  tokensIn: integer("tokens_in").default(0),
  tokensOut: integer("tokens_out").default(0),
  model: text("model").default("gpt-4o"),
  latencyMs: integer("latency_ms"),
  citations: jsonb("citations").default([]),
  qualityMetrics: jsonb("quality_metrics").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Agent Learned Conversations - 승인형 학습 대화
export const agentLearnedConversations = pgTable("agent_learned_conversations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  summary: text("summary"),
  embedding: jsonb("embedding").default([]),
  qaQualityScore: integer("qa_quality_score").default(0),
  hasRagEvidence: boolean("has_rag_evidence").default(false),
  hasRiskExpression: boolean("has_risk_expression").default(false),
  hasPatientPii: boolean("has_patient_pii").default(false),
  isApproved: boolean("is_approved").default(false),
  approvedBy: varchar("approved_by", { length: 36 }),
  approvedAt: timestamp("approved_at"),
  promotedToRagDocumentId: varchar("promoted_to_rag_document_id", { length: 36 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Knowledge Graph Nodes - 지식그래프 노드
export const kgNodeTypeEnum = pgEnum("kg_node_type", ["DIAGNOSIS", "PRESCRIPTION", "PROCEDURE", "SYMPTOM", "ADVICE", "WARNING", "FAQ"]);

export const kgNodes = pgTable("kg_nodes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  nodeType: kgNodeTypeEnum("node_type").notNull(),
  label: text("label").notNull(),
  code: text("code"),
  attrsJson: jsonb("attrs_json").default({}),
  embedding: jsonb("embedding").default([]),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Knowledge Graph Edges - 지식그래프 관계
export const kgRelationEnum = pgEnum("kg_relation", ["TREATS", "CAUSES", "REQUIRES", "CONTRAINDICATES", "RECOMMENDS", "FOLLOWS", "RELATED_TO"]);

export const kgEdges = pgTable("kg_edges", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  fromNodeId: varchar("from_node_id", { length: 36 }).notNull().references(() => kgNodes.id),
  toNodeId: varchar("to_node_id", { length: 36 }).notNull().references(() => kgNodes.id),
  relation: kgRelationEnum("relation").notNull(),
  weight: integer("weight").default(1),
  evidenceJson: jsonb("evidence_json").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// User Notifications - 사용자 알림 (행동 기반)
export const notificationTypeEnum = pgEnum("notification_type", [
  // 기존 알림 유형
  "RECOMMENDED_PATIENTS",
  "WEEKLY_REPORT", 
  "LEVEL_UP",
  "SCORE_TIP",
  "ACHIEVEMENT",
  "FLASHCARD_LEARN",
  "NEW_FEATURE",
  "DORMANT_REMINDER",
  "QA_APPROVAL_REQUEST",
  // 환자 관련
  "NEW_PATIENT",
  "PATIENT_INQUIRY",
  // 메시지 관련  
  "MESSAGE_RECOMMENDATION_UPDATE",
  "MESSAGE_SENT_RESULT",
  "MESSAGE_DELIVERY_FAILED",
  // 팀 활동
  "TEAM_MEMBER_JOINED",
  "TEAM_MEMBER_MESSAGE",
  // AI Agent
  "AGENT_LEVEL_UP",
  "AGENT_LEARNING_COMPLETE",
  // 비즈니스/재무
  "CREDIT_LOW",
  "CREDIT_CHARGED",
  "REVENUE_DAILY",
  "REVENUE_WEEKLY",
  "REVENUE_MONTHLY",
  "REVENUE_QUARTERLY",
  // 대시보드 통계
  "STATS_SIGNIFICANT_CHANGE",
  // 외부 채널 메시지
  "EXTERNAL_PATIENT_MESSAGE",
  // 환자 채팅 알림
  "PATIENT_CHAT_NEW",
  "PATIENT_CHAT_MESSAGE",
  // 보안 알림 (Security Notifications)
  "ANOMALY_ALERT",
  "APPROVAL_REQUEST",
  "APPROVAL_RESULT",
  "SECURITY_WARNING",
  "SYSTEM_ALERT",
  "MORNING_BRIEFING",
  "URGENT_SYMPTOM_ALERT",
  "FILE_UPLOAD_COMPLETE",
  "FILE_ANALYSIS_COMPLETE"
]);

export const userNotifications = pgTable("user_notifications", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  orgId: varchar("org_id", { length: 36 }),
  notificationType: notificationTypeEnum("notification_type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  dataJson: jsonb("data_json").default({}),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Team Chat Messages - 팀원 채팅
export const teamChatMessages = pgTable("team_chat_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  roomId: varchar("room_id", { length: 36 }).notNull(),
  senderId: varchar("sender_id", { length: 36 }).notNull(),
  content: text("content").notNull(),
  attachments: jsonb("attachments").default([]),
  isRead: boolean("is_read").default(false),
  isEdited: boolean("is_edited").default(false),
  isDeleted: boolean("is_deleted").default(false),
  isPinned: boolean("is_pinned").default(false),
  hiddenFor: jsonb("hidden_for").default([]),
  reactions: jsonb("reactions").default({}),
  replyToId: varchar("reply_to_id", { length: 36 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Team Chat Rooms - 팀원 채팅방
export const teamChatRooms = pgTable("team_chat_rooms", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  name: text("name"),
  isGroup: boolean("is_group").default(false),
  memberIds: jsonb("member_ids").default([]),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Patient Chat Rooms - 환자 채팅방
export const patientChatRooms = pgTable("patient_chat_rooms", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).notNull(),
  doctorId: varchar("doctor_id", { length: 36 }),
  // [Fix 1] 링크 생성 시점 의사 이름 스냅샷 — 이후 hospitalSettings가 바뀌어도 불변
  createdByDoctorName: text("created_by_doctor_name"),
  accessToken: varchar("access_token", { length: 64 }).notNull(),
  patientName: text("patient_name").default('방문자'),
  source: text("source").default('CLINIC_LINK'),
  chartPatientId: varchar("chart_patient_id", { length: 64 }),
  platformSessionId: varchar("platform_session_id", { length: 128 }),
  lastMessageAt: timestamp("last_message_at"),
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  messageCandidateId: varchar("message_candidate_id", { length: 36 }),
  isActive: boolean("is_active").default(true),
  isDoctorDirectMode: boolean("is_doctor_direct_mode").default(false),
  doctorDirectSince: timestamp("doctor_direct_since"),
  memberIds: jsonb("member_ids").default([]),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Patient Chat Messages - 환자 채팅 메시지
export const patientChatMessages = pgTable("patient_chat_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id", { length: 36 }).notNull(),
  senderId: varchar("sender_id", { length: 36 }).notNull(),
  senderType: text("sender_type").notNull(),
  content: text("content").notNull(),
  attachments: jsonb("attachments").default([]),
  isRead: boolean("is_read").default(false),
  chatLink: text("chat_link"),
  channel: text("channel").default('in_app'),
  twilioMessageSid: varchar("twilio_message_sid", { length: 64 }),
  isEdited: boolean("is_edited").default(false),
  isDeleted: boolean("is_deleted").default(false),
  isPinned: boolean("is_pinned").default(false),
  hiddenFor: jsonb("hidden_for").default([]),
  reactions: jsonb("reactions").default({}),
  replyToId: varchar("reply_to_id", { length: 36 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Consultation Summaries - 상담 요약
export const consultationSummaries = pgTable("consultation_summaries", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).notNull(),
  roomId: varchar("room_id", { length: 36 }).notNull(),
  chartPatientId: varchar("chart_patient_id", { length: 64 }),
  summary: text("summary").notNull(),
  keyFindings: jsonb("key_findings").default([]),
  recommendations: jsonb("recommendations").default([]),
  messageCount: integer("message_count").default(0),
  consultedAt: timestamp("consulted_at").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Broadcast Messages - 전체 공지 발송
export const broadcastMessages = pgTable("broadcast_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  targetType: text("target_type").notNull(),
  channel: text("channel").notNull().default('sms'),
  content: text("content").notNull(),
  sentBy: varchar("sent_by", { length: 36 }).notNull(),
  totalRecipients: integer("total_recipients").default(0),
  deliveredCount: integer("delivered_count").default(0),
  failedCount: integer("failed_count").default(0),
  creditUsed: integer("credit_used").default(0),
  status: text("status").default('pending'),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Sub-Agents - 환자 데이터 분석 서브에이전트
export const subAgentStatusEnum = pgEnum("sub_agent_status", ["active", "inactive", "draft"]);

export const subAgents = pgTable("sub_agents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").notNull(),
  inputSchema: jsonb("input_schema").default({}),
  outputSchema: jsonb("output_schema").default({}),
  status: subAgentStatusEnum("status").default("active").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  aiProvider: text("ai_provider").default("gemini").notNull(),
  aiModel: text("ai_model").default("gemini-2.5-flash").notNull(),
  createdBy: varchar("created_by", { length: 36 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Sub-Agent Run Logs - 서브에이전트 실행 기록
export const subAgentRunStatusEnum = pgEnum("sub_agent_run_status", ["pending", "running", "completed", "failed"]);

export const subAgentRuns = pgTable("sub_agent_runs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  subAgentId: varchar("sub_agent_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }),
  inputData: jsonb("input_data").default({}),
  outputData: jsonb("output_data").default({}),
  status: subAgentRunStatusEnum("status").default("pending").notNull(),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp("completed_at"),
});

// RAG Fallback Statistics - RAG 실패 시 Fallback 통계
export const ragFallbackStats = pgTable("rag_fallback_stats", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  userEmail: text("user_email"),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  userMessage: text("user_message").notNull(),
  fallbackReason: text("fallback_reason").notNull(),
  errorDetails: text("error_details"),
  fallbackResponse: text("fallback_response"),
  stage: text("stage").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Learning Queue Status Enum
export const learningQueueStatusEnum = pgEnum("learning_queue_status", ["pending", "processing", "completed", "failed"]);
export const learningSourceTypeEnum = pgEnum("learning_source_type", ["emr_chart", "emr_diagnosis", "emr_prescription", "emr_visit", "emr_analysis", "file_upload", "text_paste", "google_drive"]);

// Chart Sync Log - 차트 동기화 상태 추적
export const chartSyncLog = pgTable("chart_sync_log", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).notNull(),
  chartRecordId: text("chart_record_id").notNull(),
  contentHash: text("content_hash").notNull(),
  syncedAt: timestamp("synced_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  processedAt: timestamp("processed_at"),
  status: learningQueueStatusEnum("status").default("pending").notNull(),
});

// Learning Queue - 백그라운드 학습 대기열
export const learningQueue = pgTable("learning_queue", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  sourceType: learningSourceTypeEnum("source_type").notNull(),
  sourceId: text("source_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  metadataJson: jsonb("metadata_json").default({}),
  priority: integer("priority").default(0),
  status: learningQueueStatusEnum("status").default("pending").notNull(),
  retryCount: integer("retry_count").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  processedAt: timestamp("processed_at"),
});

// Platform Integrations - 플랫폼 연동 설정
export const platformIntegrationStatusEnum = pgEnum("platform_integration_status", ["active", "inactive", "pending"]);

export const platformIntegrations = pgTable("platform_integrations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  platform: text("platform").notNull(),
  status: platformIntegrationStatusEnum("status").default("inactive").notNull(),
  apiKey: text("api_key"),
  webhookUrl: text("webhook_url"),
  configJson: jsonb("config_json").default({}),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertPlatformIntegrationSchema = createInsertSchema(platformIntegrations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformIntegration = z.infer<typeof insertPlatformIntegrationSchema>;
export type PlatformIntegration = typeof platformIntegrations.$inferSelect;

export const platformAgentDeployments = pgTable("platform_agent_deployments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  integrationId: varchar("integration_id", { length: 36 }).notNull(),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  platform: text("platform").notNull(),
  deploymentStatus: text("deployment_status").default("pending").notNull(),
  agentConfig: jsonb("agent_config").default({}),
  webhookSecret: text("webhook_secret"),
  totalSessions: integer("total_sessions").default(0),
  totalMessages: integer("total_messages").default(0),
  lastActivityAt: timestamp("last_activity_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertPlatformAgentDeploymentSchema = createInsertSchema(platformAgentDeployments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformAgentDeployment = z.infer<typeof insertPlatformAgentDeploymentSchema>;
export type PlatformAgentDeployment = typeof platformAgentDeployments.$inferSelect;

// Insert Schemas and Types for Chart Sync and Learning Queue
export const insertChartSyncLogSchema = createInsertSchema(chartSyncLog).omit({ id: true, syncedAt: true });
export const insertLearningQueueSchema = createInsertSchema(learningQueue).omit({ id: true, createdAt: true });
export type ChartSyncLog = typeof chartSyncLog.$inferSelect;
export type InsertChartSyncLog = z.infer<typeof insertChartSyncLogSchema>;
export type LearningQueue = typeof learningQueue.$inferSelect;
export type InsertLearningQueue = z.infer<typeof insertLearningQueueSchema>;

// Insert Schemas and Types for new tables
export const insertAgentChatHistorySchema = createInsertSchema(agentChatHistory).omit({ id: true, createdAt: true });
export const insertAgentLearnedConversationSchema = createInsertSchema(agentLearnedConversations).omit({ id: true, createdAt: true });
export const insertKgNodeSchema = createInsertSchema(kgNodes).omit({ id: true, createdAt: true });
export const insertKgEdgeSchema = createInsertSchema(kgEdges).omit({ id: true, createdAt: true });
export const insertUserNotificationSchema = createInsertSchema(userNotifications).omit({ id: true, createdAt: true });
export const insertTeamChatMessageSchema = createInsertSchema(teamChatMessages).omit({ id: true, createdAt: true });
export const insertTeamChatRoomSchema = createInsertSchema(teamChatRooms).omit({ id: true, createdAt: true });
export const insertRagFallbackStatSchema = createInsertSchema(ragFallbackStats).omit({ id: true, createdAt: true });
export const insertPatientChatRoomSchema = createInsertSchema(patientChatRooms).omit({ id: true, createdAt: true });
export const insertPatientChatMessageSchema = createInsertSchema(patientChatMessages).omit({ id: true, createdAt: true });
export const insertBroadcastMessageSchema = createInsertSchema(broadcastMessages).omit({ id: true, createdAt: true });
export const insertConsultationSummarySchema = createInsertSchema(consultationSummaries).omit({ id: true, createdAt: true });

export type AgentChatHistory = typeof agentChatHistory.$inferSelect;
export type InsertAgentChatHistory = z.infer<typeof insertAgentChatHistorySchema>;
export type AgentLearnedConversation = typeof agentLearnedConversations.$inferSelect;
export type InsertAgentLearnedConversation = z.infer<typeof insertAgentLearnedConversationSchema>;
export type KgNode = typeof kgNodes.$inferSelect;
export type InsertKgNode = z.infer<typeof insertKgNodeSchema>;
export type KgEdge = typeof kgEdges.$inferSelect;
export type InsertKgEdge = z.infer<typeof insertKgEdgeSchema>;
export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;
export type TeamChatMessage = typeof teamChatMessages.$inferSelect;
export type InsertTeamChatMessage = z.infer<typeof insertTeamChatMessageSchema>;
export type TeamChatRoom = typeof teamChatRooms.$inferSelect;
export type InsertTeamChatRoom = z.infer<typeof insertTeamChatRoomSchema>;
export type RagFallbackStat = typeof ragFallbackStats.$inferSelect;
export type InsertRagFallbackStat = z.infer<typeof insertRagFallbackStatSchema>;
export type PatientChatRoom = typeof patientChatRooms.$inferSelect;
export type InsertPatientChatRoom = z.infer<typeof insertPatientChatRoomSchema>;
export type PatientChatMessage = typeof patientChatMessages.$inferSelect;
export type InsertPatientChatMessage = z.infer<typeof insertPatientChatMessageSchema>;
export type BroadcastMessage = typeof broadcastMessages.$inferSelect;
export type InsertBroadcastMessage = z.infer<typeof insertBroadcastMessageSchema>;
export type ConsultationSummary = typeof consultationSummaries.$inferSelect;
export type InsertConsultationSummary = z.infer<typeof insertConsultationSummarySchema>;

// Sub-Agent types
export const insertSubAgentSchema = createInsertSchema(subAgents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubAgentRunSchema = createInsertSchema(subAgentRuns).omit({ id: true, createdAt: true, completedAt: true });
export type SubAgent = typeof subAgents.$inferSelect;
export type InsertSubAgent = z.infer<typeof insertSubAgentSchema>;
export type SubAgentRun = typeof subAgentRuns.$inferSelect;
export type InsertSubAgentRun = z.infer<typeof insertSubAgentRunSchema>;

// API Usage and Admin Dashboard types
export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({ id: true, createdAt: true });
export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({ id: true, createdAt: true });
export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).omit({ id: true, createdAt: true });
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type DailyStats = typeof dailyStats.$inferSelect;
export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;

// Patient Monitoring Data - 환자 휴대폰/웨어러블 건강 데이터
export const monitoringDataCategoryEnum = pgEnum("monitoring_data_category", [
  "SLEEP", "STEPS", "RUNNING", "ENERGY", "FLOORS", "MENSTRUAL",
  "BODY_MEASUREMENTS", "HEART", "NUTRITION", "MOBILITY",
  "MENTAL_HEALTH", "SYMPTOMS", "HEARING", "MEDICATIONS",
  "RESPIRATORY", "ACTIVITY", "VITALS", "OTHER"
]);

export const patientMonitoringConsent = pgTable("patient_monitoring_consent", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  phoneConsentEnabled: boolean("phone_consent_enabled").default(false),
  gearConsentEnabled: boolean("gear_consent_enabled").default(false),
  consentRequestedAt: timestamp("consent_requested_at"),
  consentGrantedAt: timestamp("consent_granted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const patientMonitoringData = pgTable("patient_monitoring_data", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  category: monitoringDataCategoryEnum("category").notNull(),
  dataType: text("data_type").notNull(),
  value: text("value"),
  unit: text("unit"),
  numericValue: integer("numeric_value"),
  sourceDevice: text("source_device"),
  recordedAt: timestamp("recorded_at").notNull(),
  metadataJson: jsonb("metadata_json").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Patient Risk Assessment - 긴급도/이탈가능성/합병증 위험도
export const urgencyLevelEnum = pgEnum("urgency_level", ["EMERGENCY", "URGENT", "ROUTINE", "PREVENTIVE"]);
export const riskLevelEnum = pgEnum("risk_level", ["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

export const patientRiskAssessment = pgTable("patient_risk_assessment", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id),
  urgencyLevel: urgencyLevelEnum("urgency_level").default("ROUTINE"),
  urgencyReason: text("urgency_reason"),
  churnRiskScore: integer("churn_risk_score").default(0),
  churnRiskFactors: jsonb("churn_risk_factors").default([]),
  complicationRiskScore: integer("complication_risk_score").default(0),
  complicationRiskFactors: jsonb("complication_risk_factors").default([]),
  lastReasoningContext: text("last_reasoning_context"),
  nonReturnAnalysis: jsonb("non_return_analysis").default({}),
  assessedAt: timestamp("assessed_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Insert Schemas and Types for Monitoring
export const insertPatientMonitoringConsentSchema = createInsertSchema(patientMonitoringConsent).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPatientMonitoringDataSchema = createInsertSchema(patientMonitoringData).omit({ id: true, createdAt: true });
export const insertPatientRiskAssessmentSchema = createInsertSchema(patientRiskAssessment).omit({ id: true, createdAt: true, updatedAt: true });

export type PatientMonitoringConsent = typeof patientMonitoringConsent.$inferSelect;
export type InsertPatientMonitoringConsent = z.infer<typeof insertPatientMonitoringConsentSchema>;
export type PatientMonitoringData = typeof patientMonitoringData.$inferSelect;
export type InsertPatientMonitoringData = z.infer<typeof insertPatientMonitoringDataSchema>;
export type PatientRiskAssessment = typeof patientRiskAssessment.$inferSelect;
export type InsertPatientRiskAssessment = z.infer<typeof insertPatientRiskAssessmentSchema>;

// Doctor RAG Rankings - 의사별 RAG 점수 및 랭킹 저장
export const doctorRagRankings = pgTable("doctor_rag_rankings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull().references(() => doctorProfiles.id),
  
  // 총 RAG 점수 (0-100)
  totalScore: integer("total_score").default(0),
  
  // 세부 점수 (각 0-25)
  dataScore: integer("data_score").default(0),
  knowledgeScore: integer("knowledge_score").default(0),
  performanceScore: integer("performance_score").default(0),
  safetyScore: integer("safety_score").default(0),
  
  // 등급 (소수점 포함, 예: 6.3)
  gradeLevel: text("grade_level").default("9.0"),
  
  // 랭킹 정보 (각 순위)
  specialtyRank: integer("specialty_rank"),
  regionRank: integer("region_rank"),
  conditionRanksJson: jsonb("condition_ranks_json").default({}),
  
  // 메타데이터
  knowledgeCount: integer("knowledge_count").default(0),
  patientCount: integer("patient_count").default(0),
  messageCount: integer("message_count").default(0),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertDoctorRagRankingSchema = createInsertSchema(doctorRagRankings).omit({ id: true, createdAt: true, updatedAt: true });
export type DoctorRagRanking = typeof doctorRagRankings.$inferSelect;
export type InsertDoctorRagRanking = z.infer<typeof insertDoctorRagRankingSchema>;

// =====================================================
// ALS Report History (AI 종합 분석 리포트 히스토리)
// =====================================================
export const alsReportHistory = pgTable("als_report_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id", { length: 36 }).notNull().references(() => doctorProfiles.id),
  orgId: varchar("org_id", { length: 36 }).references(() => organizations.id),
  
  // Snapshot of scores at report generation time
  totalScore: integer("total_score").default(0),
  dataScore: integer("data_score").default(0),
  knowledgeScore: integer("knowledge_score").default(0),
  performanceScore: integer("performance_score").default(0),
  safetyScore: integer("safety_score").default(0),
  gradeLevel: text("grade_level").default("9.0"),
  
  // AI generated report content
  reportContent: text("report_content").notNull(),
  reportTitle: text("report_title"),
  
  // Metadata
  knowledgeCount: integer("knowledge_count").default(0),
  patientCount: integer("patient_count").default(0),
  messageCount: integer("message_count").default(0),
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAlsReportHistorySchema = createInsertSchema(alsReportHistory).omit({ id: true, createdAt: true });
export type AlsReportHistory = typeof alsReportHistory.$inferSelect;
export type InsertAlsReportHistory = z.infer<typeof insertAlsReportHistorySchema>;

// =====================================================
// BIT EMR Integration Schema (비트 EMR 연동)
// =====================================================

// BIT 연동 상태 ENUM
export const bitIntegrationStatusEnum = pgEnum("bit_integration_status", ["ACTIVE", "PENDING", "SUSPENDED", "REVOKED"]);
export const bitDeliveryStatusEnum = pgEnum("bit_delivery_status", ["PENDING", "DELIVERED", "FAILED", "CLICKED", "EXPIRED"]);
export const bitEventTypeEnum = pgEnum("bit_event_type", ["LINK_CLICKED", "CHAT_STARTED", "CHAT_COMPLETED", "TRIAGE_COMPLETED", "APPOINTMENT_BOOKED"]);

// BIT EMR 연동 설정 (병원/의사 등록)
export const bitIntegrations = pgTable("bit_integrations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bitOrgId: varchar("bit_org_id", { length: 100 }).notNull().unique(),
  doctalkOrgId: varchar("doctalk_org_id", { length: 36 }).references(() => organizations.id),
  orgName: text("org_name").notNull(),
  status: bitIntegrationStatusEnum("status").default("PENDING").notNull(),
  featuresJson: jsonb("features_json").default({ agent_link: true, messaging: true, cs_agent: false }),
  apiKeyHash: varchar("api_key_hash", { length: 128 }),
  ipAllowlist: text("ip_allowlist").array(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// BIT 의사 매핑 테이블
export const bitDoctorMappings = pgTable("bit_doctor_mappings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bitIntegrationId: varchar("bit_integration_id", { length: 36 }).notNull().references(() => bitIntegrations.id),
  bitDoctorId: varchar("bit_doctor_id", { length: 100 }).notNull(),
  doctalkDoctorId: varchar("doctalk_doctor_id", { length: 36 }).references(() => doctorProfiles.id),
  nameMasked: text("name_masked"),
  department: text("department"),
  agentId: varchar("agent_id", { length: 36 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// BIT 비식별 환자 데이터 (patient_key 기반)
export const bitPatients = pgTable("bit_patients", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bitIntegrationId: varchar("bit_integration_id", { length: 36 }).notNull().references(() => bitIntegrations.id),
  bitDoctorId: varchar("bit_doctor_id", { length: 100 }).notNull(),
  patientKey: varchar("patient_key", { length: 128 }).notNull(),
  sex: varchar("sex", { length: 1 }),
  ageBand: varchar("age_band", { length: 10 }),
  visitHistoryJson: jsonb("visit_history_json").default([]),
  diagnosisIcd10: text("diagnosis_icd10").array(),
  prescriptionsJson: jsonb("prescriptions_json").default([]),
  appointmentsJson: jsonb("appointments_json").default([]),
  flagsJson: jsonb("flags_json").default({}),
  lastSyncAt: timestamp("last_sync_at").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// BIT 메시지 의도 패킷 (닥톡 → 비트)
export const bitMessageIntents = pgTable("bit_message_intents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bitPatientId: varchar("bit_patient_id", { length: 36 }).notNull().references(() => bitPatients.id),
  patientKey: varchar("patient_key", { length: 128 }).notNull(),
  channelHint: varchar("channel_hint", { length: 20 }),
  intent: varchar("intent", { length: 50 }).notNull(),
  messageText: text("message_text").notNull(),
  requiredDisclaimer: text("required_disclaimer"),
  safetyFlagsJson: jsonb("safety_flags_json").default([]),
  triggerReason: text("trigger_reason"),
  priority: integer("priority").default(50),
  creditCostAi: integer("credit_cost_ai").default(0),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// BIT 전송 로그 (비트 → 닥톡)
export const bitDeliveryLogs = pgTable("bit_delivery_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bitIntegrationId: varchar("bit_integration_id", { length: 36 }).notNull().references(() => bitIntegrations.id),
  messageIntentId: varchar("message_intent_id", { length: 36 }).references(() => bitMessageIntents.id),
  patientKey: varchar("patient_key", { length: 128 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull(),
  status: bitDeliveryStatusEnum("status").default("PENDING").notNull(),
  errorCode: text("error_code"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// BIT 환자 인게이지먼트 이벤트
export const bitEngagementEvents = pgTable("bit_engagement_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  messageIntentId: varchar("message_intent_id", { length: 36 }).references(() => bitMessageIntents.id),
  patientKey: varchar("patient_key", { length: 128 }).notNull(),
  eventType: bitEventTypeEnum("event_type").notNull(),
  metaJson: jsonb("meta_json").default({}),
  sessionId: varchar("session_id", { length: 100 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// BIT 채팅 토큰 (단기 1회성 인증)
export const bitChatTokens = pgTable("bit_chat_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token", { length: 128 }).notNull().unique(),
  patientKey: varchar("patient_key", { length: 128 }).notNull(),
  agentId: varchar("agent_id", { length: 36 }).notNull(),
  messageIntentId: varchar("message_intent_id", { length: 36 }).references(() => bitMessageIntents.id),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// =====================================================
// BIT EMR API Request/Response Zod Schemas
// =====================================================

// POST /v1/integrations/bit/register
export const bitRegisterRequestSchema = z.object({
  org_id: z.string().min(1),
  org_name: z.string().min(1),
  doctors: z.array(z.object({
    doctor_id: z.string().min(1),
    name_masked: z.string().optional(),
    dept: z.string().optional(),
  })),
  features: z.object({
    agent_link: z.boolean().default(true),
    messaging: z.boolean().default(true),
    cs_agent: z.boolean().default(false),
  }).optional(),
});
export type BitRegisterRequest = z.infer<typeof bitRegisterRequestSchema>;

// POST /v1/patients/upsert
// snake_case / camelCase 양쪽 허용 (normalizeBitPatientBody 전처리 후 파싱)
export const bitPatientUpsertRequestSchema = z.object({
  org_id: z.string().optional(),          // 인증 토큰에서 자동 추출 — 선택적
  doctor_id: z.string().min(1),
  patients: z.array(z.object({
    patient_key: z.string().min(1),
    sex: z.enum(["M", "F"]).optional(),
    age_band: z.string().optional(),
    visit_history: z.array(z.object({
      ym: z.string().optional(),
      date: z.string().optional(),
      type: z.string().optional(),
    }).passthrough()).optional(),          // chiefComplaint 등 추가 필드 허용
    diagnosis_icd10: z.array(z.string()).optional(),
    lab_results: z.array(z.record(z.any())).optional(),  // labResults 지원
    prescriptions: z.array(z.object({
      drug_class: z.string().optional(),
      duration_days: z.number().optional(),
    })).optional(),
    appointments: z.array(z.object({
      date: z.string().optional(),
      type: z.string().optional(),
    })).optional(),
    flags: z.record(z.any()).optional(),
  })),
});
export type BitPatientUpsertRequest = z.infer<typeof bitPatientUpsertRequestSchema>;

// POST /v1/triggers/recompute
export const bitTriggerRecomputeRequestSchema = z.object({
  org_id: z.string().min(1),
  doctor_id: z.string().min(1),
  window: z.string().default("7d"),
});
export type BitTriggerRecomputeRequest = z.infer<typeof bitTriggerRecomputeRequestSchema>;

// POST /v1/messages/generate
export const bitMessageGenerateRequestSchema = z.object({
  org_id: z.string().min(1),
  doctor_id: z.string().min(1),
  patient_key: z.string().min(1),
  criteria: z.array(z.enum(["reservation", "triage", "disease", "history", "doctor_rag"])).optional(),
});
export type BitMessageGenerateRequest = z.infer<typeof bitMessageGenerateRequestSchema>;

// POST /v1/delivery/logs
export const bitDeliveryLogRequestSchema = z.object({
  org_id: z.string().min(1),
  doctor_id: z.string().min(1),
  logs: z.array(z.object({
    message_id: z.string().min(1),
    patient_key: z.string().min(1),
    channel: z.string().min(1),
    status: z.enum(["PENDING", "DELIVERED", "FAILED", "CLICKED", "EXPIRED"]),
    sent_at: z.string().optional(),
    error_code: z.string().optional(),
  })),
});
export type BitDeliveryLogRequest = z.infer<typeof bitDeliveryLogRequestSchema>;

// POST /v1/engagement/events
export const bitEngagementEventRequestSchema = z.object({
  message_id: z.string().min(1),
  patient_key: z.string().min(1),
  event: z.enum(["LINK_CLICKED", "CHAT_STARTED", "CHAT_COMPLETED", "TRIAGE_COMPLETED", "APPOINTMENT_BOOKED"]),
  meta: z.record(z.any()).optional(),
});
export type BitEngagementEventRequest = z.infer<typeof bitEngagementEventRequestSchema>;

// Insert schemas for tables
export const insertBitIntegrationSchema = createInsertSchema(bitIntegrations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBitDoctorMappingSchema = createInsertSchema(bitDoctorMappings).omit({ id: true, createdAt: true });
export const insertBitPatientSchema = createInsertSchema(bitPatients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBitMessageIntentSchema = createInsertSchema(bitMessageIntents).omit({ id: true, createdAt: true });
export const insertBitDeliveryLogSchema = createInsertSchema(bitDeliveryLogs).omit({ id: true, createdAt: true });
export const insertBitEngagementEventSchema = createInsertSchema(bitEngagementEvents).omit({ id: true, createdAt: true });
export const insertBitChatTokenSchema = createInsertSchema(bitChatTokens).omit({ id: true, createdAt: true });

export type BitIntegration = typeof bitIntegrations.$inferSelect;
export type InsertBitIntegration = z.infer<typeof insertBitIntegrationSchema>;
export type BitDoctorMapping = typeof bitDoctorMappings.$inferSelect;
export type InsertBitDoctorMapping = z.infer<typeof insertBitDoctorMappingSchema>;
export type BitPatient = typeof bitPatients.$inferSelect;
export type InsertBitPatient = z.infer<typeof insertBitPatientSchema>;
export type BitMessageIntent = typeof bitMessageIntents.$inferSelect;
export type InsertBitMessageIntent = z.infer<typeof insertBitMessageIntentSchema>;
export type BitDeliveryLog = typeof bitDeliveryLogs.$inferSelect;
export type InsertBitDeliveryLog = z.infer<typeof insertBitDeliveryLogSchema>;
export type BitEngagementEvent = typeof bitEngagementEvents.$inferSelect;
export type InsertBitEngagementEvent = z.infer<typeof insertBitEngagementEventSchema>;
export type BitChatToken = typeof bitChatTokens.$inferSelect;
export type InsertBitChatToken = z.infer<typeof insertBitChatTokenSchema>;

// ============================================
// Multi-Partner Integration System (100+ EMR/Platform Partners)
// ============================================

export const partnerTypeEnum = pgEnum("partner_type", ["EMR", "PLATFORM"]);
export const partnerStatusEnum = pgEnum("partner_status", ["ACTIVE", "PENDING", "SUSPENDED", "REVOKED"]);
export const partnerUsageActionEnum = pgEnum("partner_usage_action", [
  "CHAT", "MESSAGE_GENERATE", "MESSAGE_SEND", "AGENT_CHAT",
  "PATIENT_SYNC", "FILE_LEARNING", "DOC_ANALYSIS", "SSO_LOGIN"
]);

export const partners = pgTable("partners", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  type: partnerTypeEnum("type").notNull(),
  status: partnerStatusEnum("status").default("PENDING").notNull(),
  description: text("description"),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  logoUrl: text("logo_url"),
  webhookUrl: text("webhook_url"),
  apiKeyHash: varchar("api_key_hash", { length: 128 }),
  ipAllowlist: text("ip_allowlist").array(),
  allowedOrigins: text("allowed_origins").array(),
  featuresJson: jsonb("features_json").default({
    white_label: false,
    login_integration: false,
    patient_sync: false,
    bidirectional_crm: false,
    agent_embed: false,
  }),
  configJson: jsonb("config_json").default({}),
  chartIdPrefix: varchar("chart_id_prefix", { length: 20 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/** 파트너 Q&A 기록 — 파트너사와의 질문/답변을 저장하고 공유 가능한 링크 제공 */
export const partnerQaEntries = pgTable("partner_qa_entries", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 36 }).notNull().references(() => partners.id),
  shareToken: varchar("share_token", { length: 64 }).notNull().unique(),
  question: text("question").notNull(),
  answerHtml: text("answer_html").notNull(),
  summary: text("summary"),
  category: varchar("category", { length: 50 }).default("general"),
  authorName: text("author_name"),
  askerName: text("asker_name"),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const partnerDoctorLinks = pgTable("partner_doctor_links", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 36 }).notNull().references(() => partners.id),
  externalDoctorId: varchar("external_doctor_id", { length: 100 }).notNull(),
  doctalkUserId: varchar("doctalk_user_id", { length: 36 }).references(() => users.id),
  doctalkDoctorId: varchar("doctalk_doctor_id", { length: 36 }),
  doctalkOrgId: varchar("doctalk_org_id", { length: 36 }).references(() => organizations.id),
  nameMasked: text("name_masked"),
  department: text("department"),
  externalRole: varchar("external_role", { length: 20 }).default("DOCTOR"),
  isActive: boolean("is_active").default(true).notNull(),
  metaJson: jsonb("meta_json").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const partnerUsageLogs = pgTable("partner_usage_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 36 }).notNull().references(() => partners.id),
  doctalkDoctorId: varchar("doctalk_doctor_id", { length: 36 }),
  externalDoctorId: varchar("external_doctor_id", { length: 100 }),
  action: partnerUsageActionEnum("action").notNull(),
  creditsUsed: integer("credits_used").default(0).notNull(),
  requestMetaJson: jsonb("request_meta_json").default({}),
  responseStatus: varchar("response_status", { length: 20 }).default("SUCCESS"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const partnerMessageDelivery = pgTable("partner_message_delivery", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 36 }).notNull().references(() => partners.id),
  doctalkDoctorId: varchar("doctalk_doctor_id", { length: 36 }),
  patientKey: varchar("patient_key", { length: 128 }).notNull(),
  messageId: varchar("message_id", { length: 36 }),
  channel: varchar("channel", { length: 20 }).notNull(),
  sentFromDoctalk: boolean("sent_from_doctalk").default(false).notNull(),
  sentFromPartner: boolean("sent_from_partner").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("PENDING").notNull(),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 파트너 이벤트 (Polling/Webhook용)
export const partnerEvents = pgTable("partner_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 36 }).notNull().references(() => partners.id),
  orgId: varchar("org_id", { length: 36 }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  data: jsonb("data").default({}).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const ssoNonces = pgTable("sso_nonces", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  nonce: varchar("nonce", { length: 128 }).notNull().unique(),
  partnerCode: varchar("partner_code", { length: 50 }).notNull(),
  usedAt: timestamp("used_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const ssoLoginLogs = pgTable("sso_login_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 36 }).notNull(),
  partnerCode: varchar("partner_code", { length: 50 }).notNull(),
  externalDoctorId: varchar("external_doctor_id", { length: 100 }).notNull(),
  doctalkUserId: varchar("doctalk_user_id", { length: 36 }),
  loginType: varchar("login_type", { length: 20 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  success: boolean("success").default(true).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const partnerSyncLogs = pgTable("partner_sync_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 36 }).notNull(),
  partnerCode: varchar("partner_code", { length: 50 }),
  facilityCode: varchar("facility_code", { length: 50 }),
  resolvedOrgId: varchar("resolved_org_id", { length: 36 }),
  resolveTier: varchar("resolve_tier", { length: 30 }),
  doctorId: varchar("doctor_id", { length: 100 }),
  patientCount: integer("patient_count").default(0),
  createdCount: integer("created_count").default(0),
  updatedCount: integer("updated_count").default(0),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  status: varchar("status", { length: 20 }).default("success"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_partner_sync_logs_partner").on(table.partnerId),
  index("idx_partner_sync_logs_facility").on(table.facilityCode),
]);

export const insertPartnerSchema = createInsertSchema(partners).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPartnerDoctorLinkSchema = createInsertSchema(partnerDoctorLinks).omit({ id: true, createdAt: true });
export const insertPartnerUsageLogSchema = createInsertSchema(partnerUsageLogs).omit({ id: true, createdAt: true });
export const insertPartnerMessageDeliverySchema = createInsertSchema(partnerMessageDelivery).omit({ id: true, createdAt: true });

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type PartnerDoctorLink = typeof partnerDoctorLinks.$inferSelect;
export type InsertPartnerDoctorLink = z.infer<typeof insertPartnerDoctorLinkSchema>;
export type PartnerUsageLog = typeof partnerUsageLogs.$inferSelect;
export type InsertPartnerUsageLog = z.infer<typeof insertPartnerUsageLogSchema>;
export type PartnerMessageDelivery = typeof partnerMessageDelivery.$inferSelect;
export type InsertPartnerMessageDelivery = z.infer<typeof insertPartnerMessageDeliverySchema>;
export type PartnerSyncLog = typeof partnerSyncLogs.$inferSelect;
export type SsoNonce = typeof ssoNonces.$inferSelect;
export type SsoLoginLog = typeof ssoLoginLogs.$inferSelect;

// ============================================
// Waiting Queue Events — 진료대기 정보 (v3.9)
// ============================================
export const waitingQueueEventEnum = pgEnum("waiting_queue_event", ["checkin", "start", "complete", "cancel"]);

export const waitingQueueEvents = pgTable("waiting_queue_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 36 }).notNull().references(() => partners.id),
  facilityCode: varchar("facility_code", { length: 50 }).notNull(),
  doctorId: varchar("doctor_id", { length: 100 }).notNull(),
  event: waitingQueueEventEnum("event").notNull(),
  chartPatientId: varchar("chart_patient_id", { length: 100 }).notNull(),
  queueNumber: integer("queue_number"),
  estimatedWaitMin: integer("estimated_wait_min"),
  checkedInAt: timestamp("checked_in_at"),
  department: varchar("department", { length: 100 }),
  visitType: varchar("visit_type", { length: 20 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_wq_events_partner_facility").on(table.partnerId, table.facilityCode),
  index("idx_wq_events_doctor").on(table.doctorId),
  index("idx_wq_events_created").on(table.createdAt),
]);

export const insertWaitingQueueEventSchema = createInsertSchema(waitingQueueEvents).omit({ id: true, createdAt: true });
export type WaitingQueueEvent = typeof waitingQueueEvents.$inferSelect;
export type InsertWaitingQueueEvent = z.infer<typeof insertWaitingQueueEventSchema>;

// ============================================
// Sales Pipeline — EMR/Platform 영업 관리
// ============================================

export const salesLeadStatusEnum = pgEnum("sales_lead_status", [
  "COLD", "CONTACTED", "MEETING", "CONTRACT", "INTEGRATED", "LOST",
]);
export const salesLeadPriorityEnum = pgEnum("sales_lead_priority", ["HIGH", "MEDIUM", "LOW"]);
export const salesOutreachRequestTypeEnum = pgEnum("sales_outreach_request_type", ["EMAIL", "SMS", "LINKEDIN", "ALL"]);
export const salesOutreachStatusEnum = pgEnum("sales_outreach_status", ["DRAFT", "QUEUED", "SENDING", "SENT", "FAILED"]);
export const salesMessageStatusEnum = pgEnum("sales_message_status", ["QUEUED", "SENT", "DELIVERED", "OPENED", "REPLIED", "BOUNCED", "FAILED"]);
export const signupRequestStatusEnum = pgEnum("signup_request_status", ["PENDING", "APPROVED", "REJECTED"]);
export const signupServiceTypeEnum = pgEnum("signup_service_type", ["RESERVATION", "QNA", "AI_AGENT", "ADS", "COUNSELING", "PROFILE"]);

export const doctalkServices = pgTable("doctalk_services", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  url: text("url"),
  description: text("description"),
  iconUrl: text("icon_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const salesLeads = pgTable("sales_leads", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: partnerTypeEnum("type").notNull(),
  status: salesLeadStatusEnum("status").default("COLD").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactName: text("contact_name"),
  contactLinkedin: text("contact_linkedin"),
  representativeEmail: text("representative_email"),
  representativePhone: text("representative_phone"),
  representativeLinkedin: text("representative_linkedin"),
  partnershipEmail: text("partnership_email"),
  website: text("website"),
  logoUrl: text("logo_url"),
  description: text("description"),
  assignedTo: varchar("assigned_to", { length: 36 }).references(() => users.id),
  notes: text("notes"),
  priority: salesLeadPriorityEnum("priority").default("MEDIUM").notNull(),
  targetServiceIds: text("target_service_ids").array(),
  lastContactedAt: timestamp("last_contacted_at"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_sales_leads_type").on(table.type),
  index("idx_sales_leads_status").on(table.status),
]);

export const salesOutreachRequests = pgTable("sales_outreach_requests", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  salesLeadId: varchar("sales_lead_id", { length: 36 }).notNull().references(() => salesLeads.id),
  serviceId: varchar("service_id", { length: 36 }).references(() => doctalkServices.id),
  requestType: salesOutreachRequestTypeEnum("request_type").notNull(),
  requestContent: text("request_content"),
  hospitalName: text("hospital_name"),
  hospitalEmrName: text("hospital_emr_name"),
  generatedMessages: jsonb("generated_messages").default([]),
  status: salesOutreachStatusEnum("status").default("DRAFT").notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_outreach_requests_lead").on(table.salesLeadId),
  index("idx_outreach_requests_status").on(table.status),
]);

export const salesOutreachMessages = pgTable("sales_outreach_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  outreachRequestId: varchar("outreach_request_id", { length: 36 }).notNull().references(() => salesOutreachRequests.id),
  channel: text("channel").notNull(),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  recipientLinkedin: text("recipient_linkedin"),
  subject: text("subject"),
  body: text("body").notNull(),
  messageVariant: text("message_variant"),
  status: salesMessageStatusEnum("status").default("QUEUED").notNull(),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_outreach_messages_request").on(table.outreachRequestId),
]);

export const signupRequests = pgTable("signup_requests", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  hospitalName: text("hospital_name").notNull(),
  emrName: text("emr_name"),
  businessNumber: text("business_number"),
  institutionNumber: text("institution_number"),
  representativeName: text("representative_name"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  serviceType: signupServiceTypeEnum("service_type").notNull(),
  status: signupRequestStatusEnum("status").default("PENDING").notNull(),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by", { length: 36 }).references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_signup_requests_status").on(table.status),
]);

export const insertDoctalkServiceSchema = createInsertSchema(doctalkServices).omit({ id: true, createdAt: true });
export const insertSalesLeadSchema = createInsertSchema(salesLeads).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSalesOutreachRequestSchema = createInsertSchema(salesOutreachRequests).omit({ id: true, createdAt: true });
export const insertSalesOutreachMessageSchema = createInsertSchema(salesOutreachMessages).omit({ id: true, createdAt: true });
export const insertSignupRequestSchema = createInsertSchema(signupRequests).omit({ id: true, createdAt: true });

export type DoctalkService = typeof doctalkServices.$inferSelect;
export type SalesLead = typeof salesLeads.$inferSelect;
export type SalesOutreachRequest = typeof salesOutreachRequests.$inferSelect;
export type SalesOutreachMessage = typeof salesOutreachMessages.$inferSelect;
export type SignupRequest = typeof signupRequests.$inferSelect;

// ============================================
// JIT Access & WebAuthn MFA Tables
// ============================================

// JIT Access Policies - 조직별 JIT 접근 정책 설정
export const jitAccessPolicies = pgTable("jit_access_policies", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  enabled: boolean("enabled").default(true).notNull(),
  allowedRoles: jsonb("allowed_roles").default(["OWNER"]).notNull(), // ["OWNER", "EDITOR", "VIEWER"]
  maxDurationMinutes: integer("max_duration_minutes").default(30).notNull(),
  mfaRequired: boolean("mfa_required").default(true).notNull(),
  notifyEmail: text("notify_email"),
  ipWhitelist: jsonb("ip_whitelist").default([]), // Optional IP restriction
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// WebAuthn Credentials - 사용자별 생체인증 키 저장
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  credentialId: text("credential_id").notNull().unique(), // Base64URL encoded
  publicKey: text("public_key").notNull(), // Base64URL encoded
  counter: integer("counter").default(0).notNull(),
  deviceType: text("device_type"), // "platform" (Touch ID, Face ID) or "cross-platform" (USB key)
  transports: jsonb("transports").default([]), // ["internal", "usb", "ble", "nfc"]
  aaguid: text("aaguid"), // Authenticator Attestation GUID
  friendlyName: text("friendly_name"), // "MacBook Touch ID", "iPhone Face ID"
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// JIT Access Tokens - 임시 접근 토큰
export const jitAccessTokens = pgTable("jit_access_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  token: text("token").notNull().unique(),
  scope: jsonb("scope").default([]).notNull(), // ["patientSource:read", "patientPII:read"]
  reason: text("reason").notNull(), // 접근 사유
  patientId: varchar("patient_id", { length: 36 }), // 특정 환자에 대한 접근 제한 (optional)
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"), // 실제 사용 시점
  revokedAt: timestamp("revoked_at"), // 수동 취소 시점
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// JIT Access Logs - 감사 로그 (append-only)
export const jitAccessLogs = pgTable("jit_access_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  tokenId: varchar("token_id", { length: 36 }).references(() => jitAccessTokens.id),
  action: text("action").notNull(), // "REQUEST", "GRANT", "ACCESS", "DENY", "EXPIRE", "REVOKE"
  resourceType: text("resource_type"), // "patient", "patientSource", "file"
  resourceId: varchar("resource_id", { length: 36 }),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metaJson: jsonb("meta_json").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// WebAuthn Challenges - 임시 인증 챌린지 저장
export const webauthnChallenges = pgTable("webauthn_challenges", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  challenge: text("challenge").notNull().unique(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id), // null for registration
  type: text("type").notNull(), // "registration" or "authentication"
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Encryption Keys - 파일별 암호화 키 메타데이터 (봉투 암호화)
export const encryptionKeys = pgTable("encryption_keys", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  objectPath: text("object_path").notNull().unique(), // 암호화된 파일 경로
  encryptedDataKey: text("encrypted_data_key").notNull(), // 마스터키로 래핑된 데이터키
  iv: varchar("iv", { length: 32 }).notNull(), // 초기화 벡터 (12 bytes, hex)
  authTag: varchar("auth_tag", { length: 32 }).notNull(), // 인증 태그 (16 bytes, hex)
  algorithm: varchar("algorithm", { length: 20 }).default("aes-256-gcm"),
  keyVersion: integer("key_version").default(1), // 키 로테이션 지원
  patientSourceId: varchar("patient_source_id", { length: 36 }), // 연결된 환자 소스
  orgId: varchar("org_id", { length: 36 }), // 조직 ID
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// File Access Logs - 파일 접근 감사 로그
export const fileAccessLogs = pgTable("file_access_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  userEmail: varchar("user_email"),
  orgId: varchar("org_id", { length: 36 }),
  objectPath: text("object_path").notNull(),
  patientSourceId: varchar("patient_source_id", { length: 36 }),
  patientId: varchar("patient_id", { length: 36 }),
  accessType: varchar("access_type", { length: 20 }).notNull(), // 'view', 'download', 'upload'
  jitTokenId: varchar("jit_token_id", { length: 36 }), // 사용된 JIT 토큰
  mfaVerified: boolean("mfa_verified").default(false),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  signedUrlToken: text("signed_url_token"), // 발급된 서명 URL 토큰 (추적용)
  expiresAt: timestamp("expires_at"), // URL 만료 시간
  accessedAt: timestamp("accessed_at").default(sql`CURRENT_TIMESTAMP`),
  success: boolean("success").default(true),
  failureReason: text("failure_reason"),
});

// Insert schemas
export const insertJitAccessPolicySchema = createInsertSchema(jitAccessPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWebauthnCredentialSchema = createInsertSchema(webauthnCredentials).omit({ id: true, createdAt: true });
export const insertJitAccessTokenSchema = createInsertSchema(jitAccessTokens).omit({ id: true, createdAt: true });
export const insertJitAccessLogSchema = createInsertSchema(jitAccessLogs).omit({ id: true, createdAt: true });
export const insertWebauthnChallengeSchema = createInsertSchema(webauthnChallenges).omit({ id: true, createdAt: true });
export const insertEncryptionKeySchema = createInsertSchema(encryptionKeys).omit({ id: true, createdAt: true });
export const insertFileAccessLogSchema = createInsertSchema(fileAccessLogs).omit({ id: true, accessedAt: true });

// Types
export type JitAccessPolicy = typeof jitAccessPolicies.$inferSelect;
export type InsertJitAccessPolicy = z.infer<typeof insertJitAccessPolicySchema>;
export type WebauthnCredential = typeof webauthnCredentials.$inferSelect;
export type InsertWebauthnCredential = z.infer<typeof insertWebauthnCredentialSchema>;
export type JitAccessToken = typeof jitAccessTokens.$inferSelect;
export type InsertJitAccessToken = z.infer<typeof insertJitAccessTokenSchema>;
export type JitAccessLog = typeof jitAccessLogs.$inferSelect;
export type InsertJitAccessLog = z.infer<typeof insertJitAccessLogSchema>;
export type WebauthnChallenge = typeof webauthnChallenges.$inferSelect;
export type InsertWebauthnChallenge = z.infer<typeof insertWebauthnChallengeSchema>;
export type EncryptionKey = typeof encryptionKeys.$inferSelect;
export type InsertEncryptionKey = z.infer<typeof insertEncryptionKeySchema>;
export type FileAccessLog = typeof fileAccessLogs.$inferSelect;
export type InsertFileAccessLog = z.infer<typeof insertFileAccessLogSchema>;

// TOTP Secrets - OTP 인증용 시크릿 저장
export const totpSecrets = pgTable("totp_secrets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().unique().references(() => users.id),
  encryptedSecret: text("encrypted_secret").notNull(), // AES-256-GCM encrypted TOTP secret
  iv: text("iv").notNull(), // Initialization vector for decryption
  authTag: text("auth_tag").notNull(), // Authentication tag for decryption
  verified: boolean("verified").default(false).notNull(), // Has user verified with a code?
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastUsedAt: timestamp("last_used_at"),
});

export const insertTotpSecretSchema = createInsertSchema(totpSecrets).omit({ id: true, createdAt: true });
export type TotpSecret = typeof totpSecrets.$inferSelect;
export type InsertTotpSecret = z.infer<typeof insertTotpSecretSchema>;

// Zod schemas for API requests
export const jitAccessRequestSchema = z.object({
  reason: z.string().min(1).default("소유자 접근"),
  patientId: z.string().optional(),
  durationMinutes: z.number().min(5).max(60).default(30),
});
export type JitAccessRequest = z.infer<typeof jitAccessRequestSchema>;

export const jitPolicyUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  allowedRoles: z.array(z.enum(["OWNER", "EDITOR", "VIEWER"])).optional(),
  maxDurationMinutes: z.number().min(5).max(60).optional(),
  mfaRequired: z.boolean().optional(),
  notifyEmail: z.string().email().optional(),
});
export type JitPolicyUpdate = z.infer<typeof jitPolicyUpdateSchema>;

// IP Whitelist - 허용 IP 목록
export const ipWhitelist = pgTable("ip_whitelist", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).references(() => organizations.id), // null = global
  ipAddress: text("ip_address").notNull(), // CIDR notation allowed: "192.168.1.0/24"
  description: text("description"), // 설명 (예: "본사 오피스")
  enabled: boolean("enabled").default(true).notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: timestamp("expires_at"), // null = permanent
});

// IP Whitelist Settings - 전역 설정
export const ipWhitelistSettings = pgTable("ip_whitelist_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  enabled: boolean("enabled").default(false).notNull(), // 화이트리스트 기능 활성화 여부
  adminBypass: boolean("admin_bypass").default(true).notNull(), // 관리자 우회 허용
  updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Temp Access Tokens - 시간제한 임시 접근 토큰
export const tempAccessTokens = pgTable("temp_access_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  targetEmail: text("target_email").notNull(), // 접근 허용 대상 이메일
  targetIp: text("target_ip"), // 접근 허용 IP (optional)
  grantedBy: varchar("granted_by", { length: 36 }).notNull().references(() => users.id),
  reason: text("reason").notNull(), // 접근 허용 사유
  scope: jsonb("scope").default(["admin:read"]).notNull(), // 허용 범위
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"), // 첫 사용 시점
  revokedAt: timestamp("revoked_at"), // 수동 취소 시점
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Admin Access List - 어드민 접근 권한 목록
export const adminAccessList = pgTable("admin_access_list", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(), // 어드민 접근 허용 이메일
  role: text("role").default("VIEWER").notNull(), // OWNER / EDITOR / VIEWER
  name: text("name"), // 표시 이름 (선택)
  requireCompanyIp: boolean("require_company_ip").default(true).notNull(), // 회사 IP에서만 접속 허용 (OWNER는 무시)
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAdminAccessListSchema = createInsertSchema(adminAccessList).omit({ id: true, createdAt: true, updatedAt: true });
export type AdminAccessEntry = typeof adminAccessList.$inferSelect;
export type InsertAdminAccessEntry = z.infer<typeof insertAdminAccessListSchema>;

// Patient Identity Mapping - 환자 식별정보 매핑 (격리 저장)
export const patientIdentityMapping = pgTable("patient_identity_mapping", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  patientKey: varchar("patient_key", { length: 64 }).notNull().unique(),
  patientId: varchar("patient_id", { length: 36 }),
  encryptedName: text("encrypted_name").notNull(),
  encryptedPhone: text("encrypted_phone"),
  encryptedAddress: text("encrypted_address"),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  orgId: varchar("org_id", { length: 36 }).notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Insert schemas for new tables
export const insertIpWhitelistSchema = createInsertSchema(ipWhitelist).omit({ id: true, createdAt: true });
export const insertIpWhitelistSettingsSchema = createInsertSchema(ipWhitelistSettings).omit({ id: true, updatedAt: true });
export const insertTempAccessTokenSchema = createInsertSchema(tempAccessTokens).omit({ id: true, createdAt: true });
export const insertPatientIdentityMappingSchema = createInsertSchema(patientIdentityMapping).omit({ id: true, createdAt: true, updatedAt: true });

// Types for new tables
export type IpWhitelist = typeof ipWhitelist.$inferSelect;
export type InsertIpWhitelist = z.infer<typeof insertIpWhitelistSchema>;
export type IpWhitelistSettings = typeof ipWhitelistSettings.$inferSelect;
export type InsertIpWhitelistSettings = z.infer<typeof insertIpWhitelistSettingsSchema>;
export type TempAccessToken = typeof tempAccessTokens.$inferSelect;
export type InsertTempAccessToken = z.infer<typeof insertTempAccessTokenSchema>;
export type PatientIdentityMapping = typeof patientIdentityMapping.$inferSelect;
export type InsertPatientIdentityMapping = z.infer<typeof insertPatientIdentityMappingSchema>;

// ============================================
// Security & Anomaly Detection Tables
// ============================================

// Access Logs - 모든 API 접근 기록
export const accessLogActionEnum = pgEnum("access_log_action", [
  "VIEW_PATIENT",
  "VIEW_PATIENT_LIST", 
  "VIEW_PII",
  "EXPORT_DATA",
  "ADMIN_ACTION",
  "JIT_REQUEST",
  "MFA_ATTEMPT",
  "FILE_ACCESS",
  "API_CALL"
]);

export const accessLogs = pgTable("access_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  userEmail: text("user_email"),
  action: accessLogActionEnum("action").notNull(),
  resourceType: text("resource_type"), // patients, files, admin, etc.
  resourceId: text("resource_id"), // 접근한 리소스 ID
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  endpoint: text("endpoint"), // API 엔드포인트
  method: text("method"), // HTTP 메소드
  statusCode: integer("status_code"),
  responseTime: integer("response_time"), // 응답 시간 (ms)
  metadata: jsonb("metadata").default({}), // 추가 정보
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_access_logs_user_id").on(table.userId),
  index("idx_access_logs_action").on(table.action),
  index("idx_access_logs_created_at").on(table.createdAt),
]);

// Anomaly Alerts - 이상행동 탐지 알림
export const anomalyTypeEnum = pgEnum("anomaly_type", [
  "BULK_QUERY",        // 대량 조회 (5분 내 100건 이상)
  "NIGHT_ACCESS",      // 야간 접근 (22:00-06:00)
  "MFA_FAILURE",       // MFA 실패 다수 (1시간 내 10회)
  "UNUSUAL_IP",        // 비정상 IP 접근
  "EXPORT_SPIKE",      // 대량 데이터 내보내기
  "RAPID_REQUESTS"     // 빠른 연속 요청
]);

export const anomalyAlerts = pgTable("anomaly_alerts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  userEmail: text("user_email"),
  anomalyType: anomalyTypeEnum("anomaly_type").notNull(),
  severity: text("severity").default("MEDIUM").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  description: text("description").notNull(),
  details: jsonb("details").default({}), // 탐지 상세 정보
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: varchar("resolved_by", { length: 36 }).references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolveNote: text("resolve_note"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_anomaly_alerts_user_id").on(table.userId),
  index("idx_anomaly_alerts_type").on(table.anomalyType),
  index("idx_anomaly_alerts_resolved").on(table.isResolved),
]);

// ============================================
// Notification Preferences Table (채널 어댑터 패턴 지원)
// ============================================

export const notificationChannelEnum = pgEnum("notification_channel", [
  "IN_APP",
  "EMAIL",
  "KAKAO_ALIMTALK",
  "SLACK"
]);

// Notification Preferences - 사용자별 알림 설정
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().unique().references(() => users.id),
  inAppEnabled: boolean("in_app_enabled").default(true).notNull(),
  emailEnabled: boolean("email_enabled").default(false).notNull(),
  emailAddress: text("email_address"), // 알림 받을 이메일 (기본: 사용자 이메일)
  kakaoEnabled: boolean("kakao_enabled").default(false).notNull(),
  kakaoPhone: text("kakao_phone"), // 카카오 알림톡 받을 전화번호
  slackEnabled: boolean("slack_enabled").default(false).notNull(),
  slackWebhook: text("slack_webhook"), // Slack Webhook URL
  naverTalkEnabled: boolean("naver_talk_enabled").default(false).notNull(),
  naverTalkPhone: text("naver_talk_phone"), // 네이버 톡톡 받을 전화번호
  // 알림 유형별 설정
  anomalyAlertEnabled: boolean("anomaly_alert_enabled").default(true).notNull(),
  approvalRequestEnabled: boolean("approval_request_enabled").default(true).notNull(),
  systemAlertEnabled: boolean("system_alert_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ============================================
// Dual Approval System Tables
// ============================================

export const approvalStatusEnum = pgEnum("approval_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED"
]);

export const approvalTypeEnum = pgEnum("approval_type", [
  "JIT_ACCESS",        // JIT 토큰 발급
  "PII_EXPORT",        // PII 데이터 내보내기
  "BULK_DELETE",       // 대량 삭제
  "ROLE_CHANGE"        // 권한 변경
]);

// Approval Requests - 2인 승인 요청
export const approvalRequests = pgTable("approval_requests", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id", { length: 36 }).notNull().references(() => users.id),
  requesterEmail: text("requester_email").notNull(),
  approvalType: approvalTypeEnum("approval_type").notNull(),
  status: approvalStatusEnum("status").default("PENDING").notNull(),
  reason: text("reason").notNull(), // 요청 사유
  details: jsonb("details").default({}), // 요청 상세 정보
  approverId: varchar("approver_id", { length: 36 }).references(() => users.id),
  approverEmail: text("approver_email"),
  approverNote: text("approver_note"), // 승인/거부 사유
  expiresAt: timestamp("expires_at").notNull(), // 요청 만료 시간
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_approval_requests_requester").on(table.requesterId),
  index("idx_approval_requests_status").on(table.status),
  index("idx_approval_requests_expires").on(table.expiresAt),
]);

// User Page Views - Track page visits with duration for DAU/MAU analytics
export const userPageViews = pgTable("user_page_views", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  pagePath: varchar("page_path", { length: 512 }).notNull(),
  pageName: varchar("page_name", { length: 128 }),
  enterAt: timestamp("enter_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  duration: integer("duration").default(0),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserPageViewSchema = createInsertSchema(userPageViews).omit({ id: true, createdAt: true });
export type UserPageView = typeof userPageViews.$inferSelect;
export type InsertUserPageView = z.infer<typeof insertUserPageViewSchema>;

// Doctor Source Files - persistent file/media metadata (replaces in-memory stores)
export const doctorSourceFiles = pgTable("doctor_source_files", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  doctorId: varchar("doctor_id", { length: 36 }),
  kind: varchar("kind", { length: 10 }).notNull().default("FILE"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull().default(0),
  uploadedBy: varchar("uploaded_by", { length: 100 }).notNull(),
  uploadedByName: varchar("uploaded_by_name", { length: 100 }).notNull().default(""),
  uploadedAt: timestamp("uploaded_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  metadata: jsonb("metadata").default({}),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_doctor_source_files_org").on(table.orgId),
  index("idx_doctor_source_files_kind").on(table.kind),
]);

export const insertDoctorSourceFileSchema = createInsertSchema(doctorSourceFiles).omit({ id: true, uploadedAt: true });
export type DoctorSourceFile = typeof doctorSourceFiles.$inferSelect;
export type InsertDoctorSourceFile = z.infer<typeof insertDoctorSourceFileSchema>;

// Admin audit log table - tracks sensitive admin operations (data export, bulk access, etc.)
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 100 }).notNull(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 100 }),
  details: jsonb("details"),
  recordCount: integer("record_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs).omit({ id: true, createdAt: true });
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;

// Comprehensive Audit Logs - 전체 감사 로그 (데이터 조회/수정/삭제/내보내기 추적)
export const auditActionEnum = pgEnum("audit_action", [
  "VIEW", "CREATE", "UPDATE", "DELETE", "EXPORT", "IMPORT", "LOGIN", "LOGOUT",
  "GRANT_CREDITS", "CHARGE_CREDITS", "CHANGE_PLAN", "SEND_MESSAGE",
  "ACCESS_PII", "DOWNLOAD_FILE", "UPLOAD_FILE", "GENERATE_AI",
]);

export const auditLogs = pgTable("audit_logs_v2", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id", { length: 36 }),
  userId: varchar("user_id", { length: 36 }),
  userEmail: text("user_email"),
  action: auditActionEnum("action").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }),
  description: text("description"),
  changes: jsonb("changes"),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_audit_logs_v2_org").on(table.orgId),
  index("idx_audit_logs_v2_user").on(table.userId),
  index("idx_audit_logs_v2_action").on(table.action),
  index("idx_audit_logs_v2_entity").on(table.entityType, table.entityId),
  index("idx_audit_logs_v2_created").on(table.createdAt),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Insert schemas for security tables
export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({ id: true, createdAt: true });
export const insertAnomalyAlertSchema = createInsertSchema(anomalyAlerts).omit({ id: true, createdAt: true });
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({ id: true, updatedAt: true });
export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({ id: true, createdAt: true });

// Types for security tables
export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type AnomalyAlert = typeof anomalyAlerts.$inferSelect;
export type InsertAnomalyAlert = z.infer<typeof insertAnomalyAlertSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;

export const consentLanguageEnum = pgEnum("consent_language", ["ko", "en", "ja", "zh"]);

export const patientConsents = pgTable("patient_consents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  patientPhone: text("patient_phone").notNull(),
  patientName: text("patient_name"),
  consentVersion: varchar("consent_version", { length: 20 }).default("1.0").notNull(),
  termsAgreed: boolean("terms_agreed").default(false).notNull(),
  privacyAgreed: boolean("privacy_agreed").default(false).notNull(),
  language: consentLanguageEnum("language").default("ko").notNull(),
  sessionId: text("session_id"),
  source: bookingSourceEnum("source"),
  ipAddress: varchar("ip_address", { length: 100 }),
  consentedAt: timestamp("consented_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_patient_consents_org_phone").on(table.orgId, table.patientPhone),
  index("idx_patient_consents_consented").on(table.consentedAt),
]);

export const insertPatientConsentSchema = createInsertSchema(patientConsents).omit({ id: true, consentedAt: true });
export type PatientConsent = typeof patientConsents.$inferSelect;
export type InsertPatientConsent = z.infer<typeof insertPatientConsentSchema>;

export const summaryStatusEnum = pgEnum("summary_status", ["GENERATED", "REVIEWED", "DISMISSED"]);

export const patientSummaryCards = pgTable("patient_summary_cards", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  doctorId: varchar("doctor_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).notNull(),
  changesSinceLastVisit: jsonb("changes_since_last_visit").default([]),
  pendingItems: jsonb("pending_items").default([]),
  nextVisitChecklist: jsonb("next_visit_checklist").default([]),
  summaryText: text("summary_text"),
  triageLevel: text("triage_level").default("ROUTINE"),
  dataHash: varchar("data_hash", { length: 64 }),
  status: summaryStatusEnum("status").default("GENERATED").notNull(),
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => [
  index("idx_summary_cards_org_doctor").on(table.orgId, table.doctorId),
  index("idx_summary_cards_patient").on(table.patientId),
  index("idx_summary_cards_generated").on(table.generatedAt),
]);

export const insertPatientSummaryCardSchema = createInsertSchema(patientSummaryCards).omit({ id: true, generatedAt: true, reviewedAt: true });
export type PatientSummaryCard = typeof patientSummaryCards.$inferSelect;
export type InsertPatientSummaryCard = z.infer<typeof insertPatientSummaryCardSchema>;

export const pushTokens = pgTable("push_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  orgId: varchar("org_id", { length: 36 }),
  token: text("token").notNull(),
  platform: varchar("platform", { length: 20 }).notNull().default("web"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_push_tokens_user").on(table.userId),
  index("idx_push_tokens_token").on(table.token),
]);

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({ id: true, createdAt: true, updatedAt: true });
export type PushToken = typeof pushTokens.$inferSelect;

// ──────────────────────────────────────────────────────────────────────────────
// 닥톡전문가 — 마케팅 자동화 (Feature 4)
// ──────────────────────────────────────────────────────────────────────────────

export const marketingPlatformEnum = pgEnum("marketing_platform", [
  "facebook", "instagram", "linkedin", "youtube", "naver_blog",
]);

export const marketingPostStatusEnum = pgEnum("marketing_post_status", [
  "draft", "pending", "posted", "failed", "scheduled",
]);

// 마케팅 채널 연결 (의사/조직 → 플랫폼 토큰)
export const expertMarketingChannels = pgTable("expert_marketing_channels", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  platform: marketingPlatformEnum("platform").notNull(),
  accessToken: text("access_token"),          // 암호화 저장
  refreshToken: text("refresh_token"),
  pageId: text("page_id"),                    // Facebook Page ID / Naver Blog ID 등
  channelName: text("channel_name"),          // 표시명
  isActive: boolean("is_active").default(true),
  tokenExpiresAt: timestamp("token_expires_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_marketing_channels_org").on(table.orgId),
]);

// 마케팅 포스팅 이력
export const expertMarketingPosts = pgTable("expert_marketing_posts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  channelId: integer("channel_id"),
  platform: marketingPlatformEnum("platform").notNull(),
  faqTitle: text("faq_title"),
  faqQuestion: text("faq_question"),
  faqAnswer: text("faq_answer"),
  transformedContent: jsonb("transformed_content"),   // 플랫폼별 변환 결과
  postId: text("post_id"),                            // 실제 포스팅 ID (외부)
  status: marketingPostStatusEnum("status").default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  postedAt: timestamp("posted_at"),
  errorMessage: text("error_message"),
  reach: integer("reach").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_marketing_posts_org").on(table.orgId),
  index("idx_marketing_posts_status").on(table.status),
]);

export const insertExpertMarketingChannelSchema = createInsertSchema(expertMarketingChannels).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpertMarketingPostSchema = createInsertSchema(expertMarketingPosts).omit({ id: true, createdAt: true });
export type ExpertMarketingChannel = typeof expertMarketingChannels.$inferSelect;
export type ExpertMarketingPost = typeof expertMarketingPosts.$inferSelect;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;

// ====== System Settings (key-value store for persistent config) ======
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ====== 닥톡프로필 (Hospital Profile Management) ======
export const hospitalProfileData = pgTable("hospital_profile_data", {
  id: text("id").primaryKey().$defaultFn(() => `hp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`),
  orgId: text("org_id").notNull(),
  // Basic Info
  hospitalName: text("hospital_name").notNull(),
  businessNumber: text("business_number"),
  representativeName: text("representative_name"),
  address: text("address"),
  addressDetail: text("address_detail"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  fax: text("fax"),
  email: text("email"),
  website: text("website"),
  categories: jsonb("categories").$type<string[]>(), // ["소아과", "내과"]
  description: text("description"),
  photoUrls: jsonb("photo_urls").$type<string[]>(),
  // Platform IDs
  naverPlaceId: text("naver_place_id"),
  kakaoPlaceId: text("kakao_place_id"),
  googlePlaceId: text("google_place_id"),
  // Structured data as JSONB
  businessHours: jsonb("business_hours").$type<Record<string, {open: string, close: string, lunchStart?: string, lunchEnd?: string, isClosed?: boolean}>>(),
  holidays: jsonb("holidays").$type<Array<{date: string, reason: string, isRecurring?: boolean}>>(),
  // Platform sync status
  platformSyncStatus: jsonb("platform_sync_status").$type<Record<string, {connected: boolean, lastSynced?: string, status?: string}>>(),
  // Metadata
  status: text("status").default("draft"), // draft, active, suspended
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"),
}, (table) => [
  index("idx_hospital_profile_org").on(table.orgId),
]);

export const hospitalDoctorProfiles = pgTable("hospital_doctor_profiles", {
  id: text("id").primaryKey().$defaultFn(() => `hd_${Date.now()}_${Math.random().toString(36).slice(2,8)}`),
  orgId: text("org_id").notNull(),
  hospitalProfileId: text("hospital_profile_id").notNull(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  bio: text("bio"),
  qualifications: jsonb("qualifications").$type<string[]>(),
  photoUrl: text("photo_url"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_hospital_doctor_profiles_org").on(table.orgId),
  index("idx_hospital_doctor_profiles_hospital").on(table.hospitalProfileId),
]);

export const hospitalTreatments = pgTable("hospital_treatments", {
  id: text("id").primaryKey().$defaultFn(() => `ht_${Date.now()}_${Math.random().toString(36).slice(2,8)}`),
  orgId: text("org_id").notNull(),
  hospitalProfileId: text("hospital_profile_id").notNull(),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  price: integer("price"),
  priceNote: text("price_note"),
  duration: text("duration"),
  isPopular: boolean("is_popular").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_hospital_treatments_org").on(table.orgId),
  index("idx_hospital_treatments_hospital").on(table.hospitalProfileId),
]);

export const hospitalDiscounts = pgTable("hospital_discounts", {
  id: text("id").primaryKey().$defaultFn(() => `hdc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`),
  orgId: text("org_id").notNull(),
  hospitalProfileId: text("hospital_profile_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  discountType: text("discount_type"), // "percent", "fixed", "event"
  discountValue: integer("discount_value"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  targetTreatmentId: text("target_treatment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_hospital_discounts_org").on(table.orgId),
  index("idx_hospital_discounts_hospital").on(table.hospitalProfileId),
]);

export const insertHospitalProfileDataSchema = createInsertSchema(hospitalProfileData).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHospitalDoctorProfileSchema = createInsertSchema(hospitalDoctorProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHospitalTreatmentSchema = createInsertSchema(hospitalTreatments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHospitalDiscountSchema = createInsertSchema(hospitalDiscounts).omit({ id: true, createdAt: true, updatedAt: true });
export type HospitalProfileData = typeof hospitalProfileData.$inferSelect;
export type HospitalDoctorProfile = typeof hospitalDoctorProfiles.$inferSelect;
export type HospitalTreatment = typeof hospitalTreatments.$inferSelect;
export type HospitalDiscount = typeof hospitalDiscounts.$inferSelect;

// ═══════════════════════════════════════════════════════════════
// Embed Auth Tokens — iframe cross-origin cookie 차단 대응
// SSO exchange-token 성공 시 발급, Authorization: Bearer 헤더로 인증
// ═══════════════════════════════════════════════════════════════
export const embedAuthTokens = pgTable("embed_auth_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull(),
  orgId: text("org_id").notNull(),
  doctorId: text("doctor_id"),
  partnerId: text("partner_id"),
  userEmail: text("user_email"),
  userName: text("user_name"),
  enabledTabs: jsonb("enabled_tabs"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_embed_auth_tokens_token").on(table.token),
  index("idx_embed_auth_tokens_expires").on(table.expiresAt),
]);

export type EmbedAuthToken = typeof embedAuthTokens.$inferSelect;
