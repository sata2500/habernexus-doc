import Link from "next/link";
import { FileText, PenSquare } from "lucide-react";
import { requireRole } from "@/lib/server/authz";
import { listArticles } from "@/lib/server/admin-lists";
import { pageParam, param, type RawParams } from "@/lib/admin/list";
import { ArticleModerator } from "../components/ArticleModerator";
import { ListSearch } from "../components/ListSearch";
import { FilterChips, Pagination } from "../components/ListControls";

export const dynamic = "force-dynamic";

const BASE = "/admin/articles";

export default async function AdminArticlesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const pageNo = pageParam(params);
  const { items, total, counts, categories } = await listArticles({
    q: param(params, "q"),
    status: param(params, "durum"),
    category: param(params, "kategori"),
    source: param(params, "kaynak"),
    pageNo,
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-primary-500" /> Makaleler
          </h1>
          <p className="text-sm text-muted-foreground">{counts.published.toLocaleString("tr-TR")} yayında · {counts.drafts.toLocaleString("tr-TR")} taslak</p>
        </div>
        <Link href="/author/articles/new" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold">
          <PenSquare className="h-4 w-4" /> Yeni makale
        </Link>
      </div>

      <ListSearch placeholder="Başlık veya yazar ara" />

      <FilterChips base={BASE} params={params} name="durum" options={[
        { value: "", label: "Tümü", count: counts.all },
        { value: "PUBLISHED", label: "Yayında", count: counts.published },
        { value: "DRAFT", label: "Taslak", count: counts.drafts },
      ]} />
      <FilterChips base={BASE} params={params} name="kaynak" options={[
        { value: "", label: "Tüm kaynaklar" },
        { value: "ai", label: "AI Yazar" },
        { value: "insan", label: "Editörler" },
      ]} />
      {categories.length > 0 && (
        <FilterChips base={BASE} params={params} name="kategori" options={[
          { value: "", label: "Tüm kategoriler" },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]} />
      )}

      <ArticleModerator articles={items} />
      <Pagination base={BASE} params={params} page={pageNo} total={total} />
    </div>
  );
}
