import assert from "node:assert/strict";
import test from "node:test";
import { findOrCreate } from "../lib/server/ensure-row";

test("findOrCreate: satır varsa oluşturmaz", async () => {
  let created = 0;
  const row = await findOrCreate(async () => ({ id: "global" }), async () => { created++; return { id: "new" }; });
  assert.deepEqual(row, { id: "global" });
  assert.equal(created, 0);
});

test("findOrCreate: paralel istek satırı önce oluşturduysa (P2002) yeniden okur", async () => {
  let reads = 0;
  const row = await findOrCreate(
    async () => (reads++ === 0 ? null : { id: "global" }),
    async () => { throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" }); },
  );
  assert.deepEqual(row, { id: "global" });
  assert.equal(reads, 2);
});

test("findOrCreate: başka hatalar yutulmaz", async () => {
  await assert.rejects(
    findOrCreate(async () => null, async () => { throw Object.assign(new Error("bağlantı yok"), { code: "P1001" }); }),
    /bağlantı yok/,
  );
});
