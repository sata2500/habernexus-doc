"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Bookmark, Settings, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Profilim", href: "/dashboard/profile", icon: User },
  { name: "Yorumlarım", href: "/dashboard/comments", icon: MessageSquare },
  { name: "Kaydedilenler", href: "/dashboard/bookmarks", icon: Bookmark },
  { name: "Tercihler", href: "/dashboard/settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 outline-none cursor-pointer focus-ring",
              isActive
                ? "bg-primary-500 text-white dark:bg-primary-500/15 dark:text-primary-400 border border-primary-500/10"
                : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
            )}
          >
            <Icon className={cn("h-4 w-4 transition-transform duration-200", isActive && "scale-110")} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
