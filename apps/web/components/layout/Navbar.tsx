"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { LogOut, Menu, Newspaper, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import type { SiteSettings } from "@/lib/site-settings";

interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
}

const ROLE_LABEL: Record<string, string> = { ADMIN: "Yönetici", AUTHOR: "Yazar" };

export function Navbar({ categories = [], settings }: { categories?: Category[]; settings?: Partial<SiteSettings> }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { data: session, isPending } = useSession();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sayfa değişince menü ve arama kapanır
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  // Mobil menü açıkken: arka plan kaymaz, Esc ile kapanır (odak menü düğmesine döner)
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isMobileMenuOpen]);

  const siteName = settings?.siteName || "Haber Nexus";
  const logoText = settings?.logoText || "N";
  const [firstWord, ...rest] = siteName.split(" ");
  const restWords = rest.join(" ");

  const handleSignOut = async () => {
    await signOut();
    setIsMobileMenuOpen(false);
    router.refresh();
  };

  const categoryLink = (item: Category, mobile: boolean) => {
    const href = `/category/${item.slug}`;
    const active = pathname === href;
    return (
      <Link
        key={item.id}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center rounded-lg text-sm font-medium transition-colors duration-200",
          mobile ? "gap-3 px-3 py-2.5 rounded-xl" : "gap-2 px-3 py-2",
          active
            ? "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        <DynamicIcon name={item.icon} className={mobile ? "h-4 w-4" : "h-3.5 w-3.5"} fallback={Newspaper} />
        {item.name}
      </Link>
    );
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-(--z-sticky) transition-shadow duration-300",
          // Opak arka plan: kaydırılan içerik başlığın arkasından görünmesin
          "bg-background",
          isScrolled ? "shadow-lg border-b border-border/60" : "border-b border-transparent",
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group rounded-xl focus-ring" id="navbar-logo" aria-label={`${siteName} ana sayfa`}>
              {settings?.logoUrl ? (
                <div className="h-9 w-9 relative rounded-xl overflow-hidden group-hover:scale-105 transition-transform shrink-0 border border-border/50">
                  <Image src={settings.logoUrl} alt="" fill className="object-cover" sizes="36px" unoptimized />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform shrink-0" aria-hidden="true">
                  <span className="text-white font-bold text-lg font-(family-name:--font-outfit)">{logoText}</span>
                </div>
              )}
              <span className="text-xl font-bold font-(family-name:--font-outfit) tracking-tight">
                <span className="text-gradient">{firstWord}</span>
                {restWords && <span className="text-foreground"> {restWords}</span>}
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1" id="navbar-desktop-nav" aria-label="Kategoriler">
              {categories.slice(0, 6).map((item) => categoryLink(item, false))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSearchOpen((v) => !v)}
                className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 focus-ring cursor-pointer"
                aria-label={isSearchOpen ? "Aramayı kapat" : "Ara"}
                aria-expanded={isSearchOpen}
                aria-controls="navbar-search"
                id="navbar-search-button"
              >
                {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </button>

              <ThemeToggle />

              <div className="hidden sm:flex items-center gap-2 ml-2">
                {isPending ? (
                  <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
                ) : session ? (
                  <>
                    <Link href="/dashboard/profile" className="flex items-center gap-2 mr-2 group p-1 rounded-full hover:bg-muted transition-colors focus-ring" aria-label="Profilim">
                      <Avatar src={session.user.image || undefined} fallback={session.user.name} size="sm" className="ring-2 ring-transparent group-hover:ring-primary-500 transition-all" />
                      <span className="text-sm font-medium hidden md:inline-block max-w-[120px] truncate text-foreground group-hover:text-primary-600 transition-colors">
                        {session.user.name.split(" ")[0]}
                      </span>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={handleSignOut} id="navbar-logout-button">
                      Çıkış
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })} id="navbar-login-button">
                      Giriş Yap
                    </Link>
                    <Link href="/register" className={buttonVariants({ size: "sm" })} id="navbar-register-button">
                      Kayıt Ol
                    </Link>
                  </>
                )}
              </div>

              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="lg:hidden h-11 w-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 focus-ring cursor-pointer"
                aria-label={isMobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="navbar-mobile-menu"
                id="navbar-mobile-toggle"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Arama: yükseklik CSS grid ile açılır; JavaScript olmadan da /search'e gönderir */}
        <div
          id="navbar-search"
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
            isSearchOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
          inert={!isSearchOpen}
        >
          <div className="overflow-hidden">
            <form
              action="/search"
              role="search"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-4"
              onSubmit={(e) => {
                const q = searchInputRef.current?.value.trim();
                if (!q) e.preventDefault();
              }}
            >
              <label htmlFor="navbar-search-input" className="sr-only">Haberlerde ara</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  name="q"
                  enterKeyHint="search"
                  placeholder="Haberlerde ara…"
                  className="w-full h-12 rounded-xl border border-border bg-card pl-12 pr-4 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  id="navbar-search-input"
                />
              </div>
            </form>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/30 z-[calc(var(--z-sticky)-1)] lg:hidden animate-in fade-in duration-200" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
      )}

      <div
        className={cn(
          "fixed top-16 right-0 bottom-0 w-80 max-w-[85vw] z-(--z-sticky)",
          "bg-background border-l border-border lg:hidden",
          "transition-[transform,visibility] duration-300 ease-out",
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "translate-x-full invisible",
        )}
        id="navbar-mobile-menu"
        inert={!isMobileMenuOpen}
        aria-label="Site menüsü"
      >
        <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
          <div className="p-5 border-b border-border space-y-4">
            {isPending ? (
              <div className="h-16 w-full bg-muted animate-pulse rounded-2xl" />
            ) : session ? (
              <>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl hover:bg-muted/50 transition-colors border border-border/50"
                >
                  <Avatar src={session.user.image || undefined} fallback={session.user.name} size="lg" className="ring-2 ring-primary-500/20" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{session.user.name}</p>
                    <p className="text-[11px] text-muted-foreground font-semibold">
                      {ROLE_LABEL[session.user.role as string] ?? "Okur"} · Profilim
                    </p>
                  </div>
                </Link>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-10 px-4 rounded-xl text-muted-foreground hover:text-foreground" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Çıkış Yap
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 w-full">
                  <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm", className: "flex-1 h-11 rounded-xl" })}>
                    Giriş Yap
                  </Link>
                  <Link href="/register" className={buttonVariants({ size: "sm", className: "flex-1 h-11 rounded-xl" })}>
                    Kayıt Ol
                  </Link>
                </div>
                <p className="text-xs text-center text-muted-foreground">Üye olun; okuduklarınızı kaydedin, size uygun haberleri görün.</p>
              </div>
            )}
          </div>

          <nav className="p-4 space-y-1" aria-label="Kategoriler">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">Kategoriler</p>
            {categories.map((item) => categoryLink(item, true))}
          </nav>
        </div>
      </div>

      {/* Sabit başlığın altında içerik için boşluk */}
      <div className="h-16" />
    </>
  );
}
