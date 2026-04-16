import { getStaticPages } from "@/app/actions/static-pages";
import { PagesClient } from "./PagesClient";

export default async function AdminPagesPage() {
  const pages = await getStaticPages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Sanal Sayfa Yönetimi</h1>
          <p className="text-muted-foreground text-sm">Hakkımızda, Gizlilik Politikası, KVKK gibi sayfaları buradan düzenleyebilirsiniz.</p>
        </div>
      </div>

      <PagesClient initialPages={pages} />
    </div>
  );
}
