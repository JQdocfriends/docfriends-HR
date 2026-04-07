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
--
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
--
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
--
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
--
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
