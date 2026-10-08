# HaberNexus — web uygulaması

Türkçe haber sitesi [habernexus.com](https://habernexus.com): herkese açık site, okur paneli, yazar masası,
yönetim paneli ve yapay zekâ destekli haber hattı. Vercel'de çalışır.

**Yığın:** Next.js 16 (App Router, sunucu işlemleri, `proxy.ts`) · React 19 · TypeScript · Tailwind CSS 4 ·
Prisma 7 (PostgreSQL, `pg` bağdaştırıcısı) · better-auth · Upstash QStash + Redis · Vercel Blob · Resend ·
Gemini / OpenRouter.

> Bu Next.js sürümü eğitim verilerindeki sürümlerden farklıdır; kod yazmadan önce
> `node_modules/next/dist/docs/` altındaki ilgili kılavuza bakın (bkz. `AGENTS.md`).

## Kurulum

Depo bir npm çalışma alanıdır; bağımlılıklar kök dizinden kurulur.

```bash
npm ci                         # kök dizinde
cd apps/web
# .env dosyasını aşağıdaki tabloya göre oluşturun
npm run db:deploy              # migration'ları uygular
npm run db:seed                # kategoriler ve örnek içerik (yalnızca boş veritabanında)
npm run dev                    # http://localhost:3000
```

İlk yönetici hesabı: siteye kayıt olun, sonra `npm run admin:make -- <e-posta>`.

### Ortam değişkenleri

Gerçek anahtarlar yalnızca Vercel proje ayarlarında tutulur; depoya ve sohbetlere yazılmaz.

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `DATABASE_URL` | evet | PostgreSQL bağlantısı (`DATABASE_POOL_MAX` ile havuz boyutu) |
| `BETTER_AUTH_SECRET` | evet | Oturum imzalama anahtarı (en az 32 karakter) |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | evet | Sitenin tam adresi (ör. `https://habernexus.com`) |
| `RESEND_API_KEY` | e-posta için | Doğrulama, şifre sıfırlama, bülten, destek |
| `RESEND_WEBHOOK_SECRET` | destek için | Gelen e-postaları destek talebine çeviren webhook'un imza anahtarı |
| `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | yapay zekâ için | En az biri; sağlayıcı/model seçimi yönetim panelinden |
| `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | önerilir | Arka plan işleri ve zamanlanmış görevler. Yoksa işler istek sonrasında (`after()`) çalışır |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | önerilir | Önbellek, hız sınırı, atomik kilitler. Yoksa bellek içi yedek (tek sunucu için) |
| `NEXT_PUBLIC_SENTRY_DSN` | önerilir | Sentry hata takibi (tarayıcı ve sunucu). Yoksa Sentry hiç başlamaz |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | isteğe bağlı | Derlemede kaynak haritalarını Sentry'ye yükler (hata satırları okunur olur) |
| `CRON_SECRET` | önerilir | Günlük kişisel veri temizliği (`/api/cron/cleanup`, `vercel.json`). Vercel bu anahtarı cron isteğine ekler; yoksa temizlik çalışmaz |
| `BLOB_READ_WRITE_TOKEN` | yükleme için | Görsel ve ses dosyaları (Vercel Blob) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | isteğe bağlı | Google ile giriş; yoksa düğme gizlenir |
| `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` | isteğe bağlı | Google Indexing API bildirimi |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID` | isteğe bağlı | Yeni haberleri Telegram kanalında paylaşma |

## Komutlar (`apps/web`)

| Komut | İşlev |
|---|---|
| `npm run dev` / `build` / `start` | Geliştirme sunucusu / üretim derlemesi / üretim sunucusu |
| `npm run typecheck`, `npm run lint` | Tip denetimi, ESLint |
| `npm test` | Birim testleri (Node test koşucusu + tsx) |
| `npm run test:e2e` | Uçtan uca testler (Playwright, aşağıya bakın) |
| `npm run db:migrate` | Yeni migration oluşturur (geliştirme) |
| `npm run db:deploy` / `db:status` | Migration'ları uygular / durumu gösterir |
| `npm run admin:make` | Bir hesabı yönetici yapar |

Derleme belleği: tip denetimi varsayılan Node yığınını aşabilir, gerekirse
`NODE_OPTIONS=--max-old-space-size=6144 npm run build`.

## Mimari

```
app/
  (main)/        herkese açık site: ana sayfa, haber, kategori, etiket, arama, statik sayfalar
  (auth)/        giriş, kayıt, doğrulama, şifre sıfırlama
  dashboard/     okur paneli (profil, kaydedilenler, geçmiş, yorumlar, tercihler)
  author/        yazar masası (editör, haberler, öneriler, istatistik)
  admin/         yönetim paneli (Karar Merkezi, yapay zekâ, içerik, kullanıcılar, destek, ayarlar)
  api/           cron uçları, QStash işçisi, webhook'lar, yükleme, seslendirme
  rss*, *sitemap RSS akışları ve site haritaları
lib/
  server/        yetki (authz), hız sınırı, kuyruk, uzak istek, HTML süzgeci, hesap silme
  ai/, news/     yapay zekâ sağlayıcı katmanı; haber kümeleme, puanlama, trend, yazım hattı
  cache.ts       Redis önbelleği + bellek içi yedek, atomik `claim()` kilidi
  theme.ts       site teması (renk paletleri → CSS değişkenleri)
components/      ortak arayüz (layout, article, ui, mail şablonları)
e2e/             Playwright testleri;  tests/  birim testleri
```

Kurallar:

- **Yetki her zaman sunucuda:** sunucu işlemleri `requireSession()`, `requireRole()` ya da yönetim için
  `adminOnly()` ile başlar; kullanıcı kimliği istemciden alınmaz. `tests/security.test.ts` bunu denetler.
- **İşlem sonuçları:** sunucu işlemleri `ActionResult` döndürür, hatalar `actionError()` ile kullanıcıya
  uygun Türkçe metne çevrilir (iç hata ayrıntısı sızdırılmaz).
- **Tarih/saat:** sunucu ve tarayıcı farklı saat diliminde olabilir; tarihleri `formatDate`/`formatDateTime`
  ya da `timeZone: SITE_TIME_ZONE` ile biçimlendirin (aksi hâlde hidrasyon hatası oluşur).
- **Önbellek:** sayfalar ISR ile önbelleğe alınır; içerik değişince ilgili yollar `revalidatePath` ile anında
  temizlenir.
- **Arka plan işleri:** uzun işler (yayın sonrası kalite kontrolü, haber yazımı) QStash kuyruğuna
  (`lib/server/queue.ts`) gönderilir; mükerrer çalışmayı `appCache.claim()` önler.

## Reklam ve analitik

Yönetim → Ayarlar → **Reklam ve Analitik** sekmesinden yönetilir; kod değişikliği gerekmez.

- **Google Analytics** (ölçüm kimliği), **Vercel Web Analytics** (aç/kapa), **Google AdSense** (yayıncı kimliği, `ads.txt`).
  Kapalı özelliğin betiği hiç yüklenmez.
- **Reklam alanları** (`lib/monetization.ts → PLACEMENTS`): her alan için Kapalı / Sponsor / AdSense / Otomatik.
  Sayfaya `<AdSlot placement="..." />` ile eklenir; reklam yoksa alan çizilmez. Yeni alan için `PLACEMENTS`'a ekleyin.
- **Sponsor reklamları**: görsel, bağlantı, tarih aralığı, alanlar ve ağırlık; gösterim/tıklama sayılır
  (`/api/ads`, `/api/ads/[id]/view|click`). Sayfalar önbellekte olsa da sponsorlar 1 dakikalık önbellekle sunulur.
- **Çerez onayı** (`lib/consent.ts`): kişiselleştirme her zaman, analitik ve reklam yalnızca ilgili özellik açıksa sorulur.
  Google Consent Mode v2 varsayılanları kök yerleşimde kurulur (`lib/google-consent.ts`); Analytics yalnızca onayla yüklenir,
  AdSense onay yoksa kişiselleştirilmemiş reklam gösterir.
- Analytics veya AdSense açılmadan önce Gizlilik ve Çerez Politikası metinleri güncellenmelidir.

## Testler

**Birim testleri** (`tests/`): saf fonksiyonlar, güvenlik denetimleri (yetki korumaları, süzgeç, yönlendirme
adresleri), tema, metin işleme. Veritabanı gerektirmez: `npm test`.

**Uçtan uca testler** (`e2e/`): üretim derlemesine karşı, telefon (Pixel 7) ve masaüstü görünümünde ana
sayfa, haber, arama, 404, güvenlik başlıkları, RSS, giriş, okur/yazar/yönetici akışları. Sayfa hatası
(hidrasyon dahil) testi başarısız sayar. Ayrı ve boş bir veritabanı kullanın:

```bash
export DATABASE_URL=postgresql://…/e2e   # test veritabanı
npx prisma migrate deploy
npx tsx prisma/seed.ts                   # yalnızca ilk kez
npm run e2e:seed                         # test hesapları ve örnek haber (tekrar çalıştırılabilir)
npm run build
npx playwright install chromium          # ilk kez
npm run test:e2e                         # sunucuyu kendisi başlatır
```

Çalışan bir sunucuya karşı: `E2E_BASE_URL=http://localhost:3000 npm run test:e2e`.
Test hesapları `e2e/accounts.ts` içindedir; canlı veritabanında **çalıştırmayın**.

CI (`.github/workflows/quality.yml`): her gönderimde tip, lint, birim testleri, derleme ve bağımlılık denetimi;
ayrı bir işte Postgres hizmetiyle uçtan uca testler (başarısız olursa rapor eser olarak yüklenir).

## Veritabanı (Prisma migration)

Şema değişiklikleri **her zaman migration ile** yapılmalıdır (`npm run db:migrate`).
`prisma db push` migration geçmişini atlar; sıfırdan kurulan bir veritabanında uygulamanın
çökmesine neden olur. Yönetim panelindeki "Sistem" sekmesi bekleyen migration'ları gösterir.

Canlı veritabanını migration geçmişiyle eşitlemek:

```bash
cd apps/web
DATABASE_URL="<canlı bağlantı>" npm run db:status   # durumu gösterir, değişiklik yapmaz
DATABASE_URL="<canlı bağlantı>" npm run db:deploy   # bekleyen migration'ları uygular
```

`db:deploy` **P3005** hatası verirse veritabanı daha önce `db push` ile kurulmuştur.
O durumda önce ilk migration'ı "uygulanmış" olarak işaretleyin, sonra tekrar deploy edin:

```bash
DATABASE_URL="<canlı bağlantı>" npm run db:baseline
DATABASE_URL="<canlı bağlantı>" npm run db:deploy
```

Sonraki migration'lar idempotenttir (`IF NOT EXISTS`); var olan tablo ve verilere dokunmaz.

## Yayına alma

`main` dalına gönderilen her commit Vercel'de otomatik yayına alınır. Saklama süresi dolan kişisel veriler (kapanmış destek talepleri 2 yıl, pasif bülten kayıtları 1 yıl,
doğrulanmamış hesaplar 30 gün; `lib/server/retention.ts`) her gece `vercel.json` içindeki cron ile silinir. Bülten, RSS tarama, analiz ve otomatik yazım QStash zamanlamalarıyla çalışır (yönetim → Ayarlar → Otomasyon). Kod incelemesi ve yenileme
geçmişi: [`docs/KOD-INCELEME-PLANI.md`](../../docs/KOD-INCELEME-PLANI.md).
