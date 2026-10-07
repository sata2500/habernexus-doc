"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, CopyCheck, Globe, Hash, Image as ImageIcon, Link2, Loader2, MonitorPlay, Palette, Save, Type } from "lucide-react";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { buildThemeCss, THEME_KEYS, type ThemeKey } from "@/lib/theme";
import { updateSiteSettings, type SiteSettingsInput } from "../actions";
import { Field, SectionTitle, TextArea, TextInput } from "./SettingsFields";
import { ThemeSection } from "./ThemeSection";

type Settings = { [K in keyof SiteSettingsInput]: string | null } & { siteName: string };

const THEME_DEFAULTS: Record<ThemeKey, string> = {
  primaryColorLight: "#6366f1", primaryColorDark: "#818cf8", accentLight: "#ea580c", accentDark: "#f97316",
  bgLight: "#fafbfc", bgDark: "#0b0f1a", fgLight: "#0f172a", fgDark: "#e8ecf4",
  cardLight: "#ffffff", cardDark: "#111827", cardFgLight: "#0f172a", cardFgDark: "#e8ecf4",
  sidebarBgLight: "#ffffff", sidebarBgDark: "#0a0a0a", sidebarFgLight: "#0f172a", sidebarFgDark: "#ffffff",
};

function toForm(s: Settings): SiteSettingsInput {
  const text = (v: string | null | undefined) => v ?? "";
  const theme = Object.fromEntries(THEME_KEYS.map((k) => [k, s[k] || THEME_DEFAULTS[k]])) as Record<ThemeKey, string>;
  return {
    siteName: s.siteName || "Haber Nexus",
    siteTagline: text(s.siteTagline),
    siteDescription: text(s.siteDescription),
    siteUrl: text(s.siteUrl),
    logoText: s.logoText || "N",
    logoUrl: text(s.logoUrl),
    faviconUrl: text(s.faviconUrl),
    keywords: text(s.keywords),
    socialTwitter: text(s.socialTwitter),
    socialInstagram: text(s.socialInstagram),
    socialYoutube: text(s.socialYoutube),
    socialGithub: text(s.socialGithub),
    footerCopyright: text(s.footerCopyright),
    ...theme,
  };
}

/** Site kimliği, SEO, sosyal bağlantılar ve tema ayarları */
export function SiteSettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState<SiteSettingsInput>(() => toForm(initialSettings));
  const [form, setForm] = useState<SiteSettingsInput>(saved);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  // Kaydedilmemiş değişiklikle sayfadan çıkarken uyar
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set = (field: keyof SiteSettingsInput) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setResult(null);
  };
  const setTheme = (next: Partial<Record<ThemeKey, string>>) => {
    setForm((prev) => ({ ...prev, ...next }));
    setResult(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await updateSiteSettings(form).catch(() => ({ success: false as const, error: "Sunucuya ulaşılamadı. Tekrar deneyin." }));
      if (res.success) {
        setSaved(form);
        setResult({ success: true, message: "Ayarlar kaydedildi; site sayfaları yenilendi." });
      } else {
        setResult({ success: false, message: res.error });
      }
    });
  };

  // Canlı önizleme: kaydedilmemiş tema renkleri yalnızca bu sayfaya uygulanır (sitedeki temayla aynı CSS)
  const previewCss = useMemo(() => buildThemeCss(form), [form]);
  const theme = Object.fromEntries(THEME_KEYS.map((k) => [k, form[k]])) as Record<ThemeKey, string>;
  const logoLetter = form.logoText?.charAt(0)?.toUpperCase() || "N";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <style dangerouslySetInnerHTML={{ __html: previewCss }} />

      <div className="bg-muted/30 border border-border rounded-2xl p-5 space-y-3" aria-label="Canlı önizleme">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Canlı önizleme</p>
        <div className="flex items-center gap-3">
          {form.logoUrl ? (
            <div className="h-10 w-10 relative rounded-xl overflow-hidden shadow-lg border border-border shrink-0">
              <Image src={form.logoUrl} alt="Logo" fill className="object-cover" sizes="40px" unoptimized />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shrink-0">
              <span className="text-white font-bold text-lg">{logoLetter}</span>
            </div>
          )}
          <div>
            <p className="font-bold text-lg leading-none"><span className="text-gradient">{form.siteName || "Site adı"}</span></p>
            {form.siteTagline && <p className="text-xs text-muted-foreground mt-0.5">{form.siteTagline}</p>}
          </div>
        </div>
        {form.footerCopyright && <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">{form.footerCopyright}</p>}
      </div>

      <section className="space-y-5">
        <SectionTitle icon={Globe}>Temel bilgiler</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Site adı" icon={Type} hint="Menüde, alt bilgide ve sayfa başlıklarında görünür">
            {(p) => <TextInput {...p} value={form.siteName} onChange={set("siteName")} placeholder="Haber Nexus" maxLength={60} required />}
          </Field>
          <Field label="Slogan" icon={Type} hint="Ana sayfa başlığında ve paylaşımlarda kullanılır">
            {(p) => <TextInput {...p} value={form.siteTagline} onChange={set("siteTagline")} placeholder="Yeni nesil haber platformu" maxLength={120} />}
          </Field>
          <Field label="Logo harfi" icon={Type} hint="Logo görseli yoksa logo kutusunda görünen tek harf">
            {(p) => <TextInput {...p} value={form.logoText} onChange={set("logoText")} placeholder="N" maxLength={1} />}
          </Field>
          <Field label="Site adresi" icon={Link2} hint="Kanonik adresler ve paylaşım bağlantıları için (https ile)">
            {(p) => <TextInput {...p} type="url" value={form.siteUrl} onChange={set("siteUrl")} placeholder="https://habernexus.com" />}
          </Field>
        </div>
        <Field label="SEO açıklaması" icon={Hash} hint="Arama sonuçlarında ve paylaşımlarda görünür; 140-160 karakter önerilir">
          {(p) => <TextArea {...p} value={form.siteDescription} onChange={set("siteDescription")} placeholder="Sitenizi tanımlayan kısa bir açıklama…" maxLength={500} />}
        </Field>
        <p className="text-xs text-muted-foreground -mt-3 text-right tabular-nums">{form.siteDescription.length} karakter</p>
        <Field label="Anahtar kelimeler" icon={Hash} hint="Virgülle ayırın: haber, gündem, son dakika">
          {(p) => <TextInput {...p} value={form.keywords} onChange={set("keywords")} placeholder="haber, gündem, son dakika" maxLength={500} />}
        </Field>
      </section>

      <section className="space-y-5">
        <SectionTitle icon={Link2}>Sosyal medya</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="X (Twitter)" icon={Link2}>{(p) => <TextInput {...p} type="url" value={form.socialTwitter} onChange={set("socialTwitter")} placeholder="https://x.com/hesabiniz" />}</Field>
          <Field label="Instagram" icon={Link2}>{(p) => <TextInput {...p} type="url" value={form.socialInstagram} onChange={set("socialInstagram")} placeholder="https://instagram.com/hesabiniz" />}</Field>
          <Field label="YouTube" icon={MonitorPlay}>{(p) => <TextInput {...p} type="url" value={form.socialYoutube} onChange={set("socialYoutube")} placeholder="https://youtube.com/@kanaliniz" />}</Field>
          <Field label="GitHub" icon={Link2}>{(p) => <TextInput {...p} type="url" value={form.socialGithub} onChange={set("socialGithub")} placeholder="https://github.com/hesabiniz" />}</Field>
        </div>
      </section>

      <section className="space-y-5">
        <SectionTitle icon={CopyCheck}>Alt bilgi</SectionTitle>
        <Field label="Telif metni" icon={CopyCheck} hint="Boş bırakılırsa otomatik oluşturulur">
          {(p) => <TextInput {...p} value={form.footerCopyright} onChange={set("footerCopyright")} maxLength={500} placeholder={`© ${new Date().getFullYear()} ${form.siteName || "Site adı"}. Tüm hakları saklıdır.`} />}
        </Field>
      </section>

      <section className="space-y-5">
        <SectionTitle icon={Palette}>Logo ve tema</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-1.5">
            <p className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="h-4 w-4 text-primary-500" aria-hidden="true" /> Logo görseli</p>
            <ImageUploader value={form.logoUrl} onChange={set("logoUrl")} type="article" aspectRatio="video" objectFit="contain" className="mt-2" />
            <p className="text-xs text-muted-foreground">Boş bırakılırsa harfli logo kullanılır.</p>
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="h-4 w-4 text-primary-500" aria-hidden="true" /> Site simgesi (favicon)</p>
            <ImageUploader value={form.faviconUrl} onChange={set("faviconUrl")} type="profile" aspectRatio="video" objectFit="contain" className="mt-2" />
            <p className="text-xs text-muted-foreground">Kare bir görsel seçin. Boş bırakılırsa varsayılan simge kullanılır.</p>
          </div>
        </div>
        <ThemeSection colors={theme} onChange={setTheme} />
      </section>

      {/* Kaydetme çubuğu altta sabit: uzun formda düğmeyi aramak gerekmez */}
      <div className="sticky bottom-0 z-10 -mx-1 px-1 py-3 bg-background/95 backdrop-blur border-t border-border flex flex-wrap items-center justify-end gap-3">
        <div aria-live="polite" className="mr-auto text-sm">
          {result ? (
            <span className={`flex items-center gap-2 font-medium ${result.success ? "text-success" : "text-error"}`}>
              {result.success ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {result.message}
            </span>
          ) : dirty ? (
            <span className="text-warning font-semibold">Kaydedilmemiş değişiklikler var</span>
          ) : null}
        </div>
        {dirty && (
          <button type="button" onClick={() => { setForm(saved); setResult(null); }} className="h-11 px-4 rounded-2xl border border-border text-sm font-semibold hover:bg-muted cursor-pointer">
            Vazgeç
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || !dirty}
          className="flex items-center gap-2 h-11 px-6 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-sm active:scale-95 shadow-lg shadow-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {isPending ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
        </button>
      </div>
    </form>
  );
}
