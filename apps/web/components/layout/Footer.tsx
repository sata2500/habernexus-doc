"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { subscribeToNewsletter } from "@/app/(main)/newsletter-actions";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import type { SiteSettings } from "@/lib/site-settings";

// --- Marka İkonları (Orijinal SVG) ---
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const footerLinks = {
  platform: [
    { label: "Hakkımızda", href: "/about" },
    { label: "İletişim", href: "/contact" },
    { label: "Kariyer", href: "/careers" },
    { label: "Reklam", href: "/advertise" },
    { label: "RSS Kaynakları", href: "/rss-feeds" },
  ],
  legal: [
    { label: "Gizlilik Politikası", href: "/privacy" },
    { label: "Kullanım Şartları", href: "/terms" },
    { label: "Çerez Politikası", href: "/cookies" },
    { label: "KVKK", href: "/kvkk" },
  ],
};



interface Category {
  id: string;
  name: string;
  slug: string;
}

export function Footer({ categories = [], settings }: { categories?: Category[], settings?: Partial<SiteSettings> }) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const siteName = settings?.siteName || "Haber Nexus";
  const logoText = settings?.logoText || "N";
  const siteNameParts = siteName.split(" ");
  const firstWord = siteNameParts[0];
  const restWords = siteNameParts.slice(1).join(" ");
  const description = settings?.siteDescription || "Yeni nesil haber platformu. Güvenilir, hızlı ve kişiselleştirilmiş haberlerle her zaman güncel kalın.";
  const copyright = settings?.footerCopyright || `© ${new Date().getFullYear()} ${siteName}. Tüm hakları saklıdır.`;

  const activeSocialLinks = [
    { 
      icon: XIcon, href: settings?.socialTwitter, label: "X (Twitter)", 
      hoverColor: "hover:text-[#1DA1F2]", hoverBg: "hover:bg-[#1DA1F2]/10", glow: "hover:shadow-[0_0_20px_rgba(29,161,242,0.3)]"
    },
    { 
      icon: InstagramIcon, href: settings?.socialInstagram, label: "Instagram", 
      hoverColor: "hover:text-[#E4405F]", hoverBg: "hover:bg-[#E4405F]/10", glow: "hover:shadow-[0_0_20px_rgba(228,64,95,0.3)]"
    },
    { 
      icon: YoutubeIcon, href: settings?.socialYoutube, label: "YouTube", 
      hoverColor: "hover:text-[#FF0000]", hoverBg: "hover:bg-[#FF0000]/10", glow: "hover:shadow-[0_0_20px_rgba(255,0,0,0.3)]"
    },
    { 
      icon: GithubIcon, href: settings?.socialGithub, label: "GitHub", 
      hoverColor: "hover:text-foreground", hoverBg: "hover:bg-neutral-500/10", glow: "hover:shadow-[0_0_20px_rgba(120,120,120,0.2)]"
    },
  ].filter(link => !!link.href);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setMessage(null);
    startTransition(async () => {
      const result = await subscribeToNewsletter(email);
      if (result.success) {
        setMessage({ text: result.message || "", type: "success" });
        setEmail("");
      } else {
        setMessage({ text: result.error || "Hata oluştu", type: "error" });
      }
    });
  };

  return (
    <footer className="bg-surface border-t border-border mt-auto">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              {settings?.logoUrl ? (
                <div className="h-9 w-9 relative rounded-xl overflow-hidden shrink-0 border border-border/50">
                  <img src={settings.logoUrl} alt={siteName} className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-lg font-(family-name:--font-outfit)">
                    {logoText}
                  </span>
                </div>
              )}
              <span className="text-xl font-bold font-(family-name:--font-outfit) tracking-tight">
                <span className="text-gradient">{firstWord}</span>
                {restWords && <span className="text-foreground"> {restWords}</span>}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {description}
            </p>

            {/* Newsletter */}
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isPending}
                    placeholder="E-posta adresiniz"
                    className="w-full h-10 rounded-xl border border-border bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-10 px-4 rounded-xl bg-gradient-primary text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-70 flex items-center gap-2"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Abone Ol"}
                </button>
              </div>
              {message && (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                  {message.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {message.text}
                </div>
              )}
            </form>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-semibold font-(family-name:--font-outfit) text-foreground mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Category Links */}
          <div>
            <h4 className="font-semibold font-(family-name:--font-outfit) text-foreground mb-4">
              Kategoriler
            </h4>
            <ul className="space-y-2.5">
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold font-(family-name:--font-outfit) text-foreground mb-4">
              Yasal
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {copyright}
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {activeSocialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <motion.a
                  key={social.label}
                  href={social.href as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.15, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground border border-border/50 transition-all duration-300 glass-soft ${social.hoverColor} ${social.hoverBg} ${social.glow}`}
                  aria-label={social.label}
                >
                  <Icon className="h-5 w-5" />
                </motion.a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
