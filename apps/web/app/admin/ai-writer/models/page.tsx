import { redirect } from "next/navigation";

// Model seçimi artık Ayarlar > Yapay Zekâ sekmesinde (sağlayıcıların canlı listesiyle)
export default function AiModelsRedirect() {
  redirect("/admin/settings?tab=yapay-zeka");
}
