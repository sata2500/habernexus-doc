import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { confirmGuest } from "@/lib/server/newsletter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bülten onayı", robots: { index: false, follow: false } };

/** Çift onay: e-postadaki bağlantı yalnızca adresin sahibine ulaşır; tıklanınca abonelik başlar. */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await confirmGuest(token).catch(() => false) : false;
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-5">
        <span className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto ${ok ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
          {ok ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
        </span>
        <h1 className="text-2xl font-bold font-display">{ok ? "Aboneliğiniz onaylandı" : "Bağlantı geçersiz"}</h1>
        <p className="text-muted-foreground">
          {ok ? "Günlük Haber Nexus bülteni bundan sonra e-posta adresinize gönderilecek." : "Onay bağlantısı hatalı ya da süresi dolmuş. Bülten kutusundan yeniden abone olabilirsiniz."}
        </p>
        <Link href="/" className="inline-flex h-11 items-center px-6 rounded-xl bg-primary-600 text-white text-sm font-semibold">Ana sayfaya dön</Link>
      </Card>
    </div>
  );
}
