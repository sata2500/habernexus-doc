import Link from "next/link";
import { ArrowRight, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { UnsubscribeConfirm } from "./UnsubscribeConfirm";

export const metadata = { title: "Bülten aboneliği", robots: { index: false, follow: false } };

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string; u?: string; s?: string }>;
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token, u, s } = await searchParams;
  const valid = !!token || (!!u && !!s);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {valid ? (
          <UnsubscribeConfirm token={token} userId={u} sig={s} />
        ) : (
          <div className="space-y-5">
            <span className="h-16 w-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto"><XCircle className="h-8 w-8" /></span>
            <h1 className="text-2xl font-bold font-display">Geçersiz bağlantı</h1>
            <p className="text-muted-foreground">Abonelikten çıkma bağlantısı eksik ya da hatalı. Lütfen e-postanızdaki bağlantıyı kullanın.</p>
            <Link href="/" className="inline-flex items-center gap-2 text-primary-500 font-medium hover:underline">Ana sayfaya dön <ArrowRight className="h-4 w-4" /></Link>
          </div>
        )}
      </Card>
    </div>
  );
}
