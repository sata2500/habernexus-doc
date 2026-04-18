import { Metadata } from "next";
import { Info, Rss, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCategoriesWithCount } from "@/lib/data";
import { RSSFeedList } from "@/components/seo/RSSFeedList";

export const metadata: Metadata = {
  title: "RSS Kaynakları",
  description: "Haber Nexus yayınlarını RSS üzerinden takip edin. Genel, kategori bazlı ve dile özel tüm RSS akışlarımızı burada bulabilirsiniz.",
  openGraph: {
    title: "RSS Kaynakları | Haber Nexus",
    description: "Algoritmalardan bağımsız, en güncel haber akışlarımıza RSS üzerinden abone olun.",
  }
};

export default async function RSSFeedsPage() {
  const categories = await getCategoriesWithCount();

  const globalFeeds = [
    {
      title: "Haber Nexus - Genel Akış",
      description: "Platformdaki tüm son dakika ve güncel haberlerin toplu akışı.",
      url: "/rss.xml",
      type: "global" as const,
    },
    {
      title: "Haber Nexus - Türkçe (TR)",
      description: "Sadece Türkçe dilindeki haberleri içeren ana akış.",
      url: "/rss/tr",
      type: "language" as const,
    },
    {
      title: "Haber Nexus - English (EN)",
      description: "Coming soon! Future English language news feed.",
      url: "/rss/en",
      type: "language" as const,
    },
  ];

  const categoryFeeds = categories.map((cat) => ({
    title: `${cat.name} Haberleri`,
    description: `${cat.name} kategorisindeki en son gelişmeleri ve derinlemesine incelemeleri takip edin.`,
    url: `/rss/tr/category/${cat.slug}`,
    type: "category" as const,
  }));

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Navigation */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary-500 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Anasayfaya Dön
        </Link>

        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 mb-4">
            <Rss className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-(family-name:--font-outfit) tracking-tight text-foreground">
            RSS <span className="text-orange-500">Kaynakları</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Haberleri kendi şartlarınızla takip edin. Algoritmalara veya bildirimlere gerek duymadan,
            Haber Nexus içeriklerine dilediğiniz haber okuyucu ile abone olun.
          </p>
        </section>

        {/* Info Card */}
        <section className="bg-primary-500/5 border border-primary-500/10 rounded-3xl p-6 md:p-8 flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">RSS Nedir?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              RSS (Really Simple Syndication), favori web sitelerinizden güncellemeleri standart bir formatta almanızı sağlayan bir teknolojidir. 
              Feedly, Inoreader veya NetNewsWire gibi bir &quot;Haber Okuyucu&quot; (RSS Reader) kullanarak, Haber Nexus&apos;u sosyal medya kirliliğinden 
              uzak bir şekilde takip edebilirsiniz.
            </p>
          </div>
        </section>

        {/* Feed Selection */}
        <div className="space-y-12">
          {/* Global Feeds */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-(family-name:--font-outfit) flex items-center gap-2">
              <span className="h-1.5 w-6 bg-primary-500 rounded-full" />
              Genel Akışlar
            </h2>
            <RSSFeedList feeds={globalFeeds} />
          </div>

          {/* Category Feeds */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-(family-name:--font-outfit) flex items-center gap-2">
              <span className="h-1.5 w-6 bg-orange-500 rounded-full" />
              Kategori Akışları
            </h2>
            <RSSFeedList feeds={categoryFeeds} />
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Haber Nexus, içeriklerini standart RSS 2.0 formatında yayınlamaktadır. 
            Daha fazla bilgi için bizimle <Link href="/contact" className="text-primary-500 hover:underline">iletişime</Link> geçebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
