import { Megaphone, Mail } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Reklam ve Sponsorluk",
};

export default function AdvertisePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit)">
          Reklam ve Sponsorluk
        </h1>
        <p className="text-lg text-muted-foreground">
          Hedef kitlenize en etkili şekilde ulaşmak için Haber Nexus’un özgün dijital vizyonunu ve geniş okuyucu havuzunu kullanın.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <Card className="p-8">
           <Megaphone className="h-10 w-10 text-primary-500 mb-6" />
           <h3 className="text-2xl font-bold mb-4 font-(family-name:--font-outfit)">Neden Haber Nexus?</h3>
           <ul className="space-y-3 text-muted-foreground">
             <li className="flex items-start gap-2">
               <span className="h-1.5 w-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
               Aylık yüz binlerce organik ziyaretçiye ve çok yüksek sayfa okuma oranlarına sahibiz.
             </li>
             <li className="flex items-start gap-2">
               <span className="h-1.5 w-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
               Modern ve kullanıcı dostu arayüz sayesinde reklamlarınız &quot;Görünmezlik Algısına&quot; takılmaz, akış ile bütünleşik gösterilir.
             </li>
             <li className="flex items-start gap-2">
               <span className="h-1.5 w-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
               Advertorial (özel içerik/röportaj) çalışmaları ile markanızı, okuyucunun aradığı güven ile doğrudan hikayeleştiriyoruz.
             </li>
           </ul>
        </Card>

        <Card className="p-8 bg-primary-50/50 dark:bg-primary-900/10 border-primary-500/20">
           <Mail className="h-10 w-10 text-primary-500 mb-6" />
           <h3 className="text-2xl font-bold mb-4 font-(family-name:--font-outfit)">Bize Ulaşın</h3>
           <p className="text-muted-foreground mb-6">
             Banner reklam alanları, sponsorlu köşe yazıları, sosyal medya kampanyaları ve daha birçok dijital partnerlik seçeneği için reklam satış departmanımıza doğrudan ulaşabilirsiniz.
           </p>
           
           <div className="space-y-4">
             <div className="p-4 bg-background rounded-xl border border-border">
               <p className="text-sm text-muted-foreground mb-1">Kurumsal Reklam İletişimi</p>
               <a href="mailto:reklam@habernexus.com" className="text-lg font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                 reklam@habernexus.com
               </a>
             </div>
           </div>
        </Card>
      </div>
    </div>
  );
}
