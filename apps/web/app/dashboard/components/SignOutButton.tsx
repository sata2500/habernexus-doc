"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-3 w-full px-2 py-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer"
    >
      <LogOut className="h-4 w-4" />
      Güvenli Çıkış
    </button>
  );
}
