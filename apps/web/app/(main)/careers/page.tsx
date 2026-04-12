import { Briefcase, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Kariyer",
  description: "Haber Nexus ekibine katılın.",
};

export default function CareersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit)">
          Bizimle Çalışın
        </h1>
        <p className="text-lg text-muted-foreground">
          Dijital medyayı yeniden şekillendiren yetenekli, genç ve dinamik Haber Nexus ekibine katılmak ister misiniz?
        </p>
      </div>

      <div className="max-w-3xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center justify-center p-6 rounded-full bg-primary-500/10 text-primary-600 mb-4">
          <Briefcase className="h-12 w-12" />
        </div>
        
        <h2 className="text-2xl font-bold font-(family-name:--font-outfit)">Şu An Açık Pozisyon Bulunmuyor</h2>
        <p className="text-muted-foreground">
          Şu anda aktif bir eşleşme veya iş ilanı yayınlamıyoruz. Ancak yetenekli editörler, haber muhabirleri ve yazılım geliştiriciler ile tanışmaktan her zaman memnuniyet duyarız.
        </p>

        <Card className="bg-muted text-left p-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg mb-1">Genel Başvuru</h3>
            <p className="text-sm text-muted-foreground text-pretty">Bizimle potansiyel olarak ilgileniyorsanız, CV&apos;nizi genel başvuru havuzumuza gönderebilirsiniz.</p>
          </div>
          <a href="mailto:ik@habernexus.com" className="shrink-0 flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-medium">
            CV Gönder <ArrowRight className="h-4 w-4" />
          </a>
        </Card>
      </div>
    </div>
  );
}
