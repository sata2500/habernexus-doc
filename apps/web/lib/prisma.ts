import { PrismaClient } from "./generated/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Uygulamanın kullandığı PostgreSQL bağlantı adresi.
 * Vercel build sürecinde veya DATABASE_URL eksikken çökmemek için varsayılan bir adres döner.
 */
export function getDatabaseConnectionString() {
  let url = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/dummy";
  // PG driver SSL uyarılarını gidermek için sslmode parametresini açıkça ekle (Neon/Remote DB)
  if (url.includes("aws.neon.tech") && !url.includes("sslmode=")) {
    const joiner = url.includes("?") ? "&" : "?";
    url += `${joiner}sslmode=verify-full`;
  }
  return url;
}

const connectionString = getDatabaseConnectionString();

const createPrismaClient = () => {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
