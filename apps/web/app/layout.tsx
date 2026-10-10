import { getAppUrl } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { DynamicThemeColors } from "@/components/layout/DynamicThemeColors";
import { WebSiteJsonLd, OrganizationJsonLd } from "@/components/seo/JsonLd";
import { getSiteSettings } from "@/lib/site-settings";
import Script from "next/script";
import { preload } from "react-dom";
import { getPublicMonetization } from "@/lib/server/monetization";
import { CONSENT_INIT_SCRIPT } from "@/lib/google-consent";
import { FeedbackHost } from "@/components/ui/feedback";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  // Türkçe harfler globals.css'teki küçük alt kümeden gelir (latin-ext dosyası 85 KB)
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  // Yalnızca başlıklarda kullanılır; önceden yüklenmesi ilk açılışta büyük görselle (LCP) bant genişliği yarıştırıyordu.
  // Yedek yazı tipi ölçüleri Next tarafından eşitlendiği için geç yüklenmesi kaymaya yol açmaz.
  preload: false,
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  const siteName = settings.siteName || "Haber Nexus";
  const siteTagline = settings.siteTagline || "Yeni Nesil Haber Platformu";
  const siteDescription =
    settings.siteDescription ||
    "Gündemdeki en son haberleri, analizleri ve derinlemesine içerikleri keşfedin. Modern, hızlı ve kişiselleştirilmiş haber deneyimi.";
  const siteUrl = settings.siteUrl || getAppUrl();
  const keywords = settings.keywords
    ? settings.keywords.split(",").map((k) => k.trim())
    : ["haber", "gündem", "son dakika", "analiz", "Türkiye", "dünya", "teknoloji", "spor"];
  const faviconUrl = settings.faviconUrl || "/favicon.svg";

  return {
    title: {
      default: `${siteName} — ${siteTagline}`,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    keywords,
    authors: [{ name: siteName }],
    creator: siteName,
    icons: {
      icon: [{ url: faviconUrl, type: faviconUrl.endsWith(".svg") ? "image/svg+xml" : "image/x-icon" }],
      apple: faviconUrl,
      shortcut: faviconUrl,
    },
    metadataBase: new URL(siteUrl),
    alternates: {
      types: {
        "application/rss+xml": [
          { url: "/rss.xml", title: `${siteName} RSS Akışı (Genel)` },
          { url: "/rss/tr", title: `${siteName} RSS Akışı (Türkçe)` },
          { url: "/rss/en", title: `${siteName} RSS Feed (English)` },
        ],
      },
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName,
      title: `${siteName} — ${siteTagline}`,
      description: siteDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: siteTagline,
    },
    robots: {
      index: true,
      follow: true,
      // Google Discover ve Haberler'de büyük görselli kart için gerekli
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, monetization] = await Promise.all([getSiteSettings(), getPublicMonetization()]);
  const usesGoogle = !!(monetization.gaMeasurementId || monetization.adsensePublisherId);
  // Türkçe harfler neredeyse her sayfada var: alt küme CSS'i beklemeden indirilir
  preload("/fonts/inter-latin-ext-a.v1.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });

  return (
    <html
      lang="tr"
      className={`${inter.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col antialiased">
        <DynamicThemeColors settings={settings} />
        <WebSiteJsonLd settings={settings} />
        <OrganizationJsonLd settings={settings} />
        <ThemeProvider>{children}</ThemeProvider>
        <FeedbackHost />
        {/* Google Consent Mode varsayılanları: Google betiklerinden önce, çerezdeki tercihe göre */}
        {usesGoogle && <Script id="consent-init" strategy="beforeInteractive">{CONSENT_INIT_SCRIPT}</Script>}
      </body>
    </html>
  );
}
