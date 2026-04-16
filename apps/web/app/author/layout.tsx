import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { PenTool, FileText, PlusCircle, LayoutDashboard, BarChart3, Home, MessageSquare, UserCircle } from "lucide-react";
import { SignOutButton } from "../dashboard/components/SignOutButton";

export default async function AuthorLayout({ children }: { children: React.ReactNode }) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session?.user) {
    redirect("/login");
  }

  // RBAC: Eğer kullanıcının rolü AUTHOR veya ADMIN değilse reddet.
  const isAuthorized = session.user.role === "AUTHOR" || session.user.role === "ADMIN";
  if (!isAuthorized) {
    // Standart bir kullanıcı yazar paneline girmeye çalıştığında nereye atalım? Dashboard'a atabiliriz.
    redirect("/dashboard/profile");
  }

  const navItems = [
    { name: "Yazar Özeti", href: "/author", icon: LayoutDashboard },
    { name: "Makalelerim", href: "/author/articles", icon: FileText },
    { name: "Yeni Haber Ekle", href: "/author/articles/new", icon: PlusCircle },
    { name: "İstatistikler", href: "/author/stats", icon: BarChart3 },
    { name: "Yorum Yönetimi", href: "/author/comments", icon: MessageSquare },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col md:flex-row gap-8">
      {/* ── Yazar Sol Navigasyonu ────────────────────────── */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="bg-neutral-900 dark:bg-neutral-950 text-white rounded-2xl p-5 border border-neutral-800 shadow-soft sticky top-24">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="h-10 w-10 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
              <PenTool className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h2 className="font-bold font-(family-name:--font-outfit) leading-none">Yazar Masası</h2>
              <span className="text-xs text-neutral-400 capitalize">{(session.user.role ?? "author").toLowerCase()}</span>
            </div>
          </div>
          
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item: any) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all"
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-neutral-800 px-2 space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 w-full px-2 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
               <Home className="h-4 w-4" /> Ana Sayfaya Dön
            </Link>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 w-full px-2 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer group"
            >
               <UserCircle className="h-4 w-4 group-hover:scale-110 transition-transform" /> Profil Ayarlarına Dön
            </Link>
          </div>
        </div>
      </aside>

      {/* ── İçerik Alanı ────────────────────────── */}
      <main className="flex-1 w-full min-w-0">
        {children}
      </main>
    </div>
  );
}
