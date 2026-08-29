import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { LayoutDashboard, Home } from "lucide-react";
import { SignOutButton } from "./components/SignOutButton";
import { DashboardNav } from "./components/DashboardNav";
import { MobileBottomNav } from "./components/MobileBottomNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Better Auth Sunucu Tarafı (Server-Side) Oturum Kontrolü (Next.js 15)
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  // AuthGuard: Eğer giriş yapılmamışsa anında login'e fırlat.
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 flex flex-col md:flex-row gap-6 md:gap-8 min-h-[calc(100vh-4rem)] relative">
      {/* Mobile Top Bar */}
      <div className="w-full md:hidden flex items-center justify-between pb-4 border-b border-border/40 mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
            <LayoutDashboard className="h-4 w-4 text-primary-500" />
          </div>
          <div>
            <h2 className="font-bold font-display text-sm leading-none text-foreground">Panelim</h2>
            <span className="text-[10px] text-muted-foreground">{session.user.name}</span>
          </div>
        </div>
        <SignOutButton className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-500 hover:text-primary-600 hover:bg-primary-500/5 transition-colors cursor-pointer" />
      </div>

      {/* ── Sidebar Navigasyon (Masaüstü) ────────────────────────── */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="glass-strong rounded-2xl p-5 border border-border shadow-soft md:sticky md:top-24">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="h-10 w-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <h2 className="font-bold font-display leading-none text-foreground">Panelim</h2>
              <span className="text-xs text-muted-foreground">{session.user.name}</span>
            </div>
          </div>

          <DashboardNav />

          <div className="mt-8 pt-6 border-t border-border px-2 space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 w-full px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
               <Home className="h-4 w-4" /> Ana Sayfaya Dön
            </Link>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* ── Dashboard Content ────────────────────────── */}
      <main className="flex-1 w-full min-w-0 pb-24 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Fixed Tab Navigation */}
      <MobileBottomNav />
    </div>
  );
}
