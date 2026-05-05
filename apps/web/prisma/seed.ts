import "dotenv/config";
import { prisma } from "../lib/prisma";

/* ============================================
   Haber Nexus — Türkçe Seed Data
   ============================================ */

async function main() {
  console.log("🌱 Seed başlatılıyor...\n");

  // --- Kategoriler ---
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Gündem",
        slug: "gundem",
        description: "Türkiye ve dünya gündemi",
        color: "#ef4444",
        icon: "Newspaper",
        order: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: "Dünya",
        slug: "dunya",
        description: "Uluslararası gelişmeler",
        color: "#3b82f6",
        icon: "Globe",
        order: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: "Ekonomi",
        slug: "ekonomi",
        description: "Ekonomi ve finans haberleri",
        color: "#f59e0b",
        icon: "TrendingUp",
        order: 3,
      },
    }),
    prisma.category.create({
      data: {
        name: "Teknoloji",
        slug: "teknoloji",
        description: "Teknoloji ve inovasyon",
        color: "#8b5cf6",
        icon: "Cpu",
        order: 4,
      },
    }),
    prisma.category.create({
      data: {
        name: "Spor",
        slug: "spor",
        description: "Spor haberleri ve analizler",
        color: "#10b981",
        icon: "Trophy",
        order: 5,
      },
    }),
    prisma.category.create({
      data: {
        name: "Sağlık",
        slug: "saglik",
        description: "Sağlık ve yaşam haberleri",
        color: "#ec4899",
        icon: "Heart",
        order: 6,
      },
    }),
    prisma.category.create({
      data: {
        name: "Kültür & Sanat",
        slug: "kultur-sanat",
        description: "Kültür, sanat ve eğlence",
        color: "#6366f1",
        icon: "Clapperboard",
        order: 7,
      },
    }),
    prisma.category.create({
      data: {
        name: "Bilim",
        slug: "bilim",
        description: "Bilim ve keşifler",
        color: "#14b8a6",
        icon: "FlaskConical",
        order: 8,
      },
    }),
  ]);

  console.log(`✅ ${categories.length} kategori oluşturuldu`);

  // --- Etiketler ---
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: "Son Dakika", slug: "son-dakika" } }),
    prisma.tag.create({ data: { name: "Analiz", slug: "analiz" } }),
    prisma.tag.create({ data: { name: "Yapay Zeka", slug: "yapay-zeka" } }),
    prisma.tag.create({ data: { name: "Seçim", slug: "secim" } }),
    prisma.tag.create({ data: { name: "Ekonomi", slug: "ekonomi" } }),
    prisma.tag.create({ data: { name: "Sürdürülebilirlik", slug: "surdurulebilirlik" } }),
    prisma.tag.create({ data: { name: "Startup", slug: "startup" } }),
    prisma.tag.create({ data: { name: "Eğitim", slug: "egitim" } }),
    prisma.tag.create({ data: { name: "Uzay", slug: "uzay" } }),
    prisma.tag.create({ data: { name: "Kripto", slug: "kripto" } }),
    prisma.tag.create({ data: { name: "Futbol", slug: "futbol" } }),
    prisma.tag.create({ data: { name: "Sağlık", slug: "saglik" } }),
  ]);

  console.log(`✅ ${tags.length} etiket oluşturuldu`);

  // --- Kullanıcılar ---
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@habernexus.com",
      emailVerified: true,
      role: "ADMIN",
      bio: "Haber Nexus platform yöneticisi",
      accounts: {
        create: {
          accountId: "admin-local",
          providerId: "credential",
          password: "$2a$12$LQv3c1yqBo9SkvXS7QTJPOoFd33KR4Y3.bVPuEROL1B0p3n3DKbWi", // "password123"
        },
      },
    },
  });

  const authors = await Promise.all([
    prisma.user.create({
      data: {
        name: "Elif Yılmaz",
        email: "elif@habernexus.com",
        emailVerified: true,
        role: "AUTHOR",
        bio: "Teknoloji editörü. Yapay zeka, blockchain ve dijital dönüşüm konularına odaklanıyor.",
        accounts: {
          create: {
            accountId: "elif-local",
            providerId: "credential",
            password: "$2a$12$LQv3c1yqBo9SkvXS7QTJPOoFd33KR4Y3.bVPuEROL1B0p3n3DKbWi",
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Ahmet Kaya",
        email: "ahmet@habernexus.com",
        emailVerified: true,
        role: "AUTHOR",
        bio: "Ekonomi muhabiri. Merkez bankası politikaları ve makroekonomi uzmanı.",
        accounts: {
          create: {
            accountId: "ahmet-local",
            providerId: "credential",
            password: "$2a$12$LQv3c1yqBo9SkvXS7QTJPOoFd33KR4Y3.bVPuEROL1B0p3n3DKbWi",
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Zeynep Acar",
        email: "zeynep@habernexus.com",
        emailVerified: true,
        role: "AUTHOR",
        bio: "Uluslararası ilişkiler ve diplomasi muhabiri.",
        accounts: {
          create: {
            accountId: "zeynep-local",
            providerId: "credential",
            password: "$2a$12$LQv3c1yqBo9SkvXS7QTJPOoFd33KR4Y3.bVPuEROL1B0p3n3DKbWi",
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Mehmet Demir",
        email: "mehmet@habernexus.com",
        emailVerified: true,
        role: "AUTHOR",
        bio: "Spor editörü. Futbol, basketbol ve e-spor takipçisi.",
        accounts: {
          create: {
            accountId: "mehmet-local",
            providerId: "credential",
            password: "$2a$12$LQv3c1yqBo9SkvXS7QTJPOoFd33KR4Y3.bVPuEROL1B0p3n3DKbWi",
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Dr. Ayşe Kılıç",
        email: "ayse@habernexus.com",
        emailVerified: true,
        role: "AUTHOR",
        bio: "Sağlık editörü. Tıp doktoru, bilim iletişimcisi.",
        accounts: {
          create: {
            accountId: "ayse-local",
            providerId: "credential",
            password: "$2a$12$LQv3c1yqBo9SkvXS7QTJPOoFd33KR4Y3.bVPuEROL1B0p3n3DKbWi",
          },
        },
      },
    }),
  ]);

  const regularUser = await prisma.user.create({
    data: {
      name: "Test Kullanıcı",
      email: "user@habernexus.com",
      emailVerified: true,
      role: "USER",
      accounts: {
        create: {
          accountId: "user-local",
          providerId: "credential",
          password: "$2a$12$LQv3c1yqBo9SkvXS7QTJPOoFd33KR4Y3.bVPuEROL1B0p3n3DKbWi",
        },
      },
    },
  });

  console.log(`✅ ${authors.length + 2} kullanıcı oluşturuldu (1 admin, ${authors.length} yazar, 1 kullanıcı)`);

  // --- Makaleler ---
  const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
  const tagMap = Object.fromEntries(tags.map((t) => [t.slug, t.id]));

  const articleData = [
    {
      title: "Yapay Zeka Çağında Gazetecilik: Medyanın Geleceği Nasıl Şekillenecek?",
      slug: "yapay-zeka-caginda-gazetecilik",
      excerpt: "Yapay zeka teknolojilerinin haber üretim süreçlerini kökten değiştirdiği bu dönemde, gazeteciliğin geleceği ve insan-makine işbirliğinin yeni boyutları tartışılıyor.",
      content: `Yapay zeka teknolojileri, gazetecilik dünyasını köklü bir dönüşüme zorluyor. Haber odasında otomasyon, veri gazeteciliği ve yapay zeka destekli içerik üretimi gibi konular artık gündemin merkezinde yer alıyor.

## Yapay Zekanın Gazetecilikteki Kullanım Alanları

Günümüzde yapay zeka, haber toplama sürecinden dağıtıma kadar gazeteciliğin her aşamasında aktif rol oynuyor:

- **Otomatik haber yazımı**: Finansal raporlar, spor sonuçları ve seçim verileri gibi yapılandırılmış verilerden haber üretimi
- **Veri madenciliği**: Büyük veri setlerinden haber değeri olan bilgilerin çıkarılması
- **Kişiselleştirme**: Okuyucu tercihlerine göre haber akışının özelleştirilmesi
- **Doğrulama**: Sahte haber ve dezenformasyon tespiti

## İnsan-Makine İşbirliği

Uzmanlar, yapay zekanın gazetecilerin yerini almayacağını, aksine onların işini kolaylaştıracağını vurguluyor. Araştırmacı gazetecilik, analiz ve yorum gibi alanlarda insan yaratıcılığı hâlâ vazgeçilmez konumda.

Bu dönüşüm sürecinde en kritik faktör, gazetecilik etiğinin ve editoryal bağımsızlığın korunması olacak.`,
      authorId: authors[0].id,
      categoryId: catMap["teknoloji"],
      tags: ["yapay-zeka", "analiz"],
      viewCount: 15420,
      daysAgo: 0,
    },
    {
      title: "Merkez Bankası Faiz Kararını Açıkladı: Piyasalarda Son Durum",
      slug: "merkez-bankasi-faiz-karari",
      excerpt: "Merkez Bankası, beklentilerin aksine faiz oranlarını sabit tutma kararı aldı. Karar sonrası döviz kurları ve borsa endekslerinde hareketlilik yaşandı.",
      content: `Türkiye Cumhuriyet Merkez Bankası (TCMB), bugün gerçekleştirdiği Para Politikası Kurulu (PPK) toplantısında faiz oranlarını sabit tutma kararı aldı.

## Kararın Detayları

PPK, politika faizini yüzde 45 seviyesinde sabit bıraktı. Karar, piyasa beklentileriyle büyük ölçüde örtüştü.

## Piyasa Tepkileri

- **Dolar/TL**: Karar sonrası dolar kuru dar bir bantta hareket etti
- **Borsa**: BIST 100 endeksi gün sonunda %0.8 artışla kapandı
- **Tahvil**: 10 yıllık tahvil faizleri 20 baz puan düştü

## Analist Yorumları

Ekonomistler, Merkez Bankası'nın sıkı para politikası duruşunu sürdürmesinin enflasyonla mücadele açısından olumlu olduğunu belirtiyor. Önümüzdeki dönemde küresel gelişmelerin de yakından takip edilmesi gerektiği vurgulanıyor.`,
      authorId: authors[1].id,
      categoryId: catMap["ekonomi"],
      tags: ["ekonomi", "son-dakika"],
      viewCount: 12300,
      daysAgo: 0,
    },
    {
      title: "Süper Lig'de Şampiyonluk Yarışı Kızışıyor: Kritik Hafta",
      slug: "super-lig-sampiyonluk-yarisi",
      excerpt: "Süper Lig'de şampiyonluk yarışı son haftalara girerken zirvedeki takımlar arasındaki puan farkı kapanıyor. Bu hafta sonu oynanacak kritik maçlar sezonu şekillendirebilir.",
      content: `Trendyol Süper Lig'de şampiyonluk yarışı tüm heyecanıyla devam ediyor. Ligin son 6 haftasına girilirken zirvedeki takımlar arasındaki puan farkı oldukça dar.

## Puan Durumu

Lider takım 72 puanla zirvede otururken, en yakın rakibi sadece 2 puan gerisinde. Üçüncü sıradaki ekip de 4 puan farkla takibini sürdürüyor.

## Bu Haftanın Kritik Maçları

Bu hafta sonu oynanacak derbi maçı, şampiyonluk yarışının seyrini belirleyecek nitelikte. Her iki takım da sahaya en güçlü kadrolarıyla çıkmayı planlıyor.

## Teknik Direktörlerin Görüşleri

Her iki teknik direktör de basın toplantılarında temkinli açıklamalar yaptı. Sezonun sonuna kadar mücadele edeceklerini ve her maça final maçı gibi hazırlandıklarını belirttiler.`,
      authorId: authors[3].id,
      categoryId: catMap["spor"],
      tags: ["futbol"],
      viewCount: 9870,
      daysAgo: 0,
    },
    {
      title: "İklim Zirvesi'nden Tarihi Kararlar: Dünya Liderleri Anlaştı",
      slug: "iklim-zirvesi-kararlari",
      excerpt: "BM İklim Zirvesi'nde alınan tarihi kararlar, küresel karbon emisyonlarının azaltılması konusunda yeni bir dönemin başlangıcını işaret ediyor.",
      content: `Birleşmiş Milletler İklim Değişikliği Çerçeve Sözleşmesi (UNFCCC) kapsamında düzenlenen iklim zirvesinde, dünya liderleri tarihi bir anlaşmaya imza attı.

## Anlaşmanın Temel Maddeleri

1. **Karbon emisyonları**: 2035 yılına kadar küresel karbon emisyonlarının %60 azaltılması hedefi
2. **Yenilenebilir enerji**: 2030 yılına kadar yenilenebilir enerji kapasitesinin üç katına çıkarılması
3. **Finansman**: Gelişmekte olan ülkelere yıllık 200 milyar dolar iklim finansmanı sağlanması
4. **Orman koruma**: Küresel ormansızlaşmanın 2030 yılına kadar durdurulması

## Türkiye'nin Pozisyonu

Türkiye, zirvede yeşil dönüşüm stratejisini açıklayarak uluslararası arenada güçlü bir duruş sergiledi. Enerji verimliliği ve temiz teknoloji yatırımları konusunda somut taahhütlerde bulunuldu.`,
      authorId: authors[2].id,
      categoryId: catMap["dunya"],
      tags: ["surdurulebilirlik", "analiz"],
      viewCount: 8540,
      daysAgo: 0,
    },
    {
      title: "Elektrikli Araç Pazarında Rekor Büyüme: 2026 İlk Çeyrek Verileri",
      slug: "elektrikli-arac-rekor",
      excerpt: "Elektrikli araç satışları 2026'nın ilk çeyreğinde %45 artış gösterdi. Türkiye pazarında da önemli gelişmeler yaşanıyor.",
      content: `Küresel elektrikli araç pazarı, 2026'nın ilk çeyreğinde bir önceki yılın aynı dönemine göre %45 büyüme kaydetti. Bu büyüme, sektördeki yapısal dönüşümün hız kazandığını gösteriyor.

## Küresel Tablo

- **Toplam satış**: İlk çeyrekte dünya genelinde 4.2 milyon elektrikli araç satıldı
- **Pazar payı**: Elektrikli araçların toplam araç satışlarındaki payı %22'ye yükseldi
- **Lider pazar**: Çin, %48 pazar payıyla liderliğini sürdürüyor

## Türkiye Pazarı

Türkiye'de elektrikli araç satışları ilk çeyrekte 35.000 adede ulaştı. Yerli üretim elektrikli araç TOGG, segmentinde lider konumunu koruyor.

## Altyapı Gelişmeleri

Şarj istasyonu ağı da hızla genişliyor. Türkiye'deki toplam şarj noktası sayısı 15.000'i aşarak Avrupa ortalamasının üzerine çıktı.`,
      authorId: authors[0].id,
      categoryId: catMap["teknoloji"],
      tags: ["startup", "surdurulebilirlik"],
      viewCount: 4320,
      daysAgo: 0,
    },
    {
      title: "Sağlıklı Yaşam Trendleri: 2026'nın En Popüler Diyetleri",
      slug: "saglikli-yasam-trendleri-2026",
      excerpt: "Bu yıl popülerliği artan beslenme trendleri ve uzmanların önerileri hakkında kapsamlı rehber.",
      content: `2026 yılında sağlıklı beslenme anlayışı, kişiselleştirilmiş beslenme ve bağırsak sağlığına odaklanan yeni yaklaşımlarla şekilleniyor.

## Öne Çıkan Beslenme Trendleri

### 1. Akdeniz Diyetinin Evrimi
Geleneksel Akdeniz diyeti, modern bilimsel verilerle güncellenerek daha etkili hale getirildi.

### 2. Bağırsak Mikrobiyomu Odaklı Beslenme
Probiyotik ve prebiyotik açısından zengin gıdalar, bağırsak sağlığını desteklemek için öne çıkıyor.

### 3. Plant-Forward Beslenme
Tamamen bitkisel beslenme yerine, bitkisel ağırlıklı ancak esnek bir yaklaşım benimseniyor.

## Uzman Görüşleri

Diyetisyenler, tek bir diyetin herkes için uygun olmadığını vurguluyor. Genetik yapıya ve yaşam tarzına göre kişiselleştirilmiş beslenme planları öneriliyor.`,
      authorId: authors[4].id,
      categoryId: catMap["saglik"],
      tags: ["saglik"],
      viewCount: 5670,
      daysAgo: 1,
    },
    {
      title: "Uzay Turizmi Artık Herkes İçin: Fiyatlar Düşüyor",
      slug: "uzay-turizmi-fiyatlar-dusiyor",
      excerpt: "Özel uzay şirketlerinin artan rekabeti sayesinde uzay turizmi fiyatları son iki yılda %60 düştü.",
      content: `Uzay turizmi endüstrisi, hızla demokratikleşiyor. Özel sektördeki artan rekabet ve teknolojik ilerlemeler sayesinde uzay yolculuğu artık sadece milyarderlere özel bir ayrıcalık olmaktan çıkıyor.

## Fiyat Düşüşünün Nedenleri

- **Yeniden kullanılabilir roketler**: Fırlatma maliyetlerini %80'e varan oranlarda düşürdü
- **Artan rekabet**: SpaceX, Blue Origin ve yeni giren oyuncular arasındaki rekabet
- **Ölçek ekonomisi**: Artan uçuş sayısı, birim maliyetleri düşürüyor

## Güncel Fiyatlar

- **Alt-orbital uçuş**: 100.000 - 250.000 USD (2024'te 450.000 USD idi)
- **Orbital uçuş**: 5 - 15 milyon USD
- **Uzay istasyonu konaklama**: 20 - 50 milyon USD

## Gelecek Tahminleri

Uzay endüstrisi analistleri, 2030 yılına kadar alt-orbital uçuş fiyatlarının 50.000 USD'nin altına düşeceğini öngörüyor.`,
      authorId: authors[2].id,
      categoryId: catMap["bilim"],
      tags: ["uzay"],
      viewCount: 3890,
      daysAgo: 1,
    },
    {
      title: "Kripto Para Düzenlemeleri: Türkiye'nin Yeni Yaklaşımı",
      slug: "kripto-para-duzenlemeleri-turkiye",
      excerpt: "Yeni kripto para düzenlemeleri yatırımcıları ve piyasaları nasıl etkileyecek? Uzmanlar değerlendiriyor.",
      content: `Türkiye, kripto para düzenlemeleri konusunda önemli adımlar atıyor. Yeni yasa tasarısı, dijital varlık ekosistemini daha güvenli ve şeffaf hale getirmeyi amaçlıyor.

## Yeni Düzenlemenin Temel Noktaları

1. **Lisanslama**: Kripto para borsaları SPK'dan lisans alacak
2. **KYC zorunluluğu**: Tüm kullanıcılar kimlik doğrulamasından geçecek
3. **Vergilendirme**: Kripto varlık kazançlarına %15 stopaj uygulanacak
4. **Saklama hizmetleri**: Kurumsal saklama standartları belirlenecek

## Piyasa Tepkileri

Yeni düzenlemeler, başlangıçta dalgalanmaya neden olsa da uzun vadede piyasanın kurumsallaşmasına katkı sağlayacağı değerlendiriliyor.

## Uluslararası Karşılaştırma

Türkiye'nin yaklaşımı, AB'nin MiCA düzenlemesiyle uyumlu bir çerçeve oluşturuyor. Bu durum, Türkiye'nin kripto alanında bölgesel bir merkez olma hedefini destekliyor.`,
      authorId: authors[1].id,
      categoryId: catMap["ekonomi"],
      tags: ["kripto", "ekonomi"],
      viewCount: 6540,
      daysAgo: 1,
    },
    {
      title: "İstanbul'da Yeni Kültür Sanat Merkezi Açıldı",
      slug: "istanbul-yeni-kultur-sanat-merkezi",
      excerpt: "Uluslararası standartlarda tasarlanan yeni kültür merkezi, İstanbul'un sanat haritasını yeniden çiziyor.",
      content: `İstanbul'un kültür hayatına yeni bir merkez eklendi. Boğaz kıyısında inşa edilen kompleks, çağdaş sanat, müzik ve performans sanatları için dünya standartlarında bir mekân sunuyor.

## Merkezin Özellikleri

- **Alan**: 45.000 metrekare kapalı alan
- **Kapasiteler**: 2.500 kişilik konser salonu, 800 kişilik tiyatro, 3 galeri
- **Mimari**: Ödüllü uluslararası mimar bürosu tarafından tasarlandı
- **Teknoloji**: Tam dijital altyapı, sanal gerçeklik deneyim alanı

## Açılış Programı

Merkezin açılış haftasında dünyaca ünlü sanatçıların katılımıyla ücretsiz etkinlikler düzenleniyor. İlk sergide Türk çağdaş sanatının öncülerinden eserlere yer verilecek.`,
      authorId: authors[2].id,
      categoryId: catMap["kultur-sanat"],
      tags: [],
      viewCount: 2890,
      daysAgo: 2,
    },
    {
      title: "Yeni Eğitim Reformu Meclis'te Onaylandı",
      slug: "yeni-egitim-reformu-meclis",
      excerpt: "TBMM'de onaylanan eğitim reformu, müfredatı kökten değiştirmeyi ve dijital becerileri öne çıkarmayı hedefliyor.",
      content: `Türkiye Büyük Millet Meclisi, uzun süredir tartışılan eğitim reform paketini onayladı. Yeni yasa, 2026-2027 eğitim öğretim yılından itibaren uygulamaya konulacak.

## Reformun Temel Maddeleri

### Müfredat Değişiklikleri
- Kodlama ve yapay zeka eğitimi ilkokuldan itibaren müfredata eklenecek
- Yabancı dil eğitimi yoğunlaştırılacak
- STEM eğitimine ağırlık verilecek

### Öğretmen Yaşamı
- Öğretmen maaşlarına %25 zam
- Sürekli mesleki gelişim programları
- Dijital yetkinlik sertifikaları

### Altyapı
- Tüm okullara fiber altyapı ve tablet bilgisayar
- Akıllı sınıf teknolojileri
- Laboratuvar modernizasyonu

## Eğitim Uzmanlarının Değerlendirmeleri

Reforma genel olarak olumlu yaklaşılıyor ancak uygulamanın başarısının, yeterli bütçe ayrılmasına ve öğretmenlerin desteklenmesine bağlı olduğu vurgulanıyor.`,
      authorId: authors[0].id,
      categoryId: catMap["gundem"],
      tags: ["egitim", "son-dakika"],
      viewCount: 7200,
      daysAgo: 1,
    },
  ];

  const articles = [];
  for (const data of articleData) {
    const { tags: tagSlugs, daysAgo, ...articleFields } = data;
    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - daysAgo);
    publishedAt.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));

    const article = await prisma.article.create({
      data: {
        ...articleFields,
        status: "PUBLISHED",
        publishedAt,
        tags: {
          create: tagSlugs
            .filter((slug) => tagMap[slug])
            .map((slug) => ({
              tagId: tagMap[slug],
            })),
        },
      },
    });
    articles.push(article);
  }

  console.log(`✅ ${articles.length} makale oluşturuldu`);

  // --- Yorumlar ---
  const commentData = [
    { content: "Çok aydınlatıcı bir yazı, teşekkürler!", userId: regularUser.id, articleIndex: 0 },
    { content: "Yapay zeka konusunda gazetecilerin adaptasyonu çok önemli olacak.", userId: authors[1].id, articleIndex: 0 },
    { content: "Faiz kararı beklentiler dahilindeydi.", userId: regularUser.id, articleIndex: 1 },
    { content: "Bu sezon şampiyonluk yarışı çok heyecanlı!", userId: regularUser.id, articleIndex: 2 },
    { content: "İklim değişikliğiyle mücadelede bu adımlar çok az. Daha radikal önlemler gerekiyor.", userId: authors[4].id, articleIndex: 3 },
    { content: "TOGG ile gurur duyuyoruz!", userId: regularUser.id, articleIndex: 4 },
    { content: "Sağlıklı beslenme artık bir yaşam tarzı.", userId: regularUser.id, articleIndex: 5 },
  ];

  for (const comment of commentData) {
    await prisma.comment.create({
      data: {
        content: comment.content,
        userId: comment.userId,
        articleId: articles[comment.articleIndex].id,
      },
    });
  }

  console.log(`✅ ${commentData.length} yorum oluşturuldu`);

  // --- Bookmarks ---
  await prisma.bookmark.create({
    data: { userId: regularUser.id, articleId: articles[0].id },
  });
  await prisma.bookmark.create({
    data: { userId: regularUser.id, articleId: articles[3].id },
  });
  await prisma.bookmark.create({
    data: { userId: regularUser.id, articleId: articles[4].id },
  });

  console.log("✅ 3 bookmark oluşturuldu");
  
  // --- Homepage Slider ---
  const homepageSlider = await prisma.slider.upsert({
    where: { id: "homepage" },
    update: {},
    create: {
      id: "homepage",
      name: "Ana Sayfa Slider",
      autoPlay: true,
      interval: 5000,
      height: "500px",
      isActive: true,
    },
  });

  await prisma.slide.createMany({
    data: [
      {
        title: "Haber Nexus'a Hoş Geldiniz",
        description: "Yapay zeka destekli modern haber platformu ile gündemi keşfedin.",
        imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop",
        link: "/",
        order: 0,
        sliderId: homepageSlider.id,
      },
      {
        title: "Kişiselleştirilmiş Haber Deneyimi",
        description: "İlgi alanlarınıza göre özelleştirilmiş haber akışı ile sadece sizin için önemli olanları okuyun.",
        imageUrl: "https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=2070&auto=format&fit=crop",
        link: "/categories",
        order: 1,
        sliderId: homepageSlider.id,
      },
      {
        title: "Yazar Masası Yayında",
        description: "Kendi haberlerinizi oluşturun, yapay zeka ile zenginleştirin ve topluluğa sunun.",
        imageUrl: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?q=80&w=2070&auto=format&fit=crop",
        link: "/admin/ai-writer",
        order: 2,
        sliderId: homepageSlider.id,
      },
    ],
  });

  console.log("✅ Homepage Slider ve 3 slide oluşturuldu");

  console.log("\n🎉 Seed tamamlandı!\n");
  console.log("Test hesapları:");
  console.log("  Admin:     admin@habernexus.com / password123");
  console.log("  Yazar:     elif@habernexus.com  / password123");
  console.log("  Kullanıcı: user@habernexus.com  / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
