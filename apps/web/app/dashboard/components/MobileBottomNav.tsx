"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Bookmark, Settings, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { name: "Ana Sayfa", href: "/", icon: Home },
  { name: "Profilim", href: "/dashboard/profile", icon: User },
  { name: "Yorumlarım", href: "/dashboard/comments", icon: MessageSquare },
  { name: "Kaydedilenler", href: "/dashboard/bookmarks", icon: Bookmark },
  { name: "Tercihler", href: "/dashboard/settings", icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 dark:bg-card/95 backdrop-blur-md border-t border-border/40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <nav className="flex justify-around items-center max-w-lg mx-auto">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 cursor-pointer select-none outline-none",
                isActive
                  ? "text-primary-500 dark:text-primary-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} />
              <span className="text-[10px] font-bold mt-1 tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
