"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface ReadingProgressBarProps {
  estimatedMinutes: number;
}

export function ReadingProgressBar({ estimatedMinutes }: ReadingProgressBarProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;

      const currentProgress = (window.scrollY / totalHeight) * 100;
      const clamped = Math.min(100, Math.max(0, currentProgress));
      setScrollProgress(clamped);
      setIsVisible(window.scrollY > 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const remainingMinutes = Math.max(1, Math.ceil(estimatedMinutes * (1 - scrollProgress / 100)));

  return (
    <>
      {/* Üst İlerleme Çubuğu */}
      <div className="fixed top-0 left-0 right-0 h-1.5 z-50 bg-border/20 backdrop-blur-xs pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-accent transition-all duration-150 ease-out shadow-[0_0_12px_rgba(var(--primary),0.6)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Kaydırma ile beliren minik kalan süre rozeti */}
      <div
        className={`fixed bottom-6 right-6 z-40 transition-all duration-300 transform ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 border border-border/80 shadow-lg backdrop-blur-md text-xs font-semibold text-foreground">
          <div className="relative flex items-center justify-center">
            <svg className="w-5 h-5 -rotate-90 transform">
              <circle
                cx="10"
                cy="10"
                r="8"
                className="stroke-muted"
                strokeWidth="2.5"
                fill="none"
              />
              <circle
                cx="10"
                cy="10"
                r="8"
                className="stroke-primary-500 transition-all duration-150"
                strokeWidth="2.5"
                strokeDasharray="50.26"
                strokeDashoffset={50.26 - (50.26 * scrollProgress) / 100}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <Clock className="h-2.5 w-2.5 text-primary-500 absolute" />
          </div>
          <span>
            {scrollProgress >= 98 ? "Okundu" : `Kalan: ~${remainingMinutes} dk`}
          </span>
        </div>
      </div>
    </>
  );
}
