import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { WebSiteJsonLd, OrganizationJsonLd } from "@/components/seo/JsonLd";
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

export const metadata: Metadata = {
  title: {
    default: "Haber Nexus — Yeni Nesil Haber Platformu",
    template: "%s | Haber Nexus",
  },
  description:
    "Haber Nexus ile gündemdeki en son haberleri, analizleri ve derinlemesine içerikleri keşfedin. Modern, hızlı ve kişiselleştirilmiş haber deneyimi.",
  keywords: [
    "haber",
    "gündem",
    "son dakika",
    "analiz",
    "Türkiye",
    "dünya",
    "teknoloji",
    "spor",
  ],
  authors: [{ name: "Haber Nexus" }],
  creator: "Haber Nexus",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  alternates: {
    types: {
      "application/rss+xml": [
        {
          url: "/rss.xml",
          title: "Haber Nexus RSS Akışı (Genel)",
        },
        {
          url: "/rss/tr",
          title: "Haber Nexus RSS Akışı (Türkçe)",
        },
        {
          url: "/rss/en",
          title: "Haber Nexus RSS Feed (English)",
        },
      ],
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Haber Nexus",
    title: "Haber Nexus — Yeni Nesil Haber Platformu",
    description:
      "Gündemdeki en son haberleri, analizleri ve derinlemesine içerikleri keşfedin.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Haber Nexus",
    description: "Yeni nesil haber platformu",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col antialiased">
        <WebSiteJsonLd />
        <OrganizationJsonLd />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
