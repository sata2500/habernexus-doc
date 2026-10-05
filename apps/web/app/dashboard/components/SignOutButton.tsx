"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth-client";

export function SignOutButton({ className, label = "Güvenli Çıkış" }: { className?: string; label?: string }) {
  const router = useRouter();

  const handleSignOut = async () => {

    await signOut();
    router.push("/login");
  };

  return (
    <button
      onClick={handleSignOut}
      className={className || "flex items-center gap-3 w-full px-2 py-2 text-sm font-medium text-error hover:text-error transition-colors cursor-pointer"}
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}
