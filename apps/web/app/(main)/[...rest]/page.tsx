import { notFound } from "next/navigation";

export const metadata = { title: "Sayfa bulunamadı", robots: { index: false } };

/**
 * Hiçbir rotayla eşleşmeyen adresler: site menüsü ve alt bilgiyle birlikte 404 gösterilsin diye
 * (main) yerleşiminde yakalanır. Belirli rotalar (haber, kategori, RSS, site haritası) önce eşleşir.
 */
export default function CatchAllNotFound() {
  notFound();
}
