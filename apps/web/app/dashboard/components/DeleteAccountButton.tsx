"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteAccount } from "../actions";
import { Loader2 } from "lucide-react";

export function DeleteAccountButton() {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDeleteAccount = async () => {
    if (!confirm("Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz (makaleler, yorumlar, kaydedilenler) silinecektir.")) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteAccount();

    if (result.success) {
            router.push("/");

    } else {
      alert(result.error || "Hesap silinirken bir hata oluştu.");
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDeleteAccount}
      disabled={isDeleting}
      className="px-4 py-2 rounded-xl text-primary-600 border border-primary-200 dark:border-primary-900/50 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 flex items-center gap-2"
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hesabımı Kalıcı Olarak Sil"}
    </button>
  );
}
