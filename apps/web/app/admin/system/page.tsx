import { redirect } from "next/navigation";

// Sistem durumu artık Ayarlar sayfasının "Sistem" sekmesinde
export default function AdminSystemRedirect() {
  redirect("/admin/settings?tab=system");
}
