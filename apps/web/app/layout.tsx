import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
