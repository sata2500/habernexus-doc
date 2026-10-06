import { PrismaClient } from "./generated/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Uygulamanın kullandığı PostgreSQL bağlantı adresi.
 * Derleme sırasında ya da DATABASE_URL eksikken çökmemek için varsayılan bir adres döner.
 */
export function getDatabaseConnectionString() {
  let url = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/dummy";
  // PG sürücüsünün SSL uyarısını gidermek için sslmode açıkça eklenir (Neon)
  if (url.includes("aws.neon.tech") && !url.includes("sslmode=")) {
    const joiner = url.includes("?") ? "&" : "?";
    url += `${joiner}sslmode=verify-full`;
  }
  return url;
}

const createPrismaClient = () => {
  // Sunucusuz ortamda her örnek kendi havuzunu açar: bağlantı sayısı küçük tutulur ve boşta
  // kalan bağlantılar kapatılır (veritabanının bağlantı sınırı aşılmasın).
  const pool = new Pool({
    connectionString: getDatabaseConnectionString(),
    max: Number(process.env.DATABASE_POOL_MAX) || 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({
    adapter: new PrismaPg(pool),
    // Sorgu günlüğü yalnızca istendiğinde (PRISMA_LOG_QUERIES=1); aksi halde geliştirme günlükleri boğuluyordu
    log: process.env.PRISMA_LOG_QUERIES === "1" ? ["query", "error", "warn"] : process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
