import { Newspaper } from "lucide-react";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCategoriesWithCount } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import { PwaRegister } from "@/components/PwaRegister";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { ThirdPartyScripts } from "@/components/layout/ThirdPartyScripts";
import { getPublicMonetization } from "@/lib/server/monetization";

// Not: Burada genel bir revalidate tanımlanmaz. Yerleşimdeki süre, altındaki tüm sayfaların süresini
// ezer (önceden 60 sn, haber sayfalarının 1 saatlik ayarını geçersiz kılıyordu). Her sayfa kendi süresini
// belirler; içerik değişince ilgili sayfalar zaten anında yenilenir (lib/server/article-cache).

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, settings, monetization] = await Promise.all([getCategoriesWithCount(), getSiteSettings(), getPublicMonetization()]);

  return (
    <>
      <PwaRegister />
      {/* Klavye ve ekran okuyucu kullanıcıları menüyü atlayıp doğrudan içeriğe geçebilir */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[calc(var(--z-sticky)+1)] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary-600 focus:text-white focus:font-semibold focus:shadow-lg"
      >
        İçeriğe geç
      </a>
      <Navbar
        categories={categories.map((c) => ({
          id: c.id, name: c.name, slug: c.slug, color: c.color,
          iconNode: <DynamicIcon name={c.icon} className="h-full w-full" fallback={Newspaper} />,
        }))}
        settings={settings}
      />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <Footer categories={categories} settings={settings} />
      <CookieConsent analytics={!!monetization.gaMeasurementId} ads={!!monetization.adsensePublisherId} />
      <ThirdPartyScripts
        gaMeasurementId={monetization.gaMeasurementId}
        adsensePublisherId={monetization.adsensePublisherId}
        vercelAnalytics={monetization.vercelAnalytics}
      />
    </>
  );
}
