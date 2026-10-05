"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Bookmark, Settings, MessageSquare, History } from "lucide-react";
import { cn } from "@/lib/utils";

// Kısa, tek satırlık etiketler: 6 sekme 320px ekrana da sığar
const bottomNavItems = [
  { name: "Ana sayfa", href: "/", icon: Home },
  { name: "Profil", href: "/dashboard/profile", icon: User },
  { name: "Okunan", href: "/dashboard/history", icon: History },
  { name: "Yorumlar", href: "/dashboard/comments", icon: MessageSquare },
  { name: "Kayıtlı", href: "/dashboard/bookmarks", icon: Bookmark },
  { name: "Ayarlar", href: "/dashboard/settings", icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
      <nav aria-label="Panel menüsü" className="grid grid-cols-6 max-w-lg mx-auto">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-h-12 px-1 rounded-xl transition-colors duration-200 cursor-pointer select-none focus-ring",
                isActive
                  ? "text-primary-500 dark:text-primary-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("flex items-center justify-center h-7 w-11 rounded-full transition-colors", isActive && "bg-primary-500/12")}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-semibold leading-none whitespace-nowrap">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
