import Link from "next/link";
import { NotFoundState } from "@/components/system/NotFoundState";

export const metadata = { title: "Sayfa bulunamadı" };

/** Hiçbir rotayla eşleşmeyen adresler (site menüsü olmadan, kök yerleşimde gösterilir) */
export default function RootNotFound() {
  return (
    <>
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="text-xl font-extrabold font-display">
            <span className="text-primary-600">Haber</span> Nexus
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <NotFoundState />
      </main>
    </>
  );
}
