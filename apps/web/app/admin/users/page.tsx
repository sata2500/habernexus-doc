import { getAllUsers } from "../actions";
import { redirect } from "next/navigation";
import { UserRoleManager } from "../components/UserRoleManager";
import { Users } from "lucide-react";

export default async function AdminUsersPage() {
  const users = await getAllUsers().catch(() => null);
  if (!users) redirect("/");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Kullanıcı Yönetimi</h1>
          <p className="text-muted-foreground text-sm">Toplam {users.length} kayıtlı kullanıcı. Dropdown menüden rolü değiştirin.</p>
        </div>
      </div>

      <UserRoleManager users={users} />
    </div>
  );
}
