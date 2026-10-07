"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PenTool,
  LayoutDashboard,
  Sparkles,
  FileText,
  PlusCircle,
  BarChart3,
  MessageSquare,
  Home,
  UserCircle,
  ShieldCheck,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "../../dashboard/components/SignOutButton";

const navItems = [
  { name: "Özet", href: "/author", icon: LayoutDashboard },
  { name: "Makalelerim", href: "/author/articles", icon: FileText },
  { name: "Haber Önerileri", href: "/author/suggestions", icon: Sparkles },
  { name: "Yorumlar", href: "/author/comments", icon: MessageSquare },
  { name: "İstatistikler", href: "/author/stats", icon: BarChart3 },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/author") return pathname === href;
  // "Yeni haber" sayfası kendi butonuyla vurgulanır
  if (href === "/author/articles" && pathname === "/author/articles/new") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SessionProps {
  session: {
    user: {
      name: string;
      email: string;
      image?: string | null;
      role?: string | null;
    };
  } | null;
}

export function AuthorSidebar({ session }: SessionProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close drawer on path change during render
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Çekmece açıkken arka plan kaymaz; Esc ile kapanır
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const userRoleName = session?.user?.role === "ADMIN" ? "Yönetici" : "Yazar";

  const renderNavLinks = (isMobile = false) => {
    const newActive = pathname === "/author/articles/new";
    return (
      <nav aria-label="Yazar menüsü" className="flex flex-col gap-0.5">
        <Link
          href="/author/articles/new"
          onClick={() => isMobile && setIsOpen(false)}
          aria-current={newActive ? "page" : undefined}
          className={cn(
            "mb-3 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-colors focus-ring",
            newActive ? "bg-primary-600 text-white" : "bg-primary-500 hover:bg-primary-600 text-white"
          )}
        >
          <PlusCircle className="h-4 w-4" /> Yeni haber yaz
        </Link>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={() => isMobile && setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 outline-none cursor-pointer focus-ring",
                isActive
                  ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 transition-transform duration-200 shrink-0", isActive && "scale-110")} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    );
  };

  // Alt kısım: siteye ve profile geçiş için yan yana iki buton, altında çıkış
  const renderFooterLinks = (isMobile = false) => {
    const quick = [
      { href: "/", label: "Siteye git", icon: Home },
      { href: "/dashboard/profile", label: "Profilim", icon: UserCircle },
      ...(session?.user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
    ];
    return (
      <div className="space-y-2">
        <div className={cn("grid gap-2", quick.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {quick.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              onClick={() => isMobile && setIsOpen(false)}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-muted/40 px-2 py-2.5 text-xs font-semibold text-foreground hover:border-primary-500/40 hover:bg-primary-500/10 hover:text-primary-500 transition-colors focus-ring"
            >
              <q.icon className="h-4 w-4" />
              {q.label}
            </Link>
          ))}
        </div>
        <SignOutButton
          label="Çıkış yap"
          className="flex items-center justify-center gap-2 w-full h-9 rounded-xl text-xs font-semibold text-error hover:bg-error/10 transition-colors cursor-pointer focus-ring"
        />
      </div>
    );
  };

  return (
    <>
      {/* ── Mobil Üst Bar (Mobile Top Header) ────────────────────────── */}
      <div className="w-full md:hidden flex items-center justify-between pb-4 border-b border-border/40 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer focus-ring"
            aria-label="Menüyü aç"
            aria-expanded={isOpen}
            aria-controls="author-drawer"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2 ml-1">
            <div className="h-8 w-8 rounded-lg bg-primary-500/10 flex items-center justify-center border border-primary-500/20 shrink-0">
              <PenTool className="h-4 w-4 text-primary-500" />
            </div>
            <div>
              <p className="font-bold font-display text-sm leading-none text-foreground">Yazar Masası</p>
              <span className="text-[10px] text-muted-foreground ">{userRoleName}</span>
            </div>
          </div>
        </div>

        {/* Hızlı Çıkış */}
        <SignOutButton className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-error hover:text-error hover:bg-error/5 transition-colors cursor-pointer" />
      </div>

      {/* ── Mobil Çekmece Menüsü (Mobile Drawer Menu) ────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <div
        id="author-drawer"
        inert={!isOpen}
        aria-label="Yazar menüsü"
        className={cn(
          "fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-card border-r border-border p-4 z-50 flex flex-col transition-[transform,visibility] duration-300 ease-in-out md:hidden",
          // Kapalıyken gölge ekranın sol kenarına taşmasın, odak da gizli menüye gitmesin
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full invisible"
        )}
      >
        <div className="flex flex-col gap-5 overflow-y-auto pr-1 min-h-0 flex-1">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                <PenTool className="h-4.5 w-4.5 text-primary-500" />
              </div>
              <div>
                <p className="font-bold font-display text-sm leading-none text-foreground">Yazar Masası</p>
                <span className="text-[10px] text-muted-foreground opacity-85 ">{userRoleName}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-muted rounded-lg border border-transparent hover:border-border/40 transition-all cursor-pointer focus-ring"
              aria-label="Menüyü kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Links */}
          {renderNavLinks(true)}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border/40 mt-3 shrink-0">
          {renderFooterLinks(true)}
        </div>
      </div>

      {/* ── Masaüstü Sidebar (Desktop Sidebar) ────────────────────────── */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="glass-strong rounded-3xl p-5 border border-border/50 shadow-soft sticky top-24 flex flex-col justify-between max-h-[calc(100vh-7rem)] transition-colors duration-300">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                <PenTool className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <p className="font-bold font-display leading-none text-foreground text-sm">Yazar Masası</p>
                <span className="text-xs text-muted-foreground opacity-75 ">{userRoleName}</span>
              </div>
            </div>

            {/* Links */}
            <div className="overflow-y-auto pr-1 scrollbar-none">
              {renderNavLinks(false)}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-border/40 mt-4">
            {renderFooterLinks(false)}
          </div>
        </div>
      </aside>
    </>
  );
}
