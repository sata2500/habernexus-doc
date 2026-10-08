/**
 * Uçtan uca testler için veri: okur, yazar ve yönetici hesapları (e-postası doğrulanmış),
 * en az bir kategori ve yayında bir haber. Tekrar çalıştırılabilir (varsa dokunmaz).
 *
 *   NODE_OPTIONS=--conditions=react-server npx tsx e2e/seed.ts
 */
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { E2E_PASSWORD, E2E_SPONSOR_ID, E2E_USERS } from "./accounts";

async function ensureUser(email: string, name: string, role: "USER" | "AUTHOR" | "ADMIN") {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!existing) {
    // Şifre uygulamanın kendi karmasıyla oluşsun diye kayıt API'si kullanılır
    await auth.api.signUpEmail({ body: { email, password: E2E_PASSWORD, name } });
  }
  return prisma.user.update({ where: { email }, data: { emailVerified: true, role }, select: { id: true } });
}

async function main() {
  const users = {
    reader: await ensureUser(E2E_USERS.reader, "E2E Okur", "USER"),
    author: await ensureUser(E2E_USERS.author, "E2E Yazar", "AUTHOR"),
    admin: await ensureUser(E2E_USERS.admin, "E2E Yönetici", "ADMIN"),
  };

  const category = await prisma.category.upsert({
    where: { slug: "e2e-gundem" },
    update: {},
    create: { name: "E2E Gündem", slug: "e2e-gundem", color: "#ef4444", icon: "Newspaper", order: 99 },
  });

  await prisma.article.upsert({
    where: { slug: "e2e-deneme-haberi" },
    update: { status: "PUBLISHED" },
    create: {
      title: "E2E deneme haberi: otomatik testler için örnek içerik",
      slug: "e2e-deneme-haberi",
      excerpt: "Uçtan uca testlerin kullandığı örnek haber.",
      content: "<p>Bu haber otomatik testler için oluşturuldu. Okuma, kaydetme ve yorum akışları bu haber üzerinde sınanır.</p><h2>Ara başlık</h2><p>İkinci paragraf, yeterli uzunlukta metin içerir ki okuma süresi ve özet hesaplansın.</p>",
      status: "PUBLISHED",
      publishedAt: new Date(),
      authorId: users.author.id,
      categoryId: category.id,
    },
  });

  // Okuma takibi testleri için uzun haber (birkaç ekran boyu)
  const longBody = Array.from({ length: 40 }, (_, i) =>
    `<p>${i + 1}. paragraf: uzun haber metni okuma ilerlemesini, kaldığın yerden devam etmeyi ve okundu işaretini sınamak için yazıldı. Her paragraf birkaç satır sürer ki sayfa yeterince uzun olsun.</p>`).join("");
  await prisma.article.upsert({
    where: { slug: "e2e-uzun-haber" },
    update: { status: "PUBLISHED", content: longBody },
    create: {
      title: "E2E uzun haber: okuma takibi denemesi",
      slug: "e2e-uzun-haber",
      excerpt: "Okuma ilerlemesi testlerinde kullanılan uzun haber.",
      content: longBody,
      status: "PUBLISHED",
      publishedAt: new Date(Date.now() - 3600_000),
      authorId: users.author.id,
      categoryId: category.id,
    },
  });

  // Reklam sistemi: haber metninin sonunda yalnızca sponsor reklamı (Google betikleri kapalı)
  await prisma.monetizationSettings.upsert({
    where: { id: "global" },
    update: { placements: { article_content: { mode: "sponsor" } } },
    create: { id: "global", placements: { article_content: { mode: "sponsor" } } },
  });
  await prisma.sponsorAd.upsert({
    where: { id: E2E_SPONSOR_ID },
    update: { isActive: true, endsAt: null },
    create: {
      id: E2E_SPONSOR_ID,
      name: "E2E sponsor",
      advertiser: "E2E Reklamveren",
      imageUrl: "/vercel.svg",
      linkUrl: "https://example.com/e2e-sponsor",
      altText: "E2E sponsor reklamı",
      placements: ["article_content"],
      startsAt: new Date(Date.now() - 60_000),
    },
  });

  console.log("E2E verisi hazır:", Object.keys(users).join(", "));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
