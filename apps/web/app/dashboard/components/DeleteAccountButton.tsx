"use client";

import { useState } from "react";

import { deleteAccount } from "../actions";
import { Loader2 } from "lucide-react";

export function DeleteAccountButton() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    const answer = window.prompt("Hesabınız ve yorumlarınız, kaydettikleriniz, okuma geçmişiniz kalıcı olarak silinecek. Bu işlem geri alınamaz.\n\nOnaylamak için SİL yazın:");
    if (answer?.trim().toLocaleUpperCase("tr") !== "SİL") return;

    setIsDeleting(true);
    const result = await deleteAccount().catch(() => ({ success: false as const, error: "Bağlantı kurulamadı." }));

    if (result.success) {
      // Oturum sunucuda silindi; tam sayfa yenilemesiyle tarayıcıdaki oturum bilgisi de temizlenir
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- istemci yönlendirmesi oturum önbelleğini temizlemez
      window.location.assign("/");
    } else {
      alert(result.error);
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDeleteAccount}
      disabled={isDeleting}
      className="px-4 py-2 rounded-xl text-error border border-error/30 hover:bg-error/10 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 flex items-center gap-2"
    >
      {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Siliniyor…</> : "Hesabımı kalıcı olarak sil"}
    </button>
  );
}
