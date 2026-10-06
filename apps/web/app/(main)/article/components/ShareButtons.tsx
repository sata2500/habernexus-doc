"use client";

import { Share2, MessageCircle, Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  title: string;
  /** Haberin kalıcı (canonical) adresi; izleme parametreleri olmadan paylaşılır */
  url: string;
}

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
  </svg>
);

const ICON_BUTTON = "h-10 w-10 inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors cursor-pointer focus-ring";

export function ShareButtons({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Bağlantıyı kopyalayın:", url);
    }
  };

  const handleWebShare = async () => {
    if (!navigator.share) return copyToClipboard();
    try {
      await navigator.share({ title, url });
    } catch (err) {
      // Kullanıcı paylaşım penceresini kapattıysa hata değildir
      if (!(err instanceof DOMException && err.name === "AbortError")) void copyToClipboard();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={handleWebShare} className={`${ICON_BUTTON} hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-500`} aria-label="Paylaş" title="Paylaş">
        <Share2 className="h-5 w-5" aria-hidden="true" />
      </button>
      <a
        href={`https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${ICON_BUTTON} hover:bg-muted hover:text-foreground`}
        aria-label="X'te paylaş (yeni sekmede açılır)"
        title="X'te paylaş"
      >
        <XLogo className="h-4 w-4" />
      </a>
      <a
        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${ICON_BUTTON} hover:bg-success/10 hover:text-success`}
        aria-label="WhatsApp'ta paylaş (yeni sekmede açılır)"
        title="WhatsApp'ta paylaş"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
      </a>
      <button type="button" onClick={copyToClipboard} className={`${ICON_BUTTON} hover:bg-muted hover:text-foreground`} aria-label={copied ? "Bağlantı kopyalandı" : "Bağlantıyı kopyala"} title="Bağlantıyı kopyala">
        {copied ? <Check className="h-5 w-5 text-success" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}
