import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { WebSiteJsonLd, OrganizationJsonLd } from "@/components/seo/JsonLd";
import { getSiteSettings } from "@/lib/site-settings";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
  display: "swap",
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
  const siteUrl =
    settings.siteUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
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
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html
      lang="tr"
      className={`${inter.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col antialiased">
        <WebSiteJsonLd settings={settings} />
        <OrganizationJsonLd settings={settings} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
