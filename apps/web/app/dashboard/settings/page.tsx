import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NewsletterToggle } from "../components/NewsletterToggle";
import { DeleteAccountButton } from "../components/DeleteAccountButton";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch current database state to ensure accuracy
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { newsletterSubscribed: true, newsletterTime: true }
  });

  const isSubscribed = user?.newsletterSubscribed ?? true;
  const newsletterTime = user?.newsletterTime ?? "08:00";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Tercihler</h1>
        <p className="text-muted-foreground text-sm">Haber Nexus okuma deneyiminizi kişiselleştirin.</p>
      </div>

      <Card className="p-6 md:p-8">
        <div className="space-y-8">
          
          {/* Theme Selection */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <h3 className="font-semibold text-foreground">Tema Seçimi</h3>
              <p className="text-sm text-muted-foreground mt-1">Uygulama arayüzünün karanlık veya aydınlık olmasını seçin.</p>
            </div>
            <div className="p-2 border border-border rounded-xl bg-muted/50">
               <ThemeToggle />
            </div>
          </div>

          {/* Newsletter Toggle */}
          <NewsletterToggle initialSubscribed={isSubscribed} initialTime={newsletterTime} />

          {/* Danger Zone */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div>
              <h3 className="font-semibold text-red-600 dark:text-red-400">Hesabı Sil</h3>
              <p className="text-sm text-muted-foreground mt-1">Tüm verilerinizi, yorumlarınızı ve kaydedilenlerinizi kalıcı olarak siler.</p>
            </div>
            <DeleteAccountButton />
          </div>

        </div>
      </Card>
    </div>
  );
}
