import "server-only";

import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { getDatabaseConnectionString } from "@/lib/prisma";
import { MIGRATIONS } from "@/lib/migrations-manifest.generated";

/**
 * Admin panelinden veritabanı migration'larını uygulamak için Prisma uyumlu çalıştırıcı.
 * `prisma migrate deploy` ile aynı `_prisma_migrations` tablosunu ve checksum biçimini kullanır;
 * böylece daha sonra CLI ile de sorunsuz devam edilebilir.
 */

// Prisma CLI'nin kullandığı kilit anahtarı: aynı anda iki migration işlemi çalışmasın
const PRISMA_ADVISORY_LOCK = 72707369;
const BASELINE_MIGRATION = MIGRATIONS[0]?.name;

export type MigrationState = "applied" | "pending" | "failed";

export interface MigrationStatusRow {
  name: string;
  state: MigrationState;
  appliedAt: string | null;
  /** Uygulandıktan sonra dosya değişmiş (bilgi amaçlı; idempotent migration'larda sorun değil) */
  modified: boolean;
  error: string | null;
}

export interface MigrationStatus {
  rows: MigrationStatusRow[];
  pendingCount: number;
  /** Tablolar var ama migration geçmişi yok: veritabanı `db push` ile kurulmuş */
  needsBaseline: boolean;
  /** Veritabanında olup bu sürümde bulunmayan migration'lar */
  unknownApplied: string[];
}

export interface MigrationRunResult {
  name: string;
  outcome: "baselined" | "applied" | "failed" | "skipped";
  durationMs: number;
  error?: string;
}

type DbRow = {
  migration_name: string;
  checksum: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
  logs: string | null;
};

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: getDatabaseConnectionString() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function readState(client: Client) {
  const { rows: [exists] } = await client.query<{ migrations: string | null; article: string | null }>(
    `SELECT to_regclass('public._prisma_migrations')::text AS migrations, to_regclass('public."Article"')::text AS article`,
  );
  const rows = exists.migrations
    ? (await client.query<DbRow>(
        `SELECT migration_name, checksum, finished_at, rolled_back_at, logs FROM "_prisma_migrations" ORDER BY started_at`,
      )).rows
    : [];
  return { hasTable: !!exists.migrations, hasSchema: !!exists.article, rows };
}

function summarize(state: Awaited<ReturnType<typeof readState>>): MigrationStatus {
  const active = state.rows.filter((r) => !r.rolled_back_at);
  const rows: MigrationStatusRow[] = MIGRATIONS.map((m) => {
    const records = active.filter((r) => r.migration_name === m.name);
    const done = records.find((r) => r.finished_at);
    if (done) {
      return { name: m.name, state: "applied", appliedAt: done.finished_at!.toISOString(), modified: done.checksum !== m.checksum, error: null };
    }
    const failed = records.find((r) => !r.finished_at);
    return { name: m.name, state: failed ? "failed" : "pending", appliedAt: null, modified: false, error: failed?.logs ?? null };
  });
  const known = new Set(MIGRATIONS.map((m) => m.name));
  return {
    rows,
    pendingCount: rows.filter((r) => r.state !== "applied").length,
    needsBaseline: state.hasSchema && !active.some((r) => r.finished_at),
    unknownApplied: [...new Set(active.filter((r) => r.finished_at && !known.has(r.migration_name)).map((r) => r.migration_name))],
  };
}

export async function getMigrationStatus(): Promise<MigrationStatus> {
  return withClient(async (client) => summarize(await readState(client)));
}

/**
 * Bekleyen migration'ları sırayla uygular. Hata olursa durur ve hatayı kaydeder.
 * Tablolar mevcut ama geçmiş boşsa (db push), ilk migration "uygulanmış" olarak işaretlenir (baseline).
 */
export async function applyPendingMigrations(): Promise<{ results: MigrationRunResult[]; status: MigrationStatus }> {
  return withClient(async (client) => {
    await client.query("SELECT pg_advisory_lock($1)", [PRISMA_ADVISORY_LOCK]);
    const results: MigrationRunResult[] = [];
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
          "id"                  VARCHAR(36) PRIMARY KEY NOT NULL,
          "checksum"            VARCHAR(64) NOT NULL,
          "finished_at"         TIMESTAMPTZ,
          "migration_name"      VARCHAR(255) NOT NULL,
          "logs"                TEXT,
          "rolled_back_at"      TIMESTAMPTZ,
          "started_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
          "applied_steps_count" INTEGER NOT NULL DEFAULT 0
        )`);

      let status = summarize(await readState(client));

      for (const migration of MIGRATIONS) {
        const row = status.rows.find((r) => r.name === migration.name);
        if (!row || row.state === "applied") continue;
        const started = Date.now();

        // Önceki başarısız denemeyi geri alınmış say (Prisma'nın `migrate resolve --rolled-back` karşılığı)
        if (row.state === "failed") {
          await client.query(
            `UPDATE "_prisma_migrations" SET rolled_back_at = now() WHERE migration_name = $1 AND finished_at IS NULL AND rolled_back_at IS NULL`,
            [migration.name],
          );
        }

        if (status.needsBaseline && migration.name === BASELINE_MIGRATION) {
          await client.query(
            `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, logs, started_at, finished_at, applied_steps_count)
             VALUES ($1, $2, $3, $4, now(), now(), 0)`,
            [randomUUID(), migration.checksum, migration.name, "Admin panelinden baseline olarak işaretlendi (tablolar zaten mevcuttu)."],
          );
          results.push({ name: migration.name, outcome: "baselined", durationMs: Date.now() - started });
          status = { ...status, needsBaseline: false };
          continue;
        }

        const id = randomUUID();
        await client.query(
          `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, applied_steps_count) VALUES ($1, $2, $3, now(), 0)`,
          [id, migration.checksum, migration.name],
        );
        try {
          // Çok ifadeli SQL için basit sorgu protokolü (parametresiz) kullanılır
          await client.query(migration.sql);
          await client.query(
            `UPDATE "_prisma_migrations" SET finished_at = now(), applied_steps_count = 1 WHERE id = $1`,
            [id],
          );
          results.push({ name: migration.name, outcome: "applied", durationMs: Date.now() - started });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await client.query(`UPDATE "_prisma_migrations" SET logs = $2 WHERE id = $1`, [id, message]).catch(() => undefined);
          results.push({ name: migration.name, outcome: "failed", durationMs: Date.now() - started, error: message });
          // Sonraki migration'lar buna bağlı olabilir: dur
          const idx = MIGRATIONS.indexOf(migration);
          for (const rest of MIGRATIONS.slice(idx + 1)) {
            if (status.rows.find((r) => r.name === rest.name)?.state !== "applied") {
              results.push({ name: rest.name, outcome: "skipped", durationMs: 0 });
            }
          }
          break;
        }
      }

      return { results, status: summarize(await readState(client)) };
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [PRISMA_ADVISORY_LOCK]).catch(() => undefined);
    }
  });
}
