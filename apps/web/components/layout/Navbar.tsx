"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import {
  Search,
  Menu,
  X,
  Newspaper,
  TrendingUp,
  Globe,
  Cpu,
  Trophy,
  Briefcase,
  Heart,
  Clapperboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { DynamicIcon } from "@/components/ui/DynamicIcon";

import { LucideIcon } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
}

const iconMap: Record<string, LucideIcon> = {
  gundem: Newspaper,
  dunya: Globe,
  ekonomi: TrendingUp,
  teknoloji: Cpu,
  spor: Trophy,
  saglik: Heart,
  kultur: Clapperboard,
  "is-dunyasi": Briefcase,
};

export function Navbar({ categories = [] }: { categories?: Category[] }) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: session, isPending } = useSession();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile menu on route change
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-(--z-sticky)",
          "transition-all duration-300",
          isScrolled
            ? "glass-strong shadow-lg"
            : "bg-background/80 backdrop-blur-sm"
        )}
      >
        {/* Top Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 group"
              id="navbar-logo"
            >
              <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-lg font-(family-name:--font-outfit)">
                  N
                </span>
              </div>
              <span className="text-xl font-bold font-(family-name:--font-outfit) tracking-tight">
                <span className="text-gradient">Haber</span>
                <span className="text-foreground">Nexus</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1" id="navbar-desktop-nav">
              {categories.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  href={`/category/${item.slug}`}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                    pathname === `/category/${item.slug}`
                      ? "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <DynamicIcon name={item.icon} className="h-3.5 w-3.5" fallback={Newspaper} />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-muted transition-all duration-200",
                  "focus-ring cursor-pointer"
                )}
                aria-label="Ara"
                id="navbar-search-button"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Auth Buttons (Desktop) */}
              <div className="hidden sm:flex items-center gap-2 ml-2">
                {isPending ? (
                   <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
                ) : session ? (
                  <>
                    <Link href="/dashboard/profile" className="flex items-center gap-2 mr-2 group p-1 rounded-full hover:bg-muted transition-colors">
                      <Avatar src={session.user.image || undefined} fallback={session.user.name} size="sm" className="ring-2 ring-transparent group-hover:ring-primary-500 transition-all" />
                      <span className="text-sm font-medium hidden md:inline-block max-w-[120px] truncate text-foreground group-hover:text-primary-600 transition-colors">
                        {session.user.name.split(" ")[0]}
                      </span>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={async () => { await signOut(); window.location.reload(); }} id="navbar-logout-button">
                      Çıkış
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="ghost" size="sm" id="navbar-login-button">
                        Giriş Yap
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button variant="primary" size="sm" id="navbar-register-button">
                        Kayıt Ol
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={cn(
                  "lg:hidden h-10 w-10 rounded-xl flex items-center justify-center",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-muted transition-all duration-200",
                  "focus-ring cursor-pointer"
                )}
                aria-label="Menü"
                id="navbar-mobile-toggle"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar (Expandable) */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            isSearchOpen ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Haberlerde ara... (Enter'a basın)"
                className={cn(
                  "w-full h-12 rounded-xl border border-border bg-card pl-12 pr-4",
                  "text-sm text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                  "transition-all duration-200"
                )}
                autoFocus={isSearchOpen}
                id="navbar-search-input"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[calc(var(--z-sticky)-1)] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={cn(
          "fixed top-16 right-0 bottom-0 w-80 max-w-[85vw] z-(--z-sticky)",
          "bg-background border-l border-border shadow-2xl",
          "lg:hidden",
          "transition-transform duration-300 ease-out",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
        id="navbar-mobile-menu"
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Mobile Auth & Profile */}
          <div className="p-5 border-b border-border space-y-4">
            {isPending ? (
              <div className="h-16 w-full bg-muted animate-pulse rounded-2xl" />
            ) : session ? (
              <>
                {/* Profile Header */}
                <Link 
                  href="/dashboard/profile" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl hover:bg-muted/50 transition-colors border border-border/50"
                 >
                  <Avatar 
                    src={session.user.image || undefined} 
                    fallback={session.user.name} 
                    size="lg" 
                    className="ring-2 ring-primary-500/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{session.user.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1">
                      {session.user.role === "ADMIN" ? "🛡️ Admin" : session.user.role === "AUTHOR" ? "✍️ Yazar" : "👤 Okur"}
                    </p>
                  </div>
                </Link>

                {/* Simplified Quick Actions */}
                <div className="grid grid-cols-1 gap-2 pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2 h-10 px-4 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={async () => { 
                      await signOut(); 
                      setIsMobileMenuOpen(false); 
                      window.location.reload(); 
                    }}
                  >
                    🚪 Çıkış Yap
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 w-full">
                  <Link href="/login" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full h-11 rounded-xl">
                      Giriş Yap
                    </Button>
                  </Link>
                  <Link href="/register" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full h-11 rounded-xl">
                      Kayıt Ol
                    </Button>
                  </Link>
                </div>
                <p className="text-[10px] text-center text-muted-foreground">Kayıt olarak tüm haberlerden anında haberdar olabilirsiniz.</p>
              </div>
            )}
          </div>

          {/* Mobile Categories */}
          <nav className="p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
              Kategoriler
            </p>
            {categories.map((item) => (
                <Link
                  key={item.id}
                  href={`/category/${item.slug}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    pathname === `/category/${item.slug}`
                      ? "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <DynamicIcon name={item.icon} className="h-4 w-4" fallback={Newspaper} />
                  {item.name}
                </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
    </>
  );
}
