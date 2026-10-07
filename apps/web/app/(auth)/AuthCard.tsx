import Link from "next/link";

/** Giriş/kayıt ekranlarının ortak kartı */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8 sm:py-12 px-4">
      <Link href="/" className="mb-4 w-full max-w-md inline-flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <span aria-hidden="true">←</span> Ana sayfaya dön
      </Link>
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-card/70 backdrop-blur-xl border border-border shadow-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-2">{title}</h1>
        {subtitle && <p className="text-center text-muted-foreground mb-6">{subtitle}</p>}
        {children}
        {footer && <div className="mt-8 pt-6 border-t border-border text-center text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}

export const inputClass =
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-base sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all";
export const buttonClass =
  "w-full py-3 px-4 flex justify-center items-center gap-2 rounded-xl text-white font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer";
export const linkButtonClass = "inline-flex h-11 items-center justify-center px-6 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold";

/** Sunucunun döndürdüğü kimlik doğrulama hatalarının Türkçe karşılığı */
export function authErrorText(err: { code?: string; status?: number; message?: string } | null | undefined, fallback: string) {
  if (!err) return fallback;
  if (err.status === 429) return "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.";
  switch (err.code) {
    case "INVALID_EMAIL_OR_PASSWORD": return "E-posta adresi ya da şifre hatalı.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL": return "Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin.";
    case "PASSWORD_TOO_SHORT": return "Şifre en az 8 karakter olmalı.";
    case "PASSWORD_TOO_LONG": return "Şifre en fazla 128 karakter olabilir.";
    case "INVALID_EMAIL": return "Geçerli bir e-posta adresi yazın.";
    case "INVALID_TOKEN": return "Bağlantının süresi dolmuş. Lütfen yeni bir bağlantı isteyin.";
    default: return fallback;
  }
}
