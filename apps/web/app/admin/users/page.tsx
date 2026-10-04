import { Users } from "lucide-react";
import { requireRole } from "@/lib/server/authz";
import { listUsers } from "@/lib/server/admin-lists";
import { pageParam, param, type RawParams } from "@/lib/admin/list";
import { UserRoleManager } from "../components/UserRoleManager";
import { ListSearch } from "../components/ListSearch";
import { FilterChips, Pagination } from "../components/ListControls";

export const dynamic = "force-dynamic";

const BASE = "/admin/users";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const session = await requireRole("ADMIN");
  const params = await searchParams;
  const pageNo = pageParam(params);
  const { items, total, counts } = await listUsers({ q: param(params, "q"), role: param(params, "rol"), pageNo });
  const all = (counts.USER ?? 0) + (counts.AUTHOR ?? 0) + (counts.ADMIN ?? 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2.5">
          <Users className="h-6 w-6 text-primary-500" /> Kullanıcılar
        </h1>
        <p className="text-sm text-muted-foreground">Rolü değiştirmek için kullanıcının yanındaki menüyü kullanın. Yazarlar haber yazabilir, adminler tüm paneli yönetir.</p>
      </div>

      <ListSearch placeholder="Ad veya e-posta ara" />
      <FilterChips base={BASE} params={params} name="rol" options={[
        { value: "", label: "Tümü", count: all },
        { value: "USER", label: "Okur", count: counts.USER ?? 0 },
        { value: "AUTHOR", label: "Yazar", count: counts.AUTHOR ?? 0 },
        { value: "ADMIN", label: "Admin", count: counts.ADMIN ?? 0 },
      ]} />

      <UserRoleManager users={items} currentUserId={session.user.id} />
      <Pagination base={BASE} params={params} page={pageNo} total={total} />
    </div>
  );
}
