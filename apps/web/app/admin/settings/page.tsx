import { getAdminSiteSettings } from "./actions";
import { SiteSettingsForm } from "./components/SiteSettingsForm";
import { Settings2, Palette, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getAdminSiteSettings();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-(family-name:--font-outfit) flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
            <Settings2 className="h-6 w-6 text-indigo-500" />
          </div>
          Site Ayarları
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Platform adı, logo, slogan, SEO bilgileri ve sosyal medya hesaplarını buradan yönetin.
          Değişiklikler kaydedildiğinde tüm sayfalar anında güncellenir.
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-strong rounded-2xl p-5 border border-border shadow-soft flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">SEO Etkisi</p>
            <p className="text-sm text-foreground">Platform adı ve açıklama tüm meta etiketlere otomatik yansır.</p>
          </div>
        </div>
        <div className="glass-strong rounded-2xl p-5 border border-border shadow-soft flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Anlık Güncelleme</p>
            <p className="text-sm text-foreground">Kayıt sonrası Navbar, Footer ve tüm sayfalar otomatik güncellenir.</p>
          </div>
        </div>
        <div className="glass-strong rounded-2xl p-5 border border-border shadow-soft flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Vercel Uyumlu</p>
            <p className="text-sm text-foreground">Ayarlar veritabanında saklanır, env var değişikliği gerekmez.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-neutral-950 rounded-3xl border border-border shadow-soft p-6 md:p-8">
        <SiteSettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
