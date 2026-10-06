"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, Trash2 } from "lucide-react";
import { updateUserRole, deleteUser, markEmailVerified } from "../actions";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/utils";
import type { AdminUserRow } from "@/lib/server/admin-lists";

const ROLES = [
  { value: "USER", label: "Okur" },
  { value: "AUTHOR", label: "Yazar" },
  { value: "ADMIN", label: "Admin" },
] as const;

export function UserRoleManager({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = (id: string, fn: () => Promise<{ success: boolean; error?: string }>) => {
    setBusyId(id);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) alert(res.error ?? "İşlem başarısız.");
      setBusyId(null);
      router.refresh();
    });
  };

  if (users.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Kullanıcı bulunamadı.</div>;
  }

  return (
    <ul className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border overflow-hidden">
      {users.map((u) => {
        const isMe = u.id === currentUserId;
        return (
          <li key={u.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
            <Avatar src={u.image ?? undefined} fallback={u.name ?? undefined} size="sm" />
            <div className="flex-1 min-w-[10rem]">
              <p className="text-sm font-semibold truncate">{u.name}{isMe && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(siz)</span>}</p>
              <p className="text-xs text-muted-foreground truncate">
                {u.email}
                {!u.emailVerified && <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-warning/10 text-warning">E-posta doğrulanmadı</span>}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatRelativeTime(u.createdAt, { compact: true })} katıldı · {u._count.articles} makale · {u._count.comments} yorum
              </p>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              {busyId === u.id ? (
                <Loader2 className="h-4 w-4 m-2 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <select
                    value={u.role}
                    disabled={isMe}
                    onChange={(e) => run(u.id, () => updateUserRole(u.id, e.target.value))}
                    aria-label={`${u.name} rolü`}
                    className="h-9 rounded-xl border border-border bg-background px-2.5 text-xs font-semibold outline-none focus:border-primary-500 disabled:opacity-60"
                  >
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  {!u.emailVerified && (
                    <button
                      onClick={() => {
                        if (confirm(`"${u.email}" adresi doğrulanmış sayılsın mı? Bu kişi doğrulama e-postası olmadan şifresiyle giriş yapabilecek. Yalnızca adresin bu kişiye ait olduğundan eminseniz onaylayın.`)) run(u.id, () => markEmailVerified(u.id));
                      }}
                      aria-label="E-postayı doğrulanmış say"
                      title="E-postayı doğrulanmış say"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:bg-success/10 hover:text-success"
                    >
                      <BadgeCheck className="h-4 w-4" />
                    </button>
                  )}
                  {!isMe && (
                    <button
                      onClick={() => {
                        if (confirm(`"${u.name}" silinsin mi? Bu işlem geri alınamaz; yorumları silinir, yazdığı haberler size (yöneticiye) devredilir.`)) run(u.id, () => deleteUser(u.id));
                      }}
                      aria-label="Kullanıcıyı sil"
                      title="Kullanıcıyı sil"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
