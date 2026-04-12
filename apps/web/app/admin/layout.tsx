import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { ShieldCheck, Users, FileText, LayoutDashboard, Bookmark, MessageSquare } from "lucide-react";
import { SignOutButton } from "../dashboard/components/SignOutButton";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Kategoriler", href: "/admin/categories", icon: Bookmark },
  { name: "Kullanıcılar", href: "/admin/users", icon: Users },
  { name: "Makaleler", href: "/admin/articles", icon: FileText },
  { name: "Yorum Yönetimi", href: "/admin/comments", icon: MessageSquare },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 shrink-0">
        <div className="bg-neutral-950 text-white rounded-2xl p-5 border border-neutral-800 shadow-2xl sticky top-24">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="h-10 w-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="font-bold font-(family-name:--font-outfit) leading-none">Admin Paneli</h2>
              <span className="text-xs text-neutral-400">Süper Yönetici</span>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
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

          <div className="mt-8 pt-6 border-t border-neutral-800 px-2 space-y-1">
            <Link
              href="/author"
              className="flex items-center gap-2 w-full px-2 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Yazar Masasına Geç
            </Link>
            <div className="text-neutral-400">
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
