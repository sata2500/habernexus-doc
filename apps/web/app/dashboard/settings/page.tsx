import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/authz";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NewsletterToggle } from "../components/NewsletterToggle";
import { DeleteAccountButton } from "../components/DeleteAccountButton";
import { ChangePasswordForm } from "../components/ChangePasswordForm";

export const metadata = { title: "Tercihler" };

export default async function SettingsPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login?callbackUrl=/dashboard/settings");

  const [user, credential] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { newsletterSubscribed: true, newsletterTime: true } }),
    // Şifre değiştirme yalnızca e-posta/şifre ile kayıtlı hesaplarda (Google hesaplarının şifresi yok)
    prisma.account.findFirst({ where: { userId: session.user.id, providerId: "credential" }, select: { id: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Tercihler</h1>
        <p className="text-muted-foreground text-sm">Görünüm, bülten ve hesap ayarlarınız.</p>
      </div>

      <Card className="p-6 md:p-8">
        <div className="space-y-8">
          <section className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <h2 className="font-semibold text-foreground">Tema</h2>
              <p className="text-sm text-muted-foreground mt-1">Açık, koyu ya da cihazınızın ayarına göre.</p>
            </div>
            <div className="w-full lg:w-auto lg:min-w-72">
              <ThemeToggle variant="segmented" />
            </div>
          </section>

          {/* Bülten yalnızca açık onayla: kayıt yoksa kapalı sayılır */}
          <NewsletterToggle initialSubscribed={user?.newsletterSubscribed ?? false} initialTime={user?.newsletterTime ?? "08:00"} />

          <section className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-6 border-b border-border">
            <div>
              <h2 className="font-semibold text-foreground">Şifre</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                {credential
                  ? "Şifrenizi değiştirdiğinizde diğer cihazlardaki oturumlar kapatılır."
                  : "Bu hesap Google ile açıldı; giriş Google hesabınızla yapılır."}
              </p>
            </div>
            {credential ? <ChangePasswordForm /> : null}
          </section>

          <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-error">Hesabı sil</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Hesabınız, yorumlarınız, kaydettikleriniz ve okuma geçmişiniz kalıcı olarak silinir.{" "}
                <Link href="/privacy" className="underline hover:text-foreground">Gizlilik</Link>
              </p>
            </div>
            <DeleteAccountButton />
          </section>
        </div>
      </Card>
    </div>
  );
}
