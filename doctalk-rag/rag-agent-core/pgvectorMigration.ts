/**
 * pgvector Migration Service — TurboQuant-Inspired 3-Stage Optimization
 *
 * Stage 1: halfvec (float16) 저장 → 메모리 50% 절감
 * Stage 2: 512d (Matryoshka) → 메모리 추가 67% 절감
 * Stage 3: 2-tier search (256d coarse + 512d fine) → 대규모 시 3-5x 속도
 *
 * 컬럼 구조:
 * - embedding_vec vector(1536)        : 레거시 (기존 호환, 점진 제거 예정)
 * - embedding_v2 halfvec(512)         : Stage 1+2 — 정밀 검색용 (halfvec = float16)
 * - embedding_coarse halfvec(256)     : Stage 3 — 1차 후보 추출용
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { EMBEDDING_CONFIG } from "../ai/llm/embedding";

const BATCH_SIZE = 500;
const TABLES = ["rag_documents", "doctor_knowledge", "agent_learned_conversations"] as const;

export async function ensurePgvectorExtension(): Promise<void> {
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log("[pgvector] Extension enabled");
  } catch (error) {
    console.error("[pgvector] Failed to enable extension:", error);
  }
}

/**
 * Ensure all vector columns exist (legacy + v2 + coarse)
 */
export async function ensureVectorColumns(): Promise<void> {
  try {
    for (const table of TABLES) {
      // Legacy 1536d column (keep for backward compat)
      await db.execute(sql.raw(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS embedding_vec vector(1536)`
      ));
      // Stage 1+2: halfvec 512d — primary search column
      await db.execute(sql.raw(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS embedding_v2 halfvec(${EMBEDDING_CONFIG.FULL_DIM})`
      ));
      // Stage 3: halfvec 256d — coarse search column
      await db.execute(sql.raw(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS embedding_coarse halfvec(${EMBEDDING_CONFIG.COARSE_DIM})`
      ));
    }
    console.log("[pgvector] Vector columns ensured (legacy + v2 halfvec(512) + coarse halfvec(256))");
  } catch (error) {
    console.error("[pgvector] Failed to ensure vector columns:", error);
  }
}

/**
 * HNSW indexes for all 3 tiers
 * - Legacy: vector_cosine_ops (existing)
 * - V2: halfvec_cosine_ops on halfvec(512) — primary
 * - Coarse: halfvec_cosine_ops on halfvec(256) — fast candidate retrieval
 */
export async function ensureHnswIndexes(): Promise<void> {
  try {
    for (const table of TABLES) {
      const prefix = table === "agent_learned_conversations" ? "agent_learned" : table.replace("_", "_");

      // Legacy index (keep for transition period)
      await db.execute(sql.raw(
        `CREATE INDEX IF NOT EXISTS idx_${prefix}_embedding_vec ON ${table} USING hnsw (embedding_vec vector_cosine_ops) WITH (m = 16, ef_construction = 64)`
      ));

      // Stage 1+2: V2 halfvec HNSW — primary search index
      // halfvec_cosine_ops is the correct operator class for halfvec columns
      await db.execute(sql.raw(
        `CREATE INDEX IF NOT EXISTS idx_${prefix}_embedding_v2 ON ${table} USING hnsw (embedding_v2 halfvec_cosine_ops) WITH (m = 16, ef_construction = 100)`
      ));

      // Stage 3: Coarse halfvec HNSW — fast candidate retrieval
      // Higher m=24 for coarse to improve recall (fewer dimensions = faster anyway)
      await db.execute(sql.raw(
        `CREATE INDEX IF NOT EXISTS idx_${prefix}_embedding_coarse ON ${table} USING hnsw (embedding_coarse halfvec_cosine_ops) WITH (m = 24, ef_construction = 100)`
      ));
    }
    console.log("[pgvector] HNSW indexes ensured (legacy + v2 + coarse)");
  } catch (error) {
    console.error("[pgvector] Failed to ensure HNSW indexes:", error);
  }
}

/**
 * Migrate legacy JSONB embedding → vector(1536) column
 */
export async function migrateJsonbToVector(tableName: string): Promise<number> {
  let migrated = 0;
  try {
    const countResult = await db.execute(sql.raw(`
      SELECT COUNT(*) as cnt FROM ${tableName}
      WHERE embedding IS NOT NULL
      AND embedding::text != '[]'
      AND embedding::text != 'null'
      AND embedding_vec IS NULL
    `));
    const total = parseInt(String((countResult as any).rows?.[0]?.cnt || '0'));

    if (total === 0) {
      console.log(`[pgvector] No records to migrate in ${tableName}`);
      return 0;
    }

    console.log(`[pgvector] Migrating ${total} records in ${tableName}...`);

    let offset = 0;
    while (offset < total) {
      await db.execute(sql.raw(`
        UPDATE ${tableName}
        SET embedding_vec = embedding::text::vector
        WHERE id IN (
          SELECT id FROM ${tableName}
          WHERE embedding IS NOT NULL
          AND embedding::text != '[]'
          AND embedding::text != 'null'
          AND embedding_vec IS NULL
          LIMIT ${BATCH_SIZE}
        )
      `));
      offset += BATCH_SIZE;
      migrated += Math.min(BATCH_SIZE, total - (offset - BATCH_SIZE));
      console.log(`[pgvector] ${tableName}: ${Math.min(offset, total)}/${total} migrated`);
    }
  } catch (error) {
    console.error(`[pgvector] Migration error for ${tableName}:`, error);
  }
  return migrated;
}

export async function migrateAllTables(): Promise<void> {
  console.log("[pgvector] Starting migration...");
  for (const table of TABLES) {
    await migrateJsonbToVector(table);
  }
  console.log("[pgvector] Migration complete");
}

export function embeddingToVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Get TurboQuant migration stats — 얼마나 v2/coarse로 전환되었는지
 */
export async function getTurboQuantStats(): Promise<{
  table: string;
  total: number;
  legacyOnly: number;
  v2Ready: number;
  coarseReady: number;
  fullyMigrated: number;
}[]> {
  const stats = [];
  for (const table of TABLES) {
    try {
      const result = await db.execute(sql.raw(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE embedding_vec IS NOT NULL AND embedding_v2 IS NULL) as legacy_only,
          COUNT(*) FILTER (WHERE embedding_v2 IS NOT NULL) as v2_ready,
          COUNT(*) FILTER (WHERE embedding_coarse IS NOT NULL) as coarse_ready,
          COUNT(*) FILTER (WHERE embedding_v2 IS NOT NULL AND embedding_coarse IS NOT NULL) as fully_migrated
        FROM ${table}
        WHERE (embedding_vec IS NOT NULL OR embedding_v2 IS NOT NULL)
      `));
      const row = (result as any).rows?.[0] || {};
      stats.push({
        table,
        total: parseInt(row.total || '0'),
        legacyOnly: parseInt(row.legacy_only || '0'),
        v2Ready: parseInt(row.v2_ready || '0'),
        coarseReady: parseInt(row.coarse_ready || '0'),
        fullyMigrated: parseInt(row.fully_migrated || '0'),
      });
    } catch (error) {
      console.error(`[TurboQuant] Stats error for ${table}:`, error);
      stats.push({ table, total: 0, legacyOnly: 0, v2Ready: 0, coarseReady: 0, fullyMigrated: 0 });
    }
  }
  return stats;
}

/**
 * Batch re-embed existing rows to v2 (512d) + coarse (256d)
 * Uses OpenAI dimensions parameter for efficient Matryoshka embeddings
 */
export async function batchReEmbedToV2(
  tableName: string,
  batchSize: number = 50
): Promise<{ updated: number; failed: number; remaining: number }> {
  // Validate table name against whitelist (prevent SQL injection via table name)
  if (!TABLES.includes(tableName as any)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const { embeddingRouter } = await import("../ai/llm/embedding");

  // Find rows that have legacy embedding but no v2
  const isDeletedFilter = tableName === 'agent_learned_conversations'
    ? '' : "AND (is_deleted = false OR is_deleted IS NULL)";
  const rows = await db.execute(sql.raw(
    `SELECT id, content FROM ${tableName}
     WHERE embedding_vec IS NOT NULL AND embedding_v2 IS NULL
     ${isDeletedFilter}
     LIMIT ${Number(batchSize)}`
  ));

  const rowData = (rows as any).rows || [];
  if (rowData.length === 0) {
    const remainResult = await db.execute(sql.raw(
      `SELECT COUNT(*) as cnt FROM ${tableName}
       WHERE embedding_vec IS NOT NULL AND embedding_v2 IS NULL`
    ));
    return { updated: 0, failed: 0, remaining: parseInt((remainResult as any).rows?.[0]?.cnt || '0') };
  }

  let updated = 0;
  let failed = 0;

  const CHUNK = 20;
  for (let i = 0; i < rowData.length; i += CHUNK) {
    const chunk = rowData.slice(i, i + CHUNK);
    const texts = chunk.map((r: any) => ((r.content || r.question || '').slice(0, 8000)));

    try {
      // Generate dual embeddings: 512d full + 256d coarse
      const { full: fullResults, coarse: coarseResults } = await embeddingRouter.embedDualBatch(texts);

      for (let j = 0; j < fullResults.length; j++) {
        const fullEmb = fullResults[j].embedding;
        const coarseEmb = coarseResults[j].embedding;

        if (fullEmb.length === EMBEDDING_CONFIG.FULL_DIM && coarseEmb.length === EMBEDDING_CONFIG.COARSE_DIM) {
          try {
            const fullVec = embeddingToVectorLiteral(fullEmb);
            const coarseVec = embeddingToVectorLiteral(coarseEmb);
            // Parameterized query — id from DB is safe but use parameterized pattern
            await db.execute(sql`
              UPDATE ${sql.raw(tableName)} SET
                embedding_v2 = ${fullVec}::halfvec,
                embedding_coarse = ${coarseVec}::halfvec
              WHERE id = ${chunk[j].id}
            `);
            updated++;
          } catch {
            failed++;
          }
        } else {
          failed++;
        }
      }
    } catch (err) {
      console.error(`[TurboQuant] Batch embed error for ${tableName}:`, err);
      failed += chunk.length;
    }
  }

  const remainResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as cnt FROM ${tableName}
    WHERE embedding_vec IS NOT NULL AND embedding_v2 IS NULL
  `));

  console.log(`[TurboQuant] ${tableName}: ${updated} updated, ${failed} failed`);
  return { updated, failed, remaining: parseInt((remainResult as any).rows?.[0]?.cnt || '0') };
}

export async function initPgvector(): Promise<void> {
  await ensurePgvectorExtension();
  await ensureVectorColumns();
  await ensureHnswIndexes();
  await migrateAllTables();

  // Log TurboQuant migration status
  const stats = await getTurboQuantStats();
  for (const s of stats) {
    if (s.total > 0) {
      const pct = s.total > 0 ? Math.round((s.fullyMigrated / s.total) * 100) : 0;
      console.log(`[TurboQuant] ${s.table}: ${s.fullyMigrated}/${s.total} migrated to v2+coarse (${pct}%), ${s.legacyOnly} legacy-only`);
    }
  }
}
