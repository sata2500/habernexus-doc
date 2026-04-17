import { PrismaClient } from "./generated/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Vercel build sürecinde veya DATABASE_URL eksikken çökmemek için 
// her zaman bir adapter ile başlatıyoruz.
let connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/dummy";

// PG driver SSL uyarılarını gidermek için sslmode parametresini açıkça ekle (Neon/Remote DB)
if (connectionString.includes("aws.neon.tech") && !connectionString.includes("sslmode=")) {
  const joiner = connectionString.includes("?") ? "&" : "?";
  connectionString += `${joiner}sslmode=verify-full`;
}

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
