import { unsubscribeByToken } from "@/app/actions/newsletter";
import { Card } from "@/components/ui/Card";
import { CheckCircle2, XCircle, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="h-16 w-16 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Geçersiz İşlem</h1>
          <p className="text-muted-foreground leading-relaxed">
            Abonelikten çıkmak için kullanılan bağlantı geçersiz veya eksik. Lütfen e-postanızdaki bağlantıyı kontrol edin.
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-primary-500 font-medium hover:underline"
          >
            Anasayfaya Dön <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    );
  }

  const result = await unsubscribeByToken(token);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="space-y-6">
          {result.success ? (
            <>
              <div className="h-16 w-16 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Abonelik İptal Edildi</h1>
              <p className="text-muted-foreground leading-relaxed">
                Artık günlük bülten e-postalarını almayacaksınız. Sizi aramızda tekrar görmeyi umuyoruz.
              </p>
            </>
          ) : (
            <>
              <div className="h-16 w-16 bg-orange-500/10 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Bir Sorun Oluştu</h1>
              <p className="text-muted-foreground leading-relaxed">
                {result.error || "Abonelik iptali sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin."}
              </p>
            </>
          )}

          <div className="pt-6 border-t border-border">
            <Link 
              href="/" 
              className="inline-flex h-11 items-center justify-center px-6 rounded-xl bg-gradient-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Haberleri Okumaya Devam Et
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
