// prisma/migrations klasöründeki SQL dosyalarını koda gömer.
// Admin panelindeki "Veritabanını güncelle" özelliği bu dosyayı kullanır;
// böylece sunucusuz ortamda dosya sistemine erişim gerekmez.
// Kullanım: node scripts/gen-migrations-manifest.mjs  (build ve prisma:generate öncesi otomatik çalışır)
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "prisma", "migrations");
const out = join(root, "lib", "migrations-manifest.generated.ts");

const migrations = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "migration.sql")))
  .map((d) => d.name)
  .sort()
  .map((name) => {
    const sql = readFileSync(join(dir, name, "migration.sql"), "utf8");
    return { name, checksum: createHash("sha256").update(sql).digest("hex"), sql };
  });

const body = `// BU DOSYA OTOMATİK ÜRETİLİR — elle düzenlemeyin. Kaynak: prisma/migrations
// Yeniden üretmek için: node scripts/gen-migrations-manifest.mjs

export interface MigrationManifestEntry {
  name: string;
  checksum: string;
  sql: string;
}

export const MIGRATIONS: MigrationManifestEntry[] = ${JSON.stringify(migrations, null, 2)};
`;

const previous = existsSync(out) ? readFileSync(out, "utf8") : "";
if (previous !== body) {
  writeFileSync(out, body);
  console.log(`migrations manifest: ${migrations.length} migration yazıldı`);
}
