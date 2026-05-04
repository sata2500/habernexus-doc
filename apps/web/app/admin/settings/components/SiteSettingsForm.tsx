"use client";

import { useState, useTransition } from "react";
import { updateSiteSettings, type SiteSettingsInput } from "../actions";
import {
  Globe,
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
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">{logoLetter}</span>
          </div>
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

      {/* Gelişmiş */}
      <section className="space-y-5">
        <h3 className="text-base font-bold font-(family-name:--font-outfit) flex items-center gap-2 border-b border-border pb-3">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Gelişmiş Ayarlar
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FieldGroup
            label="Favicon URL"
            icon={Link2}
            hint="Boş bırakırsanız /favicon.svg kullanılır"
          >
            <TextInput
              value={form.faviconUrl}
              onChange={set("faviconUrl")}
              placeholder="https://cdn.example.com/favicon.ico"
            />
          </FieldGroup>
          <FieldGroup
            label="Logo URL"
            icon={Link2}
            hint="SVG/PNG logo URL'si. Boş bırakırsanız harf logo kullanılır"
          >
            <TextInput
              value={form.logoUrl}
              onChange={set("logoUrl")}
              placeholder="https://cdn.example.com/logo.svg"
            />
          </FieldGroup>
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
