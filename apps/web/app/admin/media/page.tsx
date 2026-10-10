import { ImageIcon } from "lucide-react";
import { requireRole } from "@/lib/server/authz";
import { listMedia, MEDIA_PAGE_SIZE } from "@/lib/server/admin-lists";
import { pageParam, param, type RawParams } from "@/lib/admin/list";
import { formatBytes } from "@/lib/utils";
import { MediaManagerClient } from "./MediaManagerClient";
import { ListSearch } from "../components/ListSearch";
import { FilterChips, Pagination } from "../components/ListControls";

export const dynamic = "force-dynamic";

const BASE = "/admin/media";

export default async function AdminMediaPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const pageNo = pageParam(params);
  const { items, total, counts, totalSize } = await listMedia({ q: param(params, "q"), status: param(params, "status"), pageNo });
  const all = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2.5">
          <ImageIcon className="h-6 w-6 text-primary-500" /> Medya
        </h1>
        <p className="text-sm text-muted-foreground">
          {all.toLocaleString("tr-TR")} dosya · toplam {formatBytes(totalSize)}. Görseller haber, profil ve slayt yüklerken buraya eklenir.
        </p>
      </div>

      <ListSearch placeholder="Dosya adıyla ara" />
      <FilterChips base={BASE} params={params} name="status" options={[
        { value: "", label: "Tümü", count: all },
        { value: "RAW", label: "Optimize edilmemiş", count: counts.RAW ?? 0 },
        { value: "OPTIMIZED", label: "Optimize", count: counts.OPTIMIZED ?? 0 },
        { value: "FAILED", label: "Hatalı", count: counts.FAILED ?? 0 },
      ]} />

      <MediaManagerClient items={items} />
      <Pagination base={BASE} params={params} page={pageNo} total={total} pageSize={MEDIA_PAGE_SIZE} />
    </div>
  );
}
