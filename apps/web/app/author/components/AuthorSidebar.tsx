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
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "../../dashboard/components/SignOutButton";

const navItems = [
  { name: "Yazar Özeti", href: "/author", icon: LayoutDashboard },
  { name: "Haber Önerileri", href: "/author/suggestions", icon: Sparkles },
  { name: "Makalelerim", href: "/author/articles", icon: FileText },
  { name: "Yeni Haber Ekle", href: "/author/articles/new", icon: PlusCircle },
  { name: "İstatistikler", href: "/author/stats", icon: BarChart3 },
  { name: "Yorum Yönetimi", href: "/author/comments", icon: MessageSquare },
];

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

  // Close drawer on path change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const userName = session?.user?.name || "Yönetici";
  const userRoleName = (session?.user?.role ?? "AUTHOR").toLowerCase();

  const renderNavLinks = (isMobile = false) => {
    return (
      <nav className="flex flex-col gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 outline-none cursor-pointer focus-ring",
                isActive
                  ? "bg-primary-500 text-white dark:bg-primary-500/15 dark:text-primary-400 border border-primary-500/10 shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
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

  const renderFooterLinks = (isMobile = false) => {
    return (
      <div className="space-y-1">
        <Link
          href="/"
          onClick={() => isMobile && setIsOpen(false)}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer group"
        >
          <Home className="h-4 w-4 group-hover:scale-110 transition-transform shrink-0" />
          Ana Sayfaya Dön
        </Link>
        <Link
          href="/dashboard/profile"
          onClick={() => isMobile && setIsOpen(false)}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer group"
        >
          <UserCircle className="h-4 w-4 group-hover:scale-110 transition-transform shrink-0" />
          Profil Ayarlarına Dön
        </Link>
        <div className="pt-2 border-t border-border/40">
          <SignOutButton className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/5 transition-all cursor-pointer" />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Mobil Üst Bar (Mobile Top Header) ────────────────────────── */}
      <div className="w-full md:hidden flex items-center justify-between pb-4 border-b border-border/40 mb-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsOpen(true)}
            className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors outline-none cursor-pointer"
            aria-label="Menüyü Aç"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2 ml-1">
            <div className="h-8 w-8 rounded-lg bg-primary-500/10 flex items-center justify-center border border-primary-500/20 shrink-0">
              <PenTool className="h-4 w-4 text-primary-500" />
            </div>
            <div>
              <h2 className="font-bold font-display text-sm leading-none text-foreground">Yazar Masası</h2>
              <span className="text-[10px] text-muted-foreground capitalize">{userRoleName}</span>
            </div>
          </div>
        </div>
        
        {/* Hızlı Çıkış */}
        <SignOutButton className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/5 transition-colors cursor-pointer" />
      </div>

      {/* ── Mobil Çekmece Menüsü (Mobile Drawer Menu) ────────────────────────── */}
      <div 
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />
      <div 
        className={cn(
          "fixed inset-y-0 left-0 w-72 max-w-xs bg-card border-r border-border p-5 z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col gap-6 overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                <PenTool className="h-4.5 w-4.5 text-primary-500" />
              </div>
              <div>
                <h3 className="font-bold font-display text-sm leading-none text-foreground">Yazar Masası</h3>
                <span className="text-[10px] text-muted-foreground opacity-85 capitalize">{userRoleName}</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-muted rounded-lg border border-transparent hover:border-border/40 transition-all cursor-pointer outline-none"
              aria-label="Menüyü Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Links */}
          {renderNavLinks(true)}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/40 mt-auto">
          {renderFooterLinks(true)}
        </div>
      </div>

      {/* ── Masaüstü Sidebar (Desktop Sidebar) ────────────────────────── */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="glass-strong rounded-3xl p-5 border border-border/50 shadow-soft sticky top-24 flex flex-col justify-between min-h-[600px] transition-colors duration-300">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                <PenTool className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <h2 className="font-bold font-display leading-none text-foreground text-sm">Yazar Masası</h2>
                <span className="text-xs text-muted-foreground opacity-75 capitalize">{userRoleName}</span>
              </div>
            </div>

            {/* Links */}
            <div className="max-h-[500px] overflow-y-auto pr-1 scrollbar-none">
              {renderNavLinks(false)}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border/40 mt-auto">
            {renderFooterLinks(false)}
          </div>
        </div>
      </aside>
    </>
  );
}
