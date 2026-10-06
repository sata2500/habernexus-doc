import type { Metadata } from "next";

// Giriş ve kayıt sayfaları arama sonuçlarında yer almasın
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
