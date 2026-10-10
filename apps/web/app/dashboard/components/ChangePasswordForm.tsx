"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const field =
  "w-full px-4 py-2.5 rounded-xl bg-background border border-border text-base sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none";

/** Giriş yapmış kullanıcının şifre değiştirmesi; diğer cihazlardaki oturumlar kapatılır */
export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError("Yeni şifre en az 8 karakter olmalı.");
    if (next !== confirm) return setError("Yeni şifreler aynı değil.");
    if (next === current) return setError("Yeni şifre eskisiyle aynı olamaz.");
    setState("saving");
    const { error: err } = await authClient
      .changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true })
      .catch(() => ({ error: { status: 0, code: undefined as string | undefined } }));
    if (err) {
      setState("idle");
      setError(
        err.status === 429 ? "Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin."
          : err.code === "INVALID_PASSWORD" ? "Mevcut şifre hatalı."
            : err.status === 0 ? "Bağlantı kurulamadı." : "Şifre değiştirilemedi.",
      );
      return;
    }
    setCurrent(""); setNext(""); setConfirm("");
    setState("done");
  };

  return (
    <form onSubmit={submit} className="space-y-3 w-full lg:max-w-sm" aria-label="Şifre değiştir">
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {state === "done" && (
        <p role="status" className="text-sm text-success flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Şifreniz değiştirildi; diğer cihazlardaki oturumlar kapatıldı.
        </p>
      )}
      <div>
        <label htmlFor="pw-current" className="block text-xs font-semibold text-muted-foreground mb-1">Mevcut şifre</label>
        <input id="pw-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} autoComplete="current-password" required />
      </div>
      <div>
        <label htmlFor="pw-new" className="block text-xs font-semibold text-muted-foreground mb-1">Yeni şifre</label>
        <input id="pw-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} className={field} minLength={8} maxLength={128} autoComplete="new-password" required />
      </div>
      <div>
        <label htmlFor="pw-confirm" className="block text-xs font-semibold text-muted-foreground mb-1">Yeni şifre (tekrar)</label>
        <input id="pw-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} minLength={8} maxLength={128} autoComplete="new-password" required />
      </div>
      <button type="submit" disabled={state === "saving"} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer">
        {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Şifreyi değiştir
      </button>
    </form>
  );
}
