import { redirect } from "next/navigation";

/** Eski adres: Google Trends artık Karar Merkezi'nde */
export default function Page() {
  redirect("/admin/karar-merkezi?sekme=trendler");
}
