import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { MIGRATIONS } from "../lib/migrations-manifest.generated";

const dir = join(__dirname, "..", "prisma", "migrations");

test("migration manifest matches prisma/migrations (run scripts/gen-migrations-manifest.mjs)", () => {
  const onDisk = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "migration.sql")))
    .map((d) => d.name)
    .sort();

  assert.deepEqual(MIGRATIONS.map((m) => m.name), onDisk);
  for (const m of MIGRATIONS) {
    const sql = readFileSync(join(dir, m.name, "migration.sql"), "utf8");
    assert.equal(m.checksum, createHash("sha256").update(sql).digest("hex"), `${m.name} checksum`);
  }
});

test("migrations after the initial one are idempotent", () => {
  for (const m of MIGRATIONS.slice(1)) {
    const risky = m.sql
      .split("\n")
      .filter((l) => /^\s*(CREATE (UNIQUE )?INDEX|CREATE TABLE|ALTER TABLE .* ADD COLUMN)\b/i.test(l))
      .filter((l) => !/IF NOT EXISTS/i.test(l));
    assert.deepEqual(risky, [], `${m.name} should use IF NOT EXISTS`);
  }
});
