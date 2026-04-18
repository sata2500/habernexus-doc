import { getAllCategoriesAdmin } from "../actions";
import { redirect } from "next/navigation";
import { CategoryManager } from "../components/CategoryManager";
import { LayoutList } from "lucide-react";

export default async function AdminCategoriesPage() {
  const categories = await getAllCategoriesAdmin().catch(() => null);
  if (!categories) redirect("/");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="bg-primary-500/10 text-primary-500 p-2.5 rounded-xl border border-primary-500/20">
            <LayoutList className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Kategori Yönetimi</h1>
          <p className="text-muted-foreground text-sm">Sitedeki okuyucuların içeriklere ulaşmasını sağlayan kategorileri yönetin.</p>
        </div>
      </div>
      
      <CategoryManager categories={categories} />
    </div>
  );
}
