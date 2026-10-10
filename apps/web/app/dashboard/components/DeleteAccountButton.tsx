"use client";

import { confirmDialog, toast } from "@/components/ui/feedback";

import { useState } from "react";

import { deleteAccount } from "../actions";
import { Loader2 } from "lucide-react";

export function DeleteAccountButton() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    const ok = await confirmDialog({
      title: "Hesabınız silinsin mi?",
      message: "Hesabınız; yorumlarınız, kaydettikleriniz ve okuma geçmişinizle birlikte kalıcı olarak silinir. Bu işlem geri alınamaz.",
      confirmText: "Hesabımı sil",
      tone: "danger",
      requireText: "SİL",
    });
    if (!ok) return;

    setIsDeleting(true);
    const result = await deleteAccount().catch(() => ({ success: false as const, error: "Bağlantı kurulamadı." }));

    if (result.success) {
      // Oturum sunucuda silindi; tam sayfa yenilemesiyle tarayıcıdaki oturum bilgisi de temizlenir
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- istemci yönlendirmesi oturum önbelleğini temizlemez
      window.location.assign("/");
    } else {
      toast.error(result.error);
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDeleteAccount}
      disabled={isDeleting}
      className="shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-error border border-error/30 hover:bg-error/10 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 flex items-center gap-2"
    >
      {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Siliniyor…</> : "Hesabımı kalıcı olarak sil"}
    </button>
  );
}
