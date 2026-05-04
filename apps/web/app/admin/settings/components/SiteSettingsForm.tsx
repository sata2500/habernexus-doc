"use client";

import { useState, useTransition } from "react";
import { updateSiteSettings, type SiteSettingsInput } from "../actions";
import { ImageUploader } from "@/components/ui/ImageUploader";
import {
  Globe,
  Palette,
  Type,
  Hash,
  Link2,
  Link2 as Twitter,
  Link2 as Instagram,
  MonitorPlay as Youtube,
  Link2 as Github,
  CopyCheck,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";

interface SiteSettings {
  siteName: string;
  siteTagline: string | null;
  siteDescription: string | null;
  siteUrl: string | null;
  logoText: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColorLight: string | null;
  primaryColorDark: string | null;
  bgLight: string | null;
  bgDark: string | null;
  fgLight: string | null;
  fgDark: string | null;
  cardLight: string | null;
  cardDark: string | null;
  cardFgLight: string | null;
  cardFgDark: string | null;
  accentLight: string | null;
  accentDark: string | null;
  keywords: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
  socialYoutube: string | null;
  socialGithub: string | null;
  footerCopyright: string | null;
}

interface SiteSettingsFormProps {
  initialSettings: SiteSettings;
}

function FieldGroup({ label, icon: Icon, children, hint }: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary-500" />
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
          <Info className="h-3 w-3 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, maxLength }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full h-11 rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
    />
  );
}

export function SiteSettingsForm({ initialSettings }: SiteSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const [form, setForm] = useState<SiteSettingsInput>({
    siteName: initialSettings.siteName || "Haber Nexus",
    siteTagline: initialSettings.siteTagline || "",
    siteDescription: initialSettings.siteDescription || "",
    siteUrl: initialSettings.siteUrl || "",
    logoText: initialSettings.logoText || "N",
    logoUrl: initialSettings.logoUrl || "",
    faviconUrl: initialSettings.faviconUrl || "",
    primaryColorLight: initialSettings.primaryColorLight || "#6366f1",
    primaryColorDark: initialSettings.primaryColorDark || "#818cf8",
    bgLight: initialSettings.bgLight || "#fafbfc",
    bgDark: initialSettings.bgDark || "#0b0f1a",
    fgLight: initialSettings.fgLight || "#0f172a",
    fgDark: initialSettings.fgDark || "#e8ecf4",
    cardLight: initialSettings.cardLight || "#ffffff",
    cardDark: initialSettings.cardDark || "#111827",
    cardFgLight: initialSettings.cardFgLight || "#0f172a",
    cardFgDark: initialSettings.cardFgDark || "#e8ecf4",
    accentLight: initialSettings.accentLight || "#ea580c",
    accentDark: initialSettings.accentDark || "#f97316",
    keywords: initialSettings.keywords || "",
    socialTwitter: initialSettings.socialTwitter || "",
    socialInstagram: initialSettings.socialInstagram || "",
    socialYoutube: initialSettings.socialYoutube || "",
    socialGithub: initialSettings.socialGithub || "",
    footerCopyright: initialSettings.footerCopyright || "",
  });

  const set = (field: keyof SiteSettingsInput) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setResult(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      try {
        await updateSiteSettings(form);
        setResult({ success: true, message: "Ayarlar başarıyla kaydedildi! Tüm sayfalar yenilendi." });
      } catch {
        setResult({ success: false, message: "Bir hata oluştu. Lütfen tekrar deneyin." });
      }
    });
  };

  // Live preview logo letter
  const logoLetter = form.logoText?.charAt(0)?.toUpperCase() || "N";
  const previewName = form.siteName || "Site Adı";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Live Preview */}
      <div className="bg-muted/30 border border-border rounded-2xl p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Canlı Önizleme</p>
        <div className="flex items-center gap-3">
          {form.logoUrl ? (
            <div className="h-10 w-10 relative rounded-xl overflow-hidden shadow-lg border border-border flex shrink-0">
               <img src={form.logoUrl} alt="Logo" className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shrink-0" style={{ backgroundColor: form.primaryColorLight }}>
              <span className="text-white font-bold text-lg">{logoLetter}</span>
            </div>
          )}
          <div>
            <p className="font-bold text-lg leading-none">{previewName}</p>
            {form.siteTagline && (
              <p className="text-xs text-muted-foreground mt-0.5">{form.siteTagline}</p>
            )}
          </div>
        </div>
        {form.footerCopyright && (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
            {form.footerCopyright}
          </p>
        )}
      </div>

      {/* Temel Bilgiler */}
      <section className="space-y-5">
        <h3 className="text-base font-bold font-(family-name:--font-outfit) flex items-center gap-2 border-b border-border pb-3">
          <Globe className="h-4 w-4 text-primary-500" />
          Temel Platform Bilgileri
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FieldGroup
            label="Platform Adı"
            icon={Type}
            hint="Navbar, footer ve SEO başlıklarında görünür"
          >
            <TextInput
              value={form.siteName}
              onChange={set("siteName")}
              placeholder="Haber Nexus"
              maxLength={60}
            />
          </FieldGroup>

          <FieldGroup
            label="Slogan"
            icon={Type}
            hint="Footer ve meta açıklamada kullanılır"
          >
            <TextInput
              value={form.siteTagline}
              onChange={set("siteTagline")}
              placeholder="Yeni Nesil Haber Platformu"
              maxLength={100}
            />
          </FieldGroup>

          <FieldGroup
            label="Logo Baş Harfi"
            icon={Type}
            hint="Navbar ve footer'daki logo kutusunda görünür (tek harf)"
          >
            <TextInput
              value={form.logoText}
              onChange={set("logoText")}
              placeholder="N"
              maxLength={1}
            />
          </FieldGroup>

          <FieldGroup
            label="Site URL"
            icon={Link2}
            hint="Canonical URL, OpenGraph ve SEO için"
          >
            <TextInput
              value={form.siteUrl}
              onChange={set("siteUrl")}
              placeholder="https://habernexus.com"
            />
          </FieldGroup>
        </div>

        <FieldGroup
          label="SEO Açıklaması"
          icon={Hash}
          hint="Arama motorlarında ve sosyal medya paylaşımlarında gösterilen açıklama (max 160 karakter önerilir)"
        >
          <TextArea
            value={form.siteDescription}
            onChange={set("siteDescription")}
            placeholder="Platformunuzu tanımlayan kısa ve etkili bir açıklama..."
            rows={3}
          />
        </FieldGroup>

        <FieldGroup
          label="SEO Anahtar Kelimeler"
          icon={Hash}
          hint="Virgülle ayırın: haber,gündem,son dakika"
        >
          <TextInput
            value={form.keywords}
            onChange={set("keywords")}
            placeholder="haber,gündem,son dakika,analiz"
          />
        </FieldGroup>
      </section>

      {/* Sosyal Medya */}
      <section className="space-y-5">
        <h3 className="text-base font-bold font-(family-name:--font-outfit) flex items-center gap-2 border-b border-border pb-3">
          <Link2 className="h-4 w-4 text-primary-500" />
          Sosyal Medya Linkleri
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FieldGroup label="X (Twitter)" icon={Twitter}>
            <TextInput
              value={form.socialTwitter}
              onChange={set("socialTwitter")}
              placeholder="https://twitter.com/kullaniciadiniz"
            />
          </FieldGroup>
          <FieldGroup label="Instagram" icon={Instagram}>
            <TextInput
              value={form.socialInstagram}
              onChange={set("socialInstagram")}
              placeholder="https://instagram.com/kullaniciadiniz"
            />
          </FieldGroup>
          <FieldGroup label="YouTube" icon={Youtube}>
            <TextInput
              value={form.socialYoutube}
              onChange={set("socialYoutube")}
              placeholder="https://youtube.com/@kanaliniz"
            />
          </FieldGroup>
          <FieldGroup label="GitHub" icon={Github}>
            <TextInput
              value={form.socialGithub}
              onChange={set("socialGithub")}
              placeholder="https://github.com/kullaniciadiniz"
            />
          </FieldGroup>
        </div>
      </section>

      {/* Footer */}
      <section className="space-y-5">
        <h3 className="text-base font-bold font-(family-name:--font-outfit) flex items-center gap-2 border-b border-border pb-3">
          <CopyCheck className="h-4 w-4 text-primary-500" />
          Footer Ayarları
        </h3>
        <FieldGroup
          label="Copyright Metni"
          icon={CopyCheck}
          hint="Boş bırakırsanız otomatik oluşturulur: © 2026 [Platform Adı]. Tüm hakları saklıdır."
        >
          <TextInput
            value={form.footerCopyright}
            onChange={set("footerCopyright")}
            placeholder={`© ${new Date().getFullYear()} ${form.siteName || "Platform Adı"}. Tüm hakları saklıdır.`}
          />
        </FieldGroup>
      </section>

      {/* Medya ve Marka Görselleri */}
      <section className="space-y-5">
        <h3 className="text-base font-bold font-(family-name:--font-outfit) flex items-center gap-2 border-b border-border pb-3">
          <Palette className="h-4 w-4 text-primary-500" />
          Medya ve Tema Renkleri
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FieldGroup
            label="Platform Logosu (Resim)"
            icon={Link2}
            hint="Boş bırakırsanız harfli ikon (text) kullanılır. Vercel Blob ile yüklenir."
          >
            <ImageUploader
              value={form.logoUrl}
              onChange={set("logoUrl")}
              type="article"
              aspectRatio="video"
              className="mt-2"
            />
          </FieldGroup>
          <FieldGroup
            label="Favicon"
            icon={Link2}
            hint="Tarayıcı sekmesinde görünen ikon (Kare). Boş bırakılırsa varsayılan svg kullanılır."
          >
            <ImageUploader
              value={form.faviconUrl}
              onChange={set("faviconUrl")}
              type="profile"
              aspectRatio="square"
              className="mt-2"
            />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border pt-6 mt-6">
          {/* Açık Tema Grubu */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              Açık Tema (Light Mode) Renkleri
            </h4>
            
            <FieldGroup label="Ana (Primary) Renk" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.primaryColorLight} onChange={(e) => set("primaryColorLight")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.primaryColorLight} onChange={set("primaryColorLight")} placeholder="#6366f1" maxLength={7} />
              </div>
            </FieldGroup>
            <FieldGroup label="Vurgu (Accent) Renk" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.accentLight} onChange={(e) => set("accentLight")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.accentLight} onChange={set("accentLight")} placeholder="#ea580c" maxLength={7} />
              </div>
            </FieldGroup>
            <FieldGroup label="Genel Arka Plan (Background)" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.bgLight} onChange={(e) => set("bgLight")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.bgLight} onChange={set("bgLight")} placeholder="#fafbfc" maxLength={7} />
              </div>
            </FieldGroup>
            <FieldGroup label="Genel Metin Rengi (Foreground)" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.fgLight} onChange={(e) => set("fgLight")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.fgLight} onChange={set("fgLight")} placeholder="#0f172a" maxLength={7} />
              </div>
            </FieldGroup>
            <FieldGroup label="Panel/Kart Arka Planı" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.cardLight} onChange={(e) => set("cardLight")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.cardLight} onChange={set("cardLight")} placeholder="#ffffff" maxLength={7} />
              </div>
            </FieldGroup>
            <FieldGroup label="Panel/Kart Metin Rengi" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.cardFgLight} onChange={(e) => set("cardFgLight")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.cardFgLight} onChange={set("cardFgLight")} placeholder="#0f172a" maxLength={7} />
              </div>
            </FieldGroup>
          </div>

          {/* Koyu Tema Grubu */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
              Koyu Tema (Dark Mode) Renkleri
            </h4>
            
            <FieldGroup label="Ana (Primary) Renk" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.primaryColorDark} onChange={(e) => set("primaryColorDark")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.primaryColorDark} onChange={set("primaryColorDark")} placeholder="#818cf8" maxLength={7} />
              </div>
            </FieldGroup>
            <FieldGroup label="Vurgu (Accent) Renk" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.accentDark} onChange={(e) => set("accentDark")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.accentDark} onChange={set("accentDark")} placeholder="#f97316" maxLength={7} />
              </div>
            </FieldGroup>
            <FieldGroup label="Genel Arka Plan (Background)" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.bgDark} onChange={(e) => set("bgDark")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.bgDark} onChange={set("bgDark")} placeholder="#0b0f1a" maxLength={7} />
              </div>
            </FieldGroup>
            <FieldGroup label="Genel Metin Rengi (Foreground)" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.fgDark} onChange={(e) => set("fgDark")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.fgDark} onChange={set("fgDark")} placeholder="#e8ecf4" maxLength={7} />
              </div>
            </FieldGroup>
            <FieldGroup label="Panel/Kart Arka Planı" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.cardDark} onChange={(e) => set("cardDark")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.cardDark} onChange={set("cardDark")} placeholder="#111827" maxLength={7} />
              </div>
            </FieldGroup>
            <FieldGroup label="Panel/Kart Metin Rengi" icon={Palette}>
              <div className="flex gap-3">
                <input type="color" value={form.cardFgDark} onChange={(e) => set("cardFgDark")(e.target.value)} className="h-11 w-16 rounded-xl border border-border cursor-pointer bg-card p-1 shrink-0" />
                <TextInput value={form.cardFgDark} onChange={set("cardFgDark")} placeholder="#e8ecf4" maxLength={7} />
              </div>
            </FieldGroup>
          </div>
        </div>
      </section>

      {/* Feedback */}
      {result && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-medium ${
            result.success
              ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {result.message}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
