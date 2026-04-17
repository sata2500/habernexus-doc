import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { User, Bookmark, Settings, LayoutDashboard, Home, MessageSquare } from "lucide-react";
import { SignOutButton } from "./components/SignOutButton";

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

  const navItems = [
    { name: "Profilim", href: "/dashboard/profile", icon: User },
    { name: "Yorumlarım", href: "/dashboard/comments", icon: MessageSquare },
    { name: "Kaydedilenler", href: "/dashboard/bookmarks", icon: Bookmark },
    { name: "Tercihler", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col md:flex-row gap-8">
      {/* ── Sidebar Navigasyon ────────────────────────── */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="glass-strong rounded-2xl p-5 border border-border shadow-soft sticky top-24">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="h-10 w-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <h2 className="font-bold font-(family-name:--font-outfit) leading-none">Panelim</h2>
              <span className="text-xs text-muted-foreground">{session.user.name}</span>
            </div>
          </div>
          
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

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
      <main className="flex-1 w-full min-w-0">
        {children}
      </main>
    </div>
  );
}
