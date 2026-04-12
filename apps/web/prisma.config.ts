import * as dotenv from "dotenv";
dotenv.config();

// Prisma 7 adaptörünün çökmesini (undefined hatası) engellemek için doğrudan güvenli atama.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL") || "file:./dev.db",
  },
});
