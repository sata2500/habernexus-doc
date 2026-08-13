import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCategoriesWithCount } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import { PwaRegister } from "@/components/PwaRegister";

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
      <PwaRegister />
      <Navbar categories={categories} settings={settings} />
      <main className="flex-1 pt-16 md:pt-20">{children}</main>
      <Footer categories={categories} settings={settings} />
    </>
  );
}
