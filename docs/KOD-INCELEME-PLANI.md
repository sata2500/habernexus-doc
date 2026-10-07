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

### Aşama 2 — Yapay zekâ ve haber hattı ✅
- [x] `lib/ai/*`, `lib/news/*`, AI Yazar, trend yazarı, analiz, intihal düzeltme, RSS tarayıcı, Google Trends, TTS, özet okundu
- [x] Zaman aşımları ve süre bütçesi: yayın sonrası kalite işi ayrı kuyruk işine taşındı; zaman aşımında yeniden deneme kaldırıldı; seslendirme parça başına 90 sn
- [x] Testler: karakter kodu çözme, trend puanı, seslendirme bölme (48 test). Kümeleme ve puanlama testleri zaten vardı
- [ ] Not: yapay zekâ ayarları her çağrıda birincil anahtarla tek satır okunuyor; çağrı saniyeler sürdüğü için önbelleğe alınmadı (model değişikliği anında geçerli olsun)

### Aşama 3 — Herkese açık site ✅
- [x] Ana sayfa, haber, kategori, etiket, son haberler, arama, statik sayfalar, yerleşim (menü, alt bilgi, slayt), yorumlar, tepkiler, paylaşım
- [x] Erişilebilirlik: içeriğe geç bağlantısı, tek h1, düğme/bağlantı etiketleri, klavye ile menü (Esc), odak yönetimi, `aria-current`/`aria-pressed`
- [x] Performans: ana sayfa JavaScript'i **1.699 KB → 725 KB** (framer-motion ve tüm lucide ikon kütüphanesi paketten çıktı); kategori/arama kartlarında haber gövdesi yüklenmiyor; aşağıdaki görsellere öncelik verilmiyor
- [x] CSP: dış kaynaklı betik ve üretimde `eval` kapalı; `object-src`, `base-uri`, `form-action`, `frame-src` kısıtlandı (nonce, ISR'yi bozacağı için kullanılmadı)

### Aşama 4 — Kimlik doğrulama ve okur paneli ✅
- [x] Giriş, kayıt, doğrulama, şifre sıfırlama ekranları (ortak kart, etiketli alanlar, şifre göster/gizle, Türkçe hata metinleri)
- [x] Profil, okuduklarım, kaydedilenler, yorumlar, tercihler; panel işlemleri `ActionResult` + `actionError` düzeninde
- [x] Yeni: oturum içinden şifre değiştirme (diğer oturumlar kapanır)

### Aşama 5 — Yazar masası ✅
- [x] Editör, haber listesi, istatistikler, öneriler, yorumlar, analiz ekranı okundu ve düzeltildi
- [x] Yeni: etiket alanı, eşzamanlı düzenleme koruması, Ctrl/Cmd+S ile kaydetme

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

### Aşama 2
| Tür | Bulgu | Durum |
|---|---|---|
| Hata | Yeni haberin analiz + kopya düzeltme (2 tur) + tam yeniden yazım döngüsü, yazımla **aynı 5 dakikalık işçide** çalışıyordu; süre aşılınca iş yarıda kesiliyordu | Kalite işi ayrı QStash işine taşındı (kendi süre sınırıyla); yerelde `after()` ile |
| Hata | Otomatik özgünleştirme kopya oranını düşürmese de (hatta artırsa da) yeni metin yayında kalıyordu | Oran düşmezse önceki metin ve puanlar geri yükleniyor ("Kopyaları gider" düğmesi dahil) |
| Hata | Tam yeniden yazım, Google'a ikinci kez bildirim gönderiyordu (günlük kota) | Yeni yayımlanan haberde ek bildirim yok |
| Hata | Yapay zekâ zaman aşımları 3 kez yeniden deneniyordu (3 × 120 sn > işçi sınırı) | Yalnızca kota/servis yoğunluğunda yeniden deneme |
| Hata | Analiz ve puanlama, aynı anda yazıma alınan ya da elenen bir konunun durumunu ezebiliyordu | Durum korumalı güncellemeler (yalnızca açık konular değişir) |
| Güvenlik | RSS başlık/özetlerindeki talimatlar analiz komutunu etkileyebiliyordu | Kaynak metinler veri olarak işaretlendi, içindeki talimatlar yok sayılıyor |
| Hata | Karar Merkezi aramasında "Yazım sırası" ve "Değerlendirme" sekmelerinde **arama kelimesi yok sayılıyordu** (iki `OR` koşulu birbirini eziyordu) | Koşullar `AND` ile birleştirildi |
| Hata | RSS kaynakları sırayla taranıyordu (yavaş kaynak tüm taramayı süre sınırına itiyordu); her haber için ayrı sorgu; eşzamanlı taramada tekil anahtar hatası tüm kaynağı "hatalı" yapıyordu | 5'li paralel tarama, toplu kontrol + `createMany(skipDuplicates)` |
| Güvenlik | RSS akışları özel ağ korumasız indiriliyordu; haber bağlantılarında `javascript:` gibi adresler kabul ediliyordu | Güvenli indirici (SSRF korumalı, 5 MB sınır); yalnızca http(s) |
| Hata | RSS'teki `&#351;` gibi karakter kodları ve windows-1254/iso-8859-9 akışlar bozuk Türkçe üretiyordu | Karakter kümesi algılama + kod çözme (analizdeki sayfa indirme de düzeldi) |
| Hata | Yayın tarihi olmayan RSS öğeleri hiç temizlenmiyordu | Eklenme tarihine göre temizleniyor |
| Hata | Google Trends puanı 500+ aramada tavana vuruyordu (500 ile 100.000 aynı puan) | Logaritmik ölçek |
| Hata | Seslendirmede çok uzun cümle kesilip kayboluyordu; zaman aşımı yoktu, parçalar sırayla üretiliyordu, aynı ses eşzamanlı iki kez üretilebiliyordu | Kelime sınırından bölme; 90 sn zaman aşımı, 2'li paralel üretim, eşzamanlı istek birleştirme; uç nokta 300 sn |
| Tutarlılık | Trend haberinde makale ve Karar Merkezi kaydı ayrı yazılıyordu; Telegram ve kalite analizi yapılmıyordu | Tek işlem; RSS haberleriyle aynı yayın sonrası akış |
| Tutarlılık | Otomatik yazım cron'u kuyruk mantığını kopyalıyordu; yazar olarak rastgele admin seçiliyordu | Ortak `dispatchStories`; ilk admin |

### Aşama 3
| Tür | Bulgu | Durum |
|---|---|---|
| Performans | Kategori ikonu bileşeni `import * as` ile **tüm lucide kütüphanesini** (1.500+ ikon) her sayfanın istemci paketine ekliyordu | Seçili ikon listesi; ana sayfa JS'i 1.699 KB → 725 KB (framer-motion kaldırılmasıyla birlikte) |
| Hata | 44 yerde kullanılan `animate-in`/`fade-in` sınıflarının paketi yüklü değildi (animasyonlar hiç çalışmıyordu) | `tw-animate-css` eklendi |
| Hata | Haber sayfasında yayın saati **UTC** gösteriliyordu (3 saat geri); yorum tarihleri de | Tüm tarihler Türkiye saatiyle |
| Hata | Her öne çıkan habere (günler önce yayımlanmış olsa bile) "Son Dakika" yazılıyordu; öne çıkan haber trend listesinde tekrar ediyordu | Yalnızca son 3 saat; tekrar kaldırıldı |
| Hata | İletişim sayfası, bilgi girilmemişse **uydurma telefon ve adres** gösteriyordu (tohum verisi de bunları yazıyordu); "Haritada Gör" düğmesi çalışmıyordu; reklam/kariyer e-postaları koda gömülüydü | Yalnızca admin panelinde girilen bilgiler; harita bağlantısı; kariyer e-postası admin'den |
| Güvenlik | Haber metni `class` niteliğiyle sitenin sınıflarını kullanıp sayfanın üstüne sahte katman çizebiliyordu | `class` süzülüyor; metindeki h1'ler h2'ye çevriliyor (sayfada tek h1) |
| Güvenlik | Giriş sonrası yönlendirme `/\site.com` biçimiyle başka siteye gönderilebiliyordu (açık yönlendirme) | Engellendi + test |
| Güvenlik | CSP her `https:` kaynağından betiğe ve üretimde `eval`'a izin veriyordu | Sıkılaştırıldı |
| Gizlilik | Çevrimdışı yedeği, kurulum anındaki ana sayfa kopyasını (oturum açmış kullanıcının kişisel içeriğiyle) her adres için gösteriyordu | Sade "bağlantı yok" sayfası |
| Hata | Yanıta verilen yanıtlar "Anonim" görünüyordu; yorum sayısı yanıtları saymıyordu; gönder düğmesi uzun yorumun üstüne biniyordu; yorum avatarı sabit "HB" idi; sil/yanıtla düğmeleri dokunmatikte görünmüyordu | İki düzeyli yorum ağacı, doğru sayı, düzen ve avatar düzeltildi |
| Hata | Arama sınırsız sonuç döndürüyor, her haberin tam metnini yüklüyordu; "istanbul" araması "İstanbul"u bulamayabiliyordu; sonuç sayfasında arama kutusu yoktu | En yeni 30 sonuç, Türkçe harf varyantları, sayfa içi arama kutusu |
| Hata | Slayt: sonsuz döngü için görseller 3 kez çiziliyordu, oklar dokunmatikte görünmüyor ve etiketsizdi, "azaltılmış hareket" tercihi yok sayılıyordu | Yerel kaydırma (scroll-snap) ile yeniden yazıldı |
| Erişilebilirlik | Menü/arama düğmelerinde durum bilgisi yoktu, mobil menü Esc ile kapanmıyor ve arka plan kayıyordu; bağlantı içinde düğme (geçersiz HTML); X paylaşımında "kapat" ikonu | Düzeltildi |
| Erişilebilirlik | iOS'ta e-posta ve arama kutularına dokununca sayfa yakınlaşıyordu (16 px altı yazı) | Mobilde 16 px |
| Hata | Kaydet düğmesi giriş yapmamış kullanıcıya `alert` gösterip haberi kaybettiriyordu | Girişten sonra aynı habere döner |

### Aşama 4
| Tür | Bulgu | Durum |
|---|---|---|
| Güvenlik | Giriş/kayıt/şifre sıfırlama hız sınırı bellekte tutuluyordu; Vercel'de istekler farklı örneklere düştüğü için **şifre deneme sınırı fiilen çalışmıyordu** | Sayaçlar Redis'te (better-auth `customStorage`); gerçek istemci IP'si Vercel başlığından |
| Hata | Profil kaydında hata (ör. geçersiz ad) olsa bile "başarıyla güncellendi" yazıyordu; fotoğraf kaldırılamıyordu | Hata gösteriliyor; fotoğraf silinebiliyor; sayfa sunucuda hazır geliyor (boş ekran yok) |
| Hata | Tercihlerde kayıt bulunamazsa bülten "açık" görünüyordu (açık onay kuralına aykırı) | Varsayılan kapalı |
| Eksik | Giriş yapmış kullanıcı şifresini değiştiremiyordu (yalnızca "şifremi unuttum") | Şifre değiştirme eklendi (Google hesaplarında açıklama) |
| Gizlilik | Hesap silinince aynı adresin misafir bülten kaydı kalıyordu | O da siliniyor |
| Hata | Kaydedilenlerde yayından kaldırılmış haberler de listeleniyor, her haberin tam metni yükleniyordu; listeden çıkarma yoktu | Yalnızca yayındakiler, ortak kart, listeden çıkarma düğmesi |
| Hata | Geçmiş temizleme işlemleri oturum yoksa yakalanmamış hata fırlatıyordu; yorum silinince haber sayfası güncellenmiyordu | Düzeltildi |
| Hata | Anahtarı tanımlı değilken de "Google ile giriş" düğmesi görünüyordu (tıklanınca hata) | Yalnızca yapılandırılmışsa |
| Hata | Giriş yapmış kullanıcı /login'de formu görüyordu; Google hatasında geri dönüş adresi kayboluyordu | Doğrudan hedef sayfaya |
| Güvenlik | Adres çubuğundaki `?error=` metni giriş ekranına olduğu gibi yazılıyordu (sahte uyarı gösterilebilirdi) | Yalnızca bilinen biçimdeki kodlar |
| Erişilebilirlik | Giriş/kayıt alanlarının etiketleri bağlı değildi, başlık h2'ydi; bülten anahtarının adı yoktu | Düzeltildi |
| Hata | Hesap silme tek tıkla onaylanıyor, silindikten sonra tarayıcı oturumu açık görünüyordu | "SİL" yazarak onay; tam yenileme |

### Aşama 5
| Tür | Bulgu | Durum |
|---|---|---|
| Hata | Aynı haber iki sekmede, yönetici tarafından ya da yapay zekâ özgünleştirmesi sırasında düzenlenirse son kaydeden **diğer değişiklikleri sessizce siliyordu** | Kayıtta sürüm denetimi; çakışmada uyarı ve "güncel hâlini aç" |
| Eksik | Yazarlar habere etiket ekleyemiyordu (yazar haberleri etiket sayfalarında hiç yer almıyordu; SEO panelinde etiket kontrolü gizliydi) | Etiket alanı (Enter/virgül), sunucuda eşitleme, SEO kontrolüne dahil |
| Hata | İki yazar aynı öneriye aynı anda "Haber yaz" derse ikisi de yazmaya başlıyordu; özet sayfasındaki "Yaz" bağlantısı konuyu hiç üstlenmiyordu (AI Yazar da yazabiliyordu) | Tek adımlık üstlenme; başkası üstlendiyse uyarı |
| Maliyet | Yapay zekâ ile yeniden yazımda kişi başı sınır yoktu | Saatte 10 |
| Güvenlik | Yapay zekâ işlemlerinde iç hata mesajları (veritabanı ayrıntıları dahil) kullanıcıya gösterilebiliyordu | Güvenli hata metinleri (`actionError`) |
| Tutarlılık | Yazar haberlerinin adresi rastgele ekli oluşuyordu (`baslik-x7k2`); AI haberleri kısa ve temiz adres alıyordu | Ortak `uniqueArticleSlug` |
| Hata | Yorum silinince haber sayfası güncellenmiyordu | Düzeltildi |
| Kullanılabilirlik | Ctrl+S tarayıcının "sayfayı kaydet" penceresini açıyordu | Haberi kaydeder |
| Erişilebilirlik | Mobil menü Esc ile kapanmıyor, gizliyken klavye odağı içine girebiliyordu; analiz penceresi Esc ile kapanmıyor, arka plan kayıyordu; liste düğmelerinin adı yalnızca "Sil"/"Düzenle" idi | Düzeltildi |
