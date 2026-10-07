"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck, Users, FileText, LayoutDashboard, Bookmark, MessageSquare,
  Image, Home, PenTool, Mail, LayoutTemplate, Brain, Wand2, Settings2, Menu, X, GalleryHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "../../dashboard/components/SignOutButton";

// Menü, işin türüne göre gruplanır: haber akışı ve yapay zekâ (günlük iş), içerik, topluluk, site
const navGroups = [
  {
    title: null,
    items: [{ name: "Genel Bakış", href: "/admin", icon: LayoutDashboard }],
  },
  {
    title: "Haber Akışı ve Yapay Zekâ",
    items: [
      { name: "Karar Merkezi", href: "/admin/karar-merkezi", icon: Brain },
      { name: "AI Yazar", href: "/admin/ai-writer", icon: Wand2 },
    ],
  },
  {
    title: "İçerik",
    items: [
      { name: "Makaleler", href: "/admin/articles", icon: FileText },
      { name: "Kategoriler", href: "/admin/categories", icon: Bookmark },
      { name: "Medya", href: "/admin/media", icon: Image },
      { name: "Ana Sayfa Slider", href: "/admin/slider", icon: GalleryHorizontal },
      { name: "Sabit Sayfalar", href: "/admin/pages", icon: LayoutTemplate },
    ],
  },
  {
    title: "Topluluk",
    items: [
      { name: "Kullanıcılar", href: "/admin/users", icon: Users },
      { name: "Yorumlar", href: "/admin/comments", icon: MessageSquare },
      { name: "Destek", href: "/admin/support", icon: Mail },
    ],
  },
  {
    title: "Site",
    items: [{ name: "Ayarlar", href: "/admin/settings", icon: Settings2 }],
  },
];

function isActivePath(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
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

export function AdminSidebar({ session }: SessionProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Sayfa değiştikçe çekmeceyi otomatik kapat
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

  const userName = session?.user?.name || "Yönetici";

  const renderNavLinks = (isMobile = false) => {
    return (
      <nav aria-label="Admin menüsü" className="flex flex-col gap-4">
        {navGroups.map((group) => (
          <div key={group.title ?? "root"} className="flex flex-col gap-0.5">
            {group.title && (
              <p className="px-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">{group.title}</p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => isMobile && setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 outline-none cursor-pointer focus-ring",
                    isActive
                      ? "bg-primary-500 text-white dark:bg-primary-500/15 dark:text-primary-400 shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 transition-transform duration-200 shrink-0", isActive && "scale-110")} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    );
  };

  // Alt kısım: siteye ve yazar masasına geçiş için yan yana iki buton, altında çıkış
  const renderFooterLinks = (isMobile = false) => {
    const quick = [
      { href: "/", label: "Siteye git", icon: Home },
      { href: "/author", label: "Yazar masası", icon: PenTool },
    ];
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
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
      <div className="w-full md:hidden flex items-center justify-between pb-4 border-b border-border/40 mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer focus-ring"
            aria-label="Menüyü aç"
            aria-expanded={isOpen}
            aria-controls="admin-drawer"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2 ml-1">
            <div className="h-8 w-8 rounded-lg bg-error/10 flex items-center justify-center border border-error/20 shrink-0">
              <ShieldCheck className="h-4 w-4 text-error" />
            </div>
            <div>
              <p className="font-bold font-display text-sm leading-none text-foreground">Admin Paneli</p>
              <span className="text-[10px] text-muted-foreground">{userName}</span>
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
        id="admin-drawer"
        inert={!isOpen}
        aria-label="Yönetim menüsü"
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
              <div className="h-9 w-9 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
                <ShieldCheck className="h-4.5 w-4.5 text-error" />
              </div>
              <div>
                <p className="font-bold font-display text-sm leading-none text-foreground">Admin Paneli</p>
                <span className="text-[10px] text-muted-foreground opacity-85">Süper Yönetici</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-muted rounded-lg border border-transparent hover:border-border/40 transition-all cursor-pointer outline-none"
              aria-label="Menüyü kapat"
            >
              <X className="h-4 w-4 text-foreground" />
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
        <div className="glass-strong rounded-3xl p-5 border border-border/50 shadow-soft sticky top-24 flex flex-col justify-between max-h-[calc(100vh-7rem)] overflow-hidden">
          <div className="space-y-4 overflow-hidden flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-2 shrink-0">
              <div className="h-10 w-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="font-bold font-display leading-none text-foreground text-sm">Admin Paneli</p>
                <span className="text-xs text-muted-foreground opacity-75">Süper Yönetici</span>
              </div>
            </div>

            {/* Links */}
            <div className="overflow-y-auto pr-1 flex-1 min-h-0 space-y-1 scrollbar-none">
              {renderNavLinks(false)}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-border/40 shrink-0 mt-2">
            {renderFooterLinks(false)}
          </div>
        </div>
      </aside>
    </>
  );
}
