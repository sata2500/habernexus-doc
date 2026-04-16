import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCategoriesWithCount } from "@/lib/data";

export const revalidate = 60; // ISR: sayfa her 60 saniyede bir arka planda yenilenir

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategoriesWithCount();

  return (
    <>
      <Navbar categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer categories={categories} />
    </>
  );
}
