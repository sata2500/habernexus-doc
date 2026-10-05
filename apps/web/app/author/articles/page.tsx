import Link from "next/link";
import { FileText, PenSquare } from "lucide-react";
import { AUTHOR_PAGE_SIZE, listAuthorArticles } from "@/lib/server/author-desk";
import { pageParam, param, type RawParams } from "@/lib/admin/list";
import { ListSearch } from "@/app/admin/components/ListSearch";
import { FilterChips, Pagination } from "@/app/admin/components/ListControls";
import { AuthorArticleList } from "../components/AuthorArticleList";

export const dynamic = "force-dynamic";

const BASE = "/author/articles";

export default async function AuthorArticlesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const pageNo = pageParam(params);
  const q = param(params, "q");
  const { items, total, counts } = await listAuthorArticles({ q, status: param(params, "durum"), pageNo });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-primary-500" /> Makalelerim
          </h1>
          <p className="text-sm text-muted-foreground">{counts.published} yayında · {counts.drafts} taslak</p>
        </div>
        <Link href="/author/articles/new" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold">
          <PenSquare className="h-4 w-4" /> Yeni haber
        </Link>
      </div>

      {counts.all > 0 && (
        <>
          <ListSearch placeholder="Başlıkta ara" />
          <FilterChips base={BASE} params={params} name="durum" options={[
            { value: "", label: "Tümü", count: counts.all },
            { value: "PUBLISHED", label: "Yayında", count: counts.published },
            { value: "DRAFT", label: "Taslak", count: counts.drafts },
          ]} />
        </>
      )}

      <AuthorArticleList articles={items} filtered={!!q || !!param(params, "durum")} />
      <Pagination base={BASE} params={params} page={pageNo} total={total} pageSize={AUTHOR_PAGE_SIZE} />
    </div>
  );
}
