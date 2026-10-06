import Link from "next/link";

/** Giriş/kayıt ekranlarıyla aynı görünümde kart */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8 sm:py-12 px-4">
      <Link href="/" className="mb-4 w-full max-w-md inline-flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <span aria-hidden="true">←</span> Ana sayfaya dön
      </Link>
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-card/70 backdrop-blur-xl border border-border shadow-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-2">{title}</h1>
        {subtitle && <p className="text-center text-muted-foreground mb-6">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export const inputClass =
  "w-full px-4 py-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all";
export const buttonClass =
  "w-full py-3 px-4 flex justify-center items-center gap-2 rounded-xl text-white font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all";
