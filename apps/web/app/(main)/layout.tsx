import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCategoriesWithCount } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";

export const revalidate = 60; // ISR: sayfa her 60 saniyede bir arka planda yenilenir

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategoriesWithCount();
  const settings = await getSiteSettings();

  return (
    <>
      <Navbar categories={categories} settings={settings} />
      <main className="flex-1">{children}</main>
      <Footer categories={categories} settings={settings} />
    </>
  );
}
