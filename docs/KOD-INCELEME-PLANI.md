# HaberNexus — Baştan Sona Kod İnceleme ve Yenileme Planı

Başlangıç: 6 Ekim 2026 · Kapsam: `apps/web` (244 dosya, ~27.000 satır)

## Çalışma yöntemi (her aşamada aynı)

1. Aşamanın kapsamındaki **her dosya satır satır okunur**; bulgular bu belgeye yazılır.
2. Bulgular üç sınıfa ayrılır: **Hata** (mantık/arayüz/güvenlik), **İyileştirme** (güncel kullanım, sadeleştirme, performans), **Karar** (ürün tercihi gerektirir → size sorulur).
3. Hatalar ve iyileştirmeler düzeltilir; gerekiyorsa dosya yeniden yazılır.
4. Doğrulama: tip denetimi, lint, birim testleri, üretim derlemesi, gerekli sayfaların telefon (390 px) ve masaüstü (1280 px) ekran görüntüsüyle kontrolü.
5. Aşama ayrı bir commit olarak yayına alınır, CI izlenir, size kısa rapor verilir.

## Başlangıç ölçümü

| Ölçüt | Durum |
|---|---|
| Tip hatası / lint hatası | 0 / 0 |
| `any`, uyarı bastırma | 9 yer (çoğu `<img>` kullanımı) |
| Hata ve 404 sayfaları | **Yok** (`error.tsx`, `global-error.tsx`, `not-found.tsx`) |
| Testler | 41 birim testi (yalnızca saf fonksiyonlar) |
| CI | Tip + lint + test + audit; **üretim derlemesi yok** |
| Kullanılmayan kod (knip) | 1 kullanılmayan dosya, 24 kullanılmayan dışa aktarım |
| Bağımlılıklar | Güncel; ana sürüm bekleyenler: TypeScript 7, ESLint 10, framer-motion 14, Prisma 8 (henüz RC) |
| `server-only` paketi | Kullanılıyor ama `package.json`'da tanımlı değil |

## Aşamalar

### Aşama 0 — Temel, araçlar ve güvenlik ağı ✅
- [x] Hata ekranları: bölüm `error.tsx`'leri (site, admin, yazar, panel; yeni `retry()` API'si), `global-error.tsx`, özel 404'ler (arama + son haberler)
- [x] CI'a üretim derlemesi eklendi (sahte anahtarla, 6 GB yığın)
- [x] `server-only` bağımlılığı tanımlandı; `@vercel/blob`, `svix` güncellendi
- [x] Ana sürüm değerlendirmesi: TypeScript 7 (typescript-eslint <6.1 destekliyor) ve ESLint 10 (react/jsx-a11y/import eklentileri desteklemiyor) **ertelendi**; framer-motion yükseltmek yerine Aşama 3'te CSS'e geçilip **kaldırılacak**
- [x] `tsconfig`: hedef ES2022, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `noImplicitOverride`. `noUncheckedIndexedAccess` denendi: 60 uyarının tamamı korunmuş/kesin değerli erişim çıktı, **açılmadı** (yalnızca gürültü ekler)
- [x] Kullanılmayan kod temizlendi (`use-debounce`, kullanılmayan Card/Skeleton parçaları, ölü fonksiyonlar); yönetici betiği `npm run admin:make` komutu oldu

### Aşama 1 — Veri katmanı ve sunucu altyapısı (`lib/`) ✅
- [x] Altyapı dosyalarının tamamı okundu (prisma, önbellek, veri, akış, öneriler, site ayarları, yetki, hız sınırı, QStash, uzak istek, içerik süzgeci, hesap silme, otomasyon, migration, medya, e-posta, sosyal paylaşım, yorum yapay zekâsı)
- [x] Yeniden doğrulama stratejisi: genel 60 sn kaldırıldı, sayfa başına süre (haber 1 sa, kategori 5 dk, statik 1 gün); değişiklikler zaten anında temizleniyor. `use cache` (Cache Components) geçişi büyük bir mimari değişiklik; mevcut ISR + anında temizleme yeterli olduğu için **şimdilik değerlendirme dışı**
- [x] `ActionResult` tipi ve `actionError()` yardımcısı eklendi — işlem dosyalarına uygulanması ilgili aşamalarda (4–6) yapılacak
- [x] Hız sınırı: Vercel IP başlıkları öncelikli; bellek içi (dağıtık olmayan) bülten sınırı Redis'e taşındı

### Aşama 2 — Yapay zekâ ve haber hattı
- [ ] `lib/ai/*`, `lib/news/*`, AI Yazar, trend yazarı, analiz, TTS, özet
- [ ] Zaman aşımları, maliyet sınırları, yeniden deneme, hata sınıflandırması
- [ ] Kritik akışlara test (kümeleme, puanlama, yazım kilidi)

### Aşama 3 — Herkese açık site
- [ ] Ana sayfa, haber, kategori, etiket, son haberler, arama, statik sayfalar
- [ ] Arayüz hataları, erişilebilirlik (klavye, ekran okuyucu, kontrast)
- [ ] Performans: istemci paket boyutu, görseller, yükleme durumları, Core Web Vitals
- [ ] İçerik güvenlik politikası (CSP) sıkılaştırması

### Aşama 4 — Kimlik doğrulama ve okur paneli
- [ ] Giriş, kayıt, doğrulama, şifre sıfırlama ekranları
- [ ] Profil, okuduklarım, kaydedilenler, yorumlar, tercihler

### Aşama 5 — Yazar masası
- [ ] Editör, haber listesi, istatistikler, öneriler, yorumlar, analiz ekranı

### Aşama 6 — Admin paneli
- [ ] Genel bakış, Karar Merkezi, yapay zekâ, içerik, topluluk, site ayarları
- [ ] Büyük bileşenlerin bölünmesi (ör. 890 satırlık site ayarları formu)

### Aşama 7 — Arka plan işleri, API ve e-posta
- [ ] Cron uç noktaları, QStash, webhooks, yükleme/medya API'leri
- [ ] E-posta şablonları ve gönderim

### Aşama 8 — Test, dokümantasyon ve kapanış
- [ ] Sunucu işlemleri için yetki testleri, kritik akışlar için uçtan uca (Playwright) duman testleri
- [ ] README ve geliştirici belgeleri
- [ ] Son ölçüm ve özet rapor

## Bulgular günlüğü

### Aşama 0
| Tür | Bulgu | Durum |
|---|---|---|
| Hata | Olmayan haber/kategori/etiket adresleri **200** dönüyordu (bölüm geneli `loading.tsx` yanıtı erken başlatıyordu; Google'a çelişkili `robots` etiketleri gidiyordu) | Düzeltildi: yükleniyor ekranı yalnızca ana sayfaya taşındı → 404 |
| Hata | Her sayfa yüklenirken ana sayfa iskeleti (slider) görünüyordu | Aynı düzeltmeyle giderildi |
| Hata | Resend webhook dosyası istemciyi modül yüklenirken oluşturuyordu; anahtar yoksa **tüm derleme çöküyordu** | İstemci ilk kullanımda oluşturuluyor |
| Hata | Slider sıralamasında sınır dışı taşıma, Karar Merkezi'nde boş hata mesajı | Düzeltildi |
| Güvenlik | Üretim bağımlılıklarında 6 açık (mysql2, deepmerge-ts, postcss-selector-parser — Prisma CLI ve Tailwind tipografi üzerinden) | `overrides` ile yamalı sürümler → **0 açık** |
| Bilgi | ESLint'in `braces` bağımlılığında yaması olmayan açık (yalnızca geliştirme aracı, kendi dosyalarımızı tarar) | İzleniyor |
| Not (Aşama 1) | `(main)/layout.tsx`'teki `revalidate = 60`, haber sayfalarının 1 saatlik ISR ayarını geçersiz kılıyor | Aşama 1'de ele alınacak |

### Aşama 1
| Tür | Bulgu | Durum |
|---|---|---|
| Performans | `getSiteSettings` **her sayfa isteğinde veritabanı işlemi (upsert)** açıyordu | Yalnızca okuma + 5 dk önbellek; kaydedilince temizleniyor |
| Performans | `(main)` yerleşimindeki `revalidate = 60` tüm sayfaları dakikada bir yeniden üretiyor, haber sayfalarının 1 saatlik ayarını eziyordu | Kaldırıldı; sayfa başına süreler |
| Performans | Veritabanı havuzu sınırsızdı (sunucusuz ortamda bağlantı tükenmesi riski); geliştirmede her sorgu günlüğe yazılıyordu | Havuz 5 bağlantı + boşta kapatma; sorgu günlüğü isteğe bağlı |
| Hata | İçerik süzgeci editörün **ayraç çizgisi (hr)** ve **üstü çizili (s)** biçimlerini siliyordu | İzin verilen etiketler genişletildi |
| Güvenlik | Süzgeç `id` niteliğine izin veriyordu (haber metni sayfa öğelerini gölgeleyebilirdi) | Kaldırıldı |
| Güvenlik | Yorum denetimi komutu, yorumdaki talimatlarla atlatılabiliyordu; özet tüm yorumları sınırsız gönderiyordu | Veri etiketleme + talimat yok sayma; son 80 yorum, kısaltılmış |
| Hata | Görsel optimizasyonu eski dosyayı veritabanı güncellenmeden siliyordu; slider görselleri güncellenmiyordu | Önce tek işlemde tüm kayıtlar, sonra dosya silme; önbellek temizliği |
| Hata | Admin özetinde "bugün" UTC'ye göreydi (3 saat kayık) | Türkiye saati |
| Hata | Telegram kaçış ifadesi hatalı (rakamları da kaçışlıyordu), zaman aşımı yoktu | Düzeltildi, 10 sn zaman aşımı |
| Tutarlılık | Okuma süresi 4 farklı yöntemle hesaplanıyordu (bazıları HTML etiketlerini kelime sayıyordu) | Tek `readingMinutes()` |
| Tutarlılık | Site adresi 14 yerde farklı varsayılanlarla tekrarlanıyordu | `getAppUrl()` |
| Test | `server-only` modülleri testlerde yüklenemiyordu | Testler `react-server` koşuluyla; içerik süzgeci ve okuma süresi testleri (45 test) |
