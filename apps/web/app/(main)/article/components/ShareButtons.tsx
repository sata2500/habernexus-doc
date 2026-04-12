"use client";

import { Share2, X, MessageCircle, Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  title: string;
  url: string;
}

export function ShareButtons({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined" ? window.location.href : url;

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: fullUrl,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      copyToClipboard();
    }
  };

  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`;
    window.open(twitterUrl, "_blank");
  };

  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " " + fullUrl)}`;
    window.open(whatsappUrl, "_blank");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleWebShare}
        className="p-2 rounded-full hover:bg-primary-50 dark:hover:bg-primary-900/20 text-muted-foreground hover:text-primary-500 transition-all cursor-pointer"
        title="Paylaş"
      >
        <Share2 className="h-5 w-5" />
      </button>
      
      <button
        onClick={shareOnTwitter}
        className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-400 transition-all cursor-pointer"
        title="X'te Paylaş"
      >
        <X className="h-5 w-5" />
      </button>

      <button
        onClick={shareOnWhatsApp}
        className="p-2 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 text-muted-foreground hover:text-green-500 transition-all cursor-pointer"
        title="WhatsApp'ta Paylaş"
      >
        <MessageSquareIcon className="h-5 w-5" />
      </button>

      <button
        onClick={copyToClipboard}
        className="p-2 rounded-full hover:bg-muted transition-all text-muted-foreground hover:text-foreground cursor-pointer"
        title="Bağlantıyı Kopyala"
      >
        {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
      </button>
    </div>
  );
}

// WhatsApp icon fixed
function MessageSquareIcon({ className }: { className?: string }) {
    return <MessageCircle className={className} />;
}
