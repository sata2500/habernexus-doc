"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { AuthCard, authErrorText, buttonClass, inputClass, linkButtonClass } from "../AuthCard";
import { GoogleSignIn, PasswordInput } from "../AuthFields";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newsletter, setNewsletter] = useState(false);
  // Kayıt sonrası: doğrulama e-postası gönderildi ekranı
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (cleanName.length < 2) return setError("Adınızı yazın (en az 2 karakter).");
    setLoading(true);
    setError(null);
    try {
      const { error: signUpError } = await signUp.email({
        name: cleanName,
        email: email.trim(),
        password,
        newsletterSubscribed: newsletter,
        callbackURL: "/email-verified",
      });
      if (signUpError) setError(authErrorText(signUpError, "Kayıt işlemi tamamlanamadı. Lütfen tekrar deneyin."));
      else setSentTo(email.trim());
    } catch {
      setError("Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.");
    }
    setLoading(false);
  };

  if (sentTo) {
    return (
      <AuthCard title="E-postanızı kontrol edin">
        <div className="text-center space-y-4" role="status">
          <span className="h-14 w-14 mx-auto rounded-full bg-success/10 text-success flex items-center justify-center"><MailCheck className="h-7 w-7" aria-hidden="true" /></span>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground break-all">{sentTo}</strong> adresine bir doğrulama bağlantısı gönderdik. Hesabınızı kullanmaya başlamak için
            e-postadaki bağlantıya tıklayın. E-posta birkaç dakika içinde gelmezse gereksiz (spam) klasörüne bakın.
          </p>
          <Link href="/login" className={linkButtonClass}>Giriş sayfasına git</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Aramıza katılın"
      subtitle="Yorum yapmak, haberleri kaydetmek ve size uygun önerileri görmek için kayıt olun."
      footer={<p>Zaten hesabınız var mı? <Link href="/login" className="font-semibold text-foreground hover:underline decoration-primary-500 decoration-2 underline-offset-2">Giriş yapın</Link></p>}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-error/10 text-error text-sm border border-error/30" role="alert">{error}</div>}

      {googleEnabled && <GoogleSignIn label="Google ile kayıt ol" callbackURL="/" errorCallbackURL="/register" disabled={loading} />}

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label htmlFor="register-name" className="block text-sm font-medium text-foreground mb-1.5">Ad soyad</label>
          <input id="register-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Adınız Soyadınız" autoComplete="name" minLength={2} maxLength={80} required />
        </div>
        <div>
          <label htmlFor="register-email" className="block text-sm font-medium text-foreground mb-1.5">E-posta adresi</label>
          <input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="ornek@eposta.com" autoComplete="email" inputMode="email" required />
        </div>
        <div>
          <label htmlFor="register-password" className="block text-sm font-medium text-foreground mb-1.5">Şifre</label>
          <PasswordInput id="register-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 8 karakter" minLength={8} maxLength={128} autoComplete="new-password" aria-describedby="register-password-hint" required />
          <p id="register-password-hint" className="mt-1.5 text-xs text-muted-foreground">En az 8 karakter. Başka sitelerde kullandığınız bir şifre seçmeyin.</p>
        </div>
        <label className="flex items-start gap-3 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary-600" />
          <span className="text-muted-foreground">
            Günlük haber bültenini e-posta ile almak istiyorum. <span className="text-xs">(İsteğe bağlı; istediğiniz zaman ayarlardan kapatabilirsiniz.)</span>
          </span>
        </label>
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {loading ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
        </button>
        <p className="text-xs text-center text-muted-foreground">
          Hesap oluşturarak <Link href="/terms" className="underline hover:text-foreground">Kullanım Şartları</Link>&apos;nı ve{" "}
          <Link href="/privacy" className="underline hover:text-foreground">Gizlilik Politikası</Link>&apos;nı okuduğunuzu kabul edersiniz.
        </p>
      </form>
    </AuthCard>
  );
}
