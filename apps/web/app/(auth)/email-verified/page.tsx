import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthCard } from "../AuthCard";

export const metadata = { title: "E-posta doğrulama" };

/** Doğrulama bağlantısından dönüş: başarılıysa oturum zaten açılmıştır */
export default async function EmailVerifiedPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (error) {
    return (
      <AuthCard title="Doğrulanamadı">
        <div className="text-center space-y-4">
          <span className="h-14 w-14 mx-auto rounded-full bg-error/10 text-error flex items-center justify-center"><XCircle className="h-7 w-7" /></span>
          <p className="text-sm text-muted-foreground">{authErrorMessage(error.toLowerCase())}</p>
          <Link href="/login" className="inline-flex h-11 items-center px-6 rounded-xl bg-primary-600 text-white text-sm font-semibold">Giriş yap</Link>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="E-postanız doğrulandı">
      <div className="text-center space-y-4">
        <span className="h-14 w-14 mx-auto rounded-full bg-success/10 text-success flex items-center justify-center"><CheckCircle2 className="h-7 w-7" /></span>
        <p className="text-sm text-muted-foreground">Hesabınız etkinleşti ve giriş yaptınız. Haber Nexus&apos;a hoş geldiniz!</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/" className="inline-flex h-11 items-center justify-center px-6 rounded-xl bg-primary-600 text-white text-sm font-semibold">Haberlere göz at</Link>
          <Link href="/dashboard/settings" className="inline-flex h-11 items-center justify-center px-6 rounded-xl border border-border text-sm font-semibold">Tercihlerim</Link>
        </div>
      </div>
    </AuthCard>
  );
}
