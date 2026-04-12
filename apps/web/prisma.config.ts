import * as dotenv from "dotenv";
dotenv.config();

// Prisma 7 adaptörünün çökmesini (undefined hatası) engellemek için doğrudan güvenli atama.
// Postgres'e geçiş için varsayılan SQLite URL'sini kaldırıyoruz.
// Vercel ortamında DATABASE_URL otomatik olarak sağlanacaktır.
// NOT: env() fonksiyonu değişken yoksa hata fırlattığı için process.env kullanıyoruz.

import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/habernexus",
  },
});
