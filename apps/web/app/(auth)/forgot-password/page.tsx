"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AuthCard, buttonClass, inputClass } from "../AuthCard";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError(null);
    const { error: err } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    // Hesabın var olup olmadığı açığa çıkmasın diye hata dışında her durumda aynı mesaj gösterilir
    if (err && err.status === 429) {
      setError("Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.");
      setState("idle");
      return;
    }
    setState("sent");
  };

  return (
    <AuthCard title="Şifremi unuttum" subtitle="E-posta adresinizi yazın; şifrenizi yenilemeniz için bir bağlantı gönderelim.">
      {state === "sent" ? (
        <div className="text-center space-y-4" role="status">
          <span className="h-14 w-14 mx-auto rounded-full bg-success/10 text-success flex items-center justify-center"><MailCheck className="h-7 w-7" /></span>
          <p className="text-sm text-muted-foreground">
            Bu adrese kayıtlı bir hesap varsa şifre yenileme bağlantısı gönderildi. Bağlantı 1 saat geçerlidir; gelmezse gereksiz (spam) klasörüne bakın.
          </p>
          <Link href="/login" className="inline-flex h-11 items-center px-6 rounded-xl bg-primary-600 text-white text-sm font-semibold">Giriş sayfasına dön</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <div className="p-4 rounded-xl bg-error/10 text-error text-sm border border-error/30" role="alert">{error}</div>}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">E-posta adresi</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="ornek@eposta.com" autoComplete="email" required />
          </div>
          <button type="submit" disabled={state === "sending"} className={buttonClass}>
            {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" />} Bağlantı gönder
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Google ile kayıt olduysanız şifreye gerek yok; <Link href="/login" className="font-semibold text-foreground hover:underline">Google ile giriş yapın</Link>.
          </p>
        </form>
      )}
    </AuthCard>
  );
}
