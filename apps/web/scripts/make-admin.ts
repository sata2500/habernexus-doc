import { PrismaClient } from "../lib/generated/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import path from "path";

// .env dosyasını yükle
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error("Hata: Lütfen bir e-posta adresi belirtin. Örn: npx tsx scripts/make-admin.ts email@example.com");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Hata: DATABASE_URL .env dosyasında bulunamadı.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });
    console.log(`Başarılı: ${user.email} kullanıcısı artık ADMIN rolüne sahip!`);
  } catch (error) {
    console.error("Hata: Kullanıcı bulunamadı veya bir sorun oluştu.");
    console.error(error);
  } finally {
    await pool.end();
  }
}

makeAdmin();
