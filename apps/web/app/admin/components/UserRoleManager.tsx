"use client";

import { useState, useTransition } from "react";
import { updateUserRole, deleteUser } from "../actions";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Loader2, Trash2 } from "lucide-react";

type Role = "USER" | "AUTHOR" | "ADMIN";

const ROLES: { value: Role; label: string; variant: "default" | "primary" | "error" }[] = [
  { value: "USER",   label: "Kullanıcı", variant: "default" },
  { value: "AUTHOR", label: "Yazar",     variant: "primary" },
  { value: "ADMIN",  label: "Admin",     variant: "error" },
];

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
  createdAt: Date;
  _count: { articles: number };
}

export function UserRoleManager({ users }: { users: User[] }) {
  const [pending, startTransition] = useTransition();
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
    <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
      {users.map((user: any) => {
        const currentRole = (user.role as Role) ?? "USER";
        const roleInfo = ROLES.find((r) => r.value === currentRole) ?? ROLES[0];
        const isChanging = changingId === user.id;

        return (
          <div key={user.id} className="flex items-center gap-4 p-4 bg-background hover:bg-muted/30 transition-colors">
            <Avatar src={user.image || undefined} fallback={user.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="hidden sm:block text-xs text-muted-foreground">
              {user._count.articles} makale
            </div>
            <div className="flex items-center gap-2">
              {isChanging ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <select
                    value={currentRole}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground cursor-pointer focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {ROLES.map((r: any) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                    title="Kullanıcıyı Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
