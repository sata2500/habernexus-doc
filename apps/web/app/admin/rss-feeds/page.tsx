import { redirect } from "next/navigation";

/** Eski adres: RSS önerileri artık Karar Merkezi'nde */
export default function Page() {
  redirect("/admin/karar-merkezi");
}
