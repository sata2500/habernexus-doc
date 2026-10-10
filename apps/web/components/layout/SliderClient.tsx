"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Slide } from "@/lib/generated/client";
import { cn } from "@/lib/utils";

interface SliderClientProps {
  slides: Slide[];
  interval?: number;
  autoPlay?: boolean;
}

/**
 * Ana sayfa slaytı. Kaydırma tarayıcının yerel "scroll-snap" özelliğiyle yapılır: dokunmatik
 * kaydırma akıcıdır, ek animasyon kütüphanesi gerekmez. Otomatik geçiş fare üzerindeyken,
 * klavye odağı içerideyken, kullanıcı dokunurken ve "azaltılmış hareket" tercihinde durur.
 */
export function SliderClient({ slides, interval = 5000, autoPlay = true }: SliderClientProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [perView, setPerView] = useState(1);
  const count = slides.length;
  /** Gidilebilecek konum sayısı (masaüstünde 2 slayt yan yana: 3 slayt → 2 konum) */
  const positions = Math.max(1, count - perView + 1);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Görünürdeki slayt sayısı (masaüstünde 2), ekran boyutu değişince güncellenir
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const first = track.firstElementChild as HTMLElement | null;
      setPerView(first ? Math.max(1, Math.round(track.clientWidth / first.offsetWidth)) : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return;
    const last = Math.max(0, count - perView);
    // Sondan sonra başa, baştan önce sona döner
    const target = index > last ? 0 : index < 0 ? last : index;
    track.scrollTo({ left: target * first.offsetWidth, behavior: "smooth" });
  }, [count, perView]);

  // Kaydırma konumundan etkin slayt
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const first = track.firstElementChild as HTMLElement | null;
      if (first) setCurrent(Math.round(track.scrollLeft / first.offsetWidth));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const playing = autoPlay && !paused && !reducedMotion && positions > 1;
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => goTo(current + 1), interval);
    return () => clearTimeout(timer);
  }, [playing, current, interval, goTo]);

  if (!count) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-border/50 group bg-card aspect-[16/9] lg:aspect-[32/9]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div
        ref={trackRef}
        className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar overscroll-x-contain"
        aria-live={playing ? "off" : "polite"}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="relative h-full shrink-0 basis-full lg:basis-1/2 snap-start px-1.5 md:px-2.5 flex items-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${count}${slide.title ? `: ${slide.title}` : ""}`}
          >
            <div className="relative w-full aspect-[16/9] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden group/slide">
              <Image
                src={slide.imageUrl}
                alt={slide.title || ""}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover group-hover/slide:scale-105 transition-transform duration-1000"
                // İlk slayt sayfanın en üstünde, mobilde en büyük görsel (LCP) odur: hemen ve yüksek öncelikle yüklenir
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

              <div className="absolute inset-0 flex items-end justify-center pb-7 md:pb-10 px-4 md:px-5">
                <div className="w-full max-w-[95%] space-y-1.5 md:space-y-2.5 text-center">
                  {slide.title && (
                    <h2 className="text-base md:text-xl lg:text-2xl font-bold font-display leading-tight line-clamp-2 text-white drop-shadow">
                      {slide.title}
                    </h2>
                  )}
                  {slide.description && (
                    <p className="text-white/85 text-xs md:text-sm line-clamp-2 font-medium leading-relaxed max-w-xl mx-auto hidden md:block lg:hidden">
                      {slide.description}
                    </p>
                  )}
                  {slide.link && (
                    <div className="pt-1.5 md:pt-2.5">
                      <Link
                        href={slide.link}
                        className="inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-primary-500/20 group/btn focus-ring"
                      >
                        İncele<span className="sr-only">: {slide.title}</span>
                        <span className="bg-white/25 rounded-full p-0.5 group-hover/btn:bg-white/40 transition-colors duration-200" aria-hidden="true">
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {positions > 1 && (
        <>
          {/* Oklar: dokunmatikte kaydırma yeterli; masaüstünde üzerine gelince ya da klavye odağında görünür */}
          {([["prev", ChevronLeft, "Önceki slayt", "left-2 md:left-4"], ["next", ChevronRight, "Sonraki slayt", "right-2 md:right-4"]] as const).map(([dir, Icon, label, pos]) => (
            <button
              key={dir}
              type="button"
              onClick={() => goTo(dir === "next" ? current + 1 : current - 1)}
              aria-label={label}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 z-10 hidden md:flex h-11 w-11 rounded-full bg-card/80 backdrop-blur-xl border border-border/40 text-foreground items-center justify-center hover:bg-primary-500 hover:text-white hover:border-primary-400 hover:scale-110 active:scale-95 transition-all duration-300 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 shadow-md cursor-pointer focus-ring",
                pos,
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}

          <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
            {slides.slice(0, positions).map((slide, idx) => {
              const active = idx === Math.min(current, positions - 1);
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(idx)}
                  aria-label={`${idx + 1}. slayta git`}
                  aria-current={active ? "true" : undefined}
                  className="inline-flex items-center justify-center min-h-6 min-w-6 px-1 cursor-pointer group/dot"
                >
                  <span
                    className={cn(
                      "relative block h-1 md:h-1.5 rounded-full overflow-hidden transition-all duration-300",
                      active ? "w-6 bg-primary-500/40" : "w-1.5 bg-white/50 group-hover/dot:bg-white/80",
                    )}
                  >
                    {active && (
                      <span
                        key={`${current}-${playing}`}
                        className="absolute inset-y-0 left-0 bg-primary-500"
                        style={playing ? { animation: `slider-progress ${interval}ms linear forwards` } : { width: "100%" }}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
