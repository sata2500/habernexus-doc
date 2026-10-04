import { MessageSquare } from "lucide-react";
import { requireRole } from "@/lib/server/authz";
import { listComments } from "@/lib/server/admin-lists";
import { pageParam, param, type RawParams } from "@/lib/admin/list";
import { deleteCommentAdmin } from "../actions";
import { CommentTable } from "@/components/admin/CommentTable";
import { ListSearch } from "../components/ListSearch";
import { Pagination } from "../components/ListControls";

export const dynamic = "force-dynamic";

export default async function AdminCommentsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const pageNo = pageParam(params);
  const { items, total } = await listComments({ q: param(params, "q"), pageNo });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2.5">
          <MessageSquare className="h-6 w-6 text-primary-500" /> Yorumlar
        </h1>
        <p className="text-sm text-muted-foreground">{total.toLocaleString("tr-TR")} yorum · en yeniler üstte</p>
      </div>

      <ListSearch placeholder="Yorum, kullanıcı veya haber ara" />
      <CommentTable
        comments={items.map((c) => ({ ...c, user: { name: c.user.name ?? "İsimsiz", image: c.user.image, email: c.user.email ?? undefined } }))}
        onDelete={deleteCommentAdmin}
        isAdmin
      />
      <Pagination base="/admin/comments" params={params} page={pageNo} total={total} />
    </div>
  );
}
