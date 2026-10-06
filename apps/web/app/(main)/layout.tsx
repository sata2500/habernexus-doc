import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCategoriesWithCount } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import { PwaRegister } from "@/components/PwaRegister";

// Not: Burada genel bir revalidate tanımlanmaz. Yerleşimdeki süre, altındaki tüm sayfaların süresini
// ezer (önceden 60 sn, haber sayfalarının 1 saatlik ayarını geçersiz kılıyordu). Her sayfa kendi süresini
// belirler; içerik değişince ilgili sayfalar zaten anında yenilenir (lib/server/article-cache).

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategoriesWithCount();
  const settings = await getSiteSettings();

  return (
    <>
      <PwaRegister />
      <Navbar categories={categories} settings={settings} />
      <main className="flex-1">{children}</main>
      <Footer categories={categories} settings={settings} />
    </>
  );
}
