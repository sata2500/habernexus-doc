"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { authClient, signIn } from "@/lib/auth-client";
import { authErrorMessage, safeCallbackPath } from "@/lib/auth-errors";
import { AuthCard, authErrorText, buttonClass, inputClass } from "../AuthCard";
import { GoogleSignIn, PasswordInput } from "../AuthFields";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackPath = safeCallbackPath(searchParams.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Google'dan hata ile dönüldüyse (ör. ?error=account_not_linked) açıklamasını göster
  const [error, setError] = useState<string | null>(() => authErrorMessage(searchParams.get("error")));
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const verifiedNotice = searchParams.get("dogrulandi") === "1";

  const resend = async () => {
    setResent("sending");
    const { error: e } = await authClient.sendVerificationEmail({ email, callbackURL: "/email-verified" });
    setResent(e ? "error" : "sent");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverified(false);
    try {
      const { error: signInError } = await signIn.email({ email: email.trim(), password });
      if (!signInError) {
        router.push(callbackPath);
        router.refresh();
        return; // yönlenirken düğme "yükleniyor" kalır
      }
      if (signInError.code === "EMAIL_NOT_VERIFIED") {
        // Sunucu bu durumda yeni doğrulama bağlantısını kendiliğinden gönderir
        setUnverified(true);
        setError("E-posta adresiniz henüz doğrulanmamış. Adresinize yeni bir doğrulama bağlantısı gönderdik; bağlantıya tıkladıktan sonra giriş yapabilirsiniz.");
      } else {
        setError(authErrorText(signInError, "Giriş yapılamadı, bilgilerinizi kontrol edin."));
      }
    } catch {
      setError("Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.");
    }
    setLoading(false);
  };

  const errorBack = `/login${callbackPath !== "/" ? `?callbackUrl=${encodeURIComponent(callbackPath)}` : ""}`;

  return (
    <AuthCard
      title="Tekrar hoş geldiniz"
      subtitle="Haberleri takip etmek için hesabınıza giriş yapın."
      footer={<p>Hesabınız yok mu? <Link href="/register" className="font-semibold text-foreground hover:underline decoration-primary-500 decoration-2 underline-offset-2">Hemen oluşturun</Link></p>}
    >
      {verifiedNotice && !error && (
        <div className="mb-6 p-4 rounded-xl bg-success/10 text-sm border border-success/30" role="status">E-posta adresiniz doğrulandı. Şimdi giriş yapabilirsiniz.</div>
      )}
      {error && (
        <div className={`mb-6 p-4 rounded-xl text-sm border ${unverified ? "bg-warning/10 border-warning/30 text-foreground" : "bg-error/10 text-error border-error/30"}`} role="alert">
          {error}
          {unverified && (
            <button
              type="button"
              onClick={resend}
              disabled={resent === "sending" || resent === "sent"}
              className="mt-2 block font-semibold text-primary-600 hover:underline disabled:opacity-60 disabled:no-underline cursor-pointer"
            >
              {resent === "sent" ? "Bağlantı tekrar gönderildi." : resent === "error" ? "Gönderilemedi, birazdan tekrar deneyin." : resent === "sending" ? "Gönderiliyor…" : "Bağlantıyı tekrar gönder"}
            </button>
          )}
        </div>
      )}

      {googleEnabled && <GoogleSignIn label="Google ile giriş yap" callbackURL={callbackPath} errorCallbackURL={errorBack} disabled={loading} />}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-1.5">E-posta adresi</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="ornek@eposta.com"
            autoComplete="email"
            inputMode="email"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-sm font-medium text-foreground">Şifre</label>
            <Link href="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">Şifremi unuttum</Link>
          </div>
          <PasswordInput id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {loading ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
      </form>
    </AuthCard>
  );
}
