"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { deleteAccount } from "../actions";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!confirm("Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz (makaleler, yorumlar, kaydedilenler) silinecektir.")) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteAccount();

    if (result.success) {
      // Sayfayı yenilemek veya ana sayfaya yönlendirmek oturumu sonlandıracaktır (cookie DB'den silindiği için)
      window.location.href = "/";
    } else {
      alert(result.error || "Hesap silinirken bir hata oluştu.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Tercihler</h1>
        <p className="text-muted-foreground text-sm">Haber Nexus okuma deneyiminizi kişiselleştirin.</p>
      </div>

      <Card className="p-6 md:p-8">
        <div className="space-y-8">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <h3 className="font-semibold text-foreground">Tema Seçimi</h3>
              <p className="text-sm text-muted-foreground mt-1">Uygulama arayüzünün karanlık veya aydınlık olmasını seçin.</p>
            </div>
            <div className="p-2 border border-border rounded-xl bg-muted/50">
               <ThemeToggle />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <h3 className="font-semibold text-foreground">E-posta Bildirimleri</h3>
              <p className="text-sm text-muted-foreground mt-1">Önemli son dakika haberlerini mail ile alın.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/30 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:inset-s-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div>
              <h3 className="font-semibold text-red-600 dark:text-red-400">Hesabı Sil</h3>
              <p className="text-sm text-muted-foreground mt-1">Tüm verilerinizi, yorumlarınızı ve kaydedilenlerinizi kalıcı olarak siler.</p>
            </div>
              <button 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hesabımı Kalıcı Olarak Sil"}
              </button>
          </div>

        </div>
      </Card>
    </div>
  );
}
