"use client";

import { useState, useTransition } from "react";
import { updateUserRole, deleteUser } from "../actions";
import { Avatar } from "@/components/ui/Avatar";
import { Loader2, Trash2 } from "lucide-react";

type Role = "USER" | "AUTHOR" | "ADMIN";

const ROLES: { value: Role; label: string; variant: "default" | "primary" | "error" }[] = [
  { value: "USER",   label: "Kullanıcı", variant: "default" },
  { value: "AUTHOR", label: "Yazar",     variant: "primary" },
  { value: "ADMIN",  label: "Admin",     variant: "error" },
];

import { UserWithInfo } from "@/lib/types";

type User = UserWithInfo & {
  _count: { articles: number; comments: number };
};

export function UserRoleManager({ users }: { users: User[] }) {
  const [, startTransition] = useTransition();
  const [changingId, setChangingId] = useState<string | null>(null);

  const handleRoleChange = (userId: string, newRole: string) => {
    setChangingId(userId);
    startTransition(async () => {
      await updateUserRole(userId, newRole);
      setChangingId(userId === "FORCE_REFRESH" ? "" : null); // Simple reset
      setChangingId(null);
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (!confirm(`"${userName}" isimli kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm içerikleri (makaleler, yorumlar) silinir.`)) {
      return;
    }

    setChangingId(userId);
    startTransition(async () => {
      const resp = await deleteUser(userId);
      if (resp && !resp.success) {
        alert(resp.error || "Silme işlemi başarısız.");
      }
      setChangingId(null);
    });
  };

  return (
    <div className="glass-strong rounded-[2rem] border border-border/50 overflow-hidden divide-y divide-border/50 shadow-soft">
      {users.map((user) => {
        const currentRole = (user.role as Role) ?? "USER";
        const isChanging = changingId === user.id;

        return (
          <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-background/30 hover:bg-primary-500/5 transition-all duration-300 group">
            <div className="flex items-center gap-4 min-w-0 flex-1 w-full">
              <Avatar src={user.image ?? undefined} fallback={user.name ?? undefined} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate group-hover:text-[var(--color-primary-500)] transition-colors">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto">
              <div className="hidden sm:block text-xs font-bold text-muted-foreground bg-muted/30 border border-border/50 rounded-lg px-2.5 py-1">
                {user._count.articles} makale
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {isChanging ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <select
                      value={currentRole}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-xs px-3 py-2 rounded-xl border border-border/85 bg-background/50 text-foreground cursor-pointer focus:ring-2 focus:ring-primary-500 outline-none hover:border-primary-500/30 transition-colors font-bold"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name ?? "İsimsiz")}
                      className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-primary-500/10 text-muted-foreground hover:text-primary-500 transition-colors cursor-pointer border border-transparent hover:border-primary-500/25"
                      title="Kullanıcıyı Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
