"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AuthCard, authErrorText, buttonClass, linkButtonClass } from "../AuthCard";
import { PasswordInput } from "../AuthFields";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!token || linkError) {
    return (
      <AuthCard title="Bağlantı geçersiz">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">Şifre yenileme bağlantısı geçersiz ya da süresi dolmuş. Yeni bir bağlantı isteyebilirsiniz.</p>
          <Link href="/forgot-password" className={linkButtonClass}>Yeni bağlantı iste</Link>
        </div>
      </AuthCard>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Şifre en az 8 karakter olmalı.");
    if (password !== confirm) return setError("Şifreler aynı değil.");
    setState("saving");
    const { error: err } = await authClient.resetPassword({ newPassword: password, token }).catch(() => ({ error: { status: 0 } }));
    if (err) {
      setError(err.status === 0 ? "Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin." : authErrorText(err, "Şifre değiştirilemedi."));
      setState("idle");
      return;
    }
    setState("done");
  };

  return (
    <AuthCard title="Yeni şifre belirleyin">
      {state === "done" ? (
        <div className="text-center space-y-4" role="status">
          <span className="h-14 w-14 mx-auto rounded-full bg-success/10 text-success flex items-center justify-center"><CheckCircle2 className="h-7 w-7" aria-hidden="true" /></span>
          <p className="text-sm text-muted-foreground">Şifreniz değiştirildi. Güvenliğiniz için diğer cihazlardaki oturumlar kapatıldı.</p>
          <Link href="/login" className={linkButtonClass}>Giriş yap</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <div className="p-4 rounded-xl bg-error/10 text-error text-sm border border-error/30" role="alert">{error}</div>}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">Yeni şifre</label>
            <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 8 karakter" minLength={8} maxLength={128} autoComplete="new-password" required />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium mb-1.5">Yeni şifre (tekrar)</label>
            <PasswordInput id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required />
          </div>
          <button type="submit" disabled={state === "saving"} className={buttonClass}>
            {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Şifreyi kaydet
          </button>
        </form>
      )}
    </AuthCard>
  );
}
