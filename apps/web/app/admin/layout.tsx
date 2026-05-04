import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { ShieldCheck, Users, FileText, LayoutDashboard, Bookmark, MessageSquare, Image, Home, PenTool, Mail, LayoutTemplate, Rss, Wand2, Settings2 } from "lucide-react";
import { SignOutButton } from "../dashboard/components/SignOutButton";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "RSS Önerileri", href: "/admin/rss-feeds", icon: Rss },
  { name: "AI Yazar", href: "/admin/ai-writer", icon: Wand2 },
  { name: "Medya Kütüphanesi", href: "/admin/media", icon: Image },
  { name: "Kategoriler", href: "/admin/categories", icon: Bookmark },
  { name: "Kullanıcılar", href: "/admin/users", icon: Users },
  { name: "Makaleler", href: "/admin/articles", icon: FileText },
  { name: "Sayfa Yönetimi", href: "/admin/pages", icon: LayoutTemplate },
  { name: "Yorum Yönetimi", href: "/admin/comments", icon: MessageSquare },
  { name: "Destek Merkezi", href: "/admin/support", icon: Mail },
  { name: "Site Ayarları", href: "/admin/settings", icon: Settings2 },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col md:flex-row gap-8 min-h-screen transition-colors duration-300">
      <aside className="w-full md:w-64 shrink-0">
        <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white rounded-[2rem] p-5 border border-neutral-200 dark:border-neutral-800 shadow-lg dark:shadow-2xl sticky top-24 transition-all duration-300">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="h-10 w-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="font-bold font-(family-name:--font-outfit) leading-none">Admin Paneli</h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Süper Yönetici</span>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-white transition-all"
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 px-2 space-y-1">
            <Link
              href="/"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-white transition-all group"
            >
              <Home className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Ana Sayfaya Dön
            </Link>
            <Link
              href="/author"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-white transition-all group"
            >
              <PenTool className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Yazar Masasına Geç
            </Link>
            <div className="text-neutral-500 dark:text-neutral-400">
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 w-full min-w-0">
        {children}
      </main>
    </div>
  );
}
