"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Slide } from "@/lib/generated/client";

interface SliderClientProps {
  slides: Slide[];
  interval?: number;
  autoPlay?: boolean;
}

export function SliderClient({ 
  slides: initialSlides, 
  interval = 5000, 
  autoPlay = true,
}: SliderClientProps) {
  // Infinite loop için slaytları üç kata çıkarıyoruz
  const slides = [...initialSlides, ...initialSlides, ...initialSlides];
  const [current, setCurrent] = useState(initialSlides.length);
  const [itemsToShow, setItemsToShow] = useState(1);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Masaüstü: 2 slayt yan yana, mobil/tablet: 1 slayt
  useEffect(() => {
    const updateItems = () => {
      setItemsToShow(window.innerWidth >= 1024 ? 2 : 1);
    };
    updateItems();
    window.addEventListener("resize", updateItems);
    return () => window.removeEventListener("resize", updateItems);
  }, []);

  const nextSlide = useCallback(() => setCurrent((p) => p + 1), []);
  const prevSlide = useCallback(() => setCurrent((p) => p - 1), []);

  // Sonsuz döngü: sınır aşıldığında sessizce sıçra
  useEffect(() => {
    if (current >= initialSlides.length * 2) {
      setTimeout(() => setCurrent(initialSlides.length), 500);
    } else if (current < initialSlides.length) {
      setTimeout(() => setCurrent(initialSlides.length * 2 - 1), 500);
    }
  }, [current, initialSlides.length]);

  useEffect(() => {
    if (autoPlay && !isHovering && !isDragging) {
      timerRef.current = setInterval(nextSlide, interval);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoPlay, isHovering, isDragging, interval, nextSlide]);

  if (!initialSlides.length) return null;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      // Dış konteyner: slaytlar ile tam uyumlu aspect-ratio (16:9 ve 32:9)
      className="relative w-full overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-border/50 group bg-card transition-all duration-500 aspect-[16/9] lg:aspect-[32/9]"
    >
      <motion.div
        animate={{ x: `-${current * (100 / slides.length)}%` }}
        transition={{ type: "spring", stiffness: 150, damping: 25, mass: 1 }}
        drag="x"
        dragConstraints={{ left: -10000, right: 10000 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false);
          if (info.velocity.x > 500 || info.offset.x > 100) prevSlide();
          else if (info.velocity.x < -500 || info.offset.x < -100) nextSlide();
        }}
        className="flex h-full cursor-grab active:cursor-grabbing touch-pan-y"
        style={{ width: `${(slides.length / itemsToShow) * 100}%` }}
      >
        {slides.map((slide, index) => {
          const isActive = index >= current && index < current + itemsToShow;
          return (
            <div
              key={`${slide.id}-${index}`}
              className="relative h-full px-1.5 md:px-2.5 py-0 flex-shrink-0 flex items-center"
              style={{ width: `${100 / slides.length}%` }}
            >
              {/* Slayt kartı — tam 16:9, dikey ortala */}
              <div className="relative w-full aspect-[16/9] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden group/slide">

                {/* Arka plan görseli — alana tam oturan */}
                <div className="absolute inset-0 z-10">
                  <Image
                    src={slide.imageUrl}
                    alt={slide.title || ""}
                    fill
                    className="object-cover group-hover/slide:scale-105 transition-transform duration-1000"
                    priority={index >= initialSlides.length && index < initialSlides.length + itemsToShow}
                  />
                </div>

                {/* Gradient örtüsü — Metin okunabilirliği için her zaman koyu gradyan */}
                <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-colors duration-300" />

                {/* İçerik */}
                <div className="absolute inset-0 z-30 flex items-end justify-center pb-7 md:pb-10 px-4 md:px-5">
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[95%] space-y-1.5 md:space-y-2.5 text-center"
                  >
                    {slide.title && (
                      <h2 className="text-base md:text-xl lg:text-2xl font-bold font-display leading-tight line-clamp-2 text-white drop-shadow transition-colors duration-300">
                        {slide.title}
                      </h2>
                    )}
                    {itemsToShow === 1 && slide.description && (
                      <p className="text-white/85 text-xs md:text-sm line-clamp-2 font-medium leading-relaxed max-w-xl mx-auto hidden md:block transition-colors duration-300">
                        {slide.description}
                      </p>
                    )}
                    {slide.link && (
                      <div className="pt-1.5 md:pt-2.5">
                        <Link
                          href={slide.link}
                          className="inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-primary-500/20 group/btn"
                        >
                          İncele
                          <div className="bg-white/25 rounded-full p-0.5 group-hover/btn:bg-white/40 transition-colors duration-200">
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </Link>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* ← Önceki */}
      <div className="absolute inset-y-0 left-2 md:left-4 flex items-center z-40">
        <button
          onClick={(e) => { e.stopPropagation(); prevSlide(); }}
          className="h-9 w-9 md:h-11 md:w-11 rounded-full bg-card/80 dark:bg-black/40 backdrop-blur-xl border border-border/40 dark:border-white/10 text-foreground dark:text-white flex items-center justify-center hover:bg-primary-500 hover:text-white hover:border-primary-400 hover:scale-110 active:scale-95 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-md"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* → Sonraki */}
      <div className="absolute inset-y-0 right-2 md:right-4 flex items-center z-40">
        <button
          onClick={(e) => { e.stopPropagation(); nextSlide(); }}
          className="h-9 w-9 md:h-11 md:w-11 rounded-full bg-card/80 dark:bg-black/40 backdrop-blur-xl border border-border/40 dark:border-white/10 text-foreground dark:text-white flex items-center justify-center hover:bg-primary-500 hover:text-white hover:border-primary-400 hover:scale-110 active:scale-95 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-md"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Progress Dots */}
      <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40">
        {initialSlides.map((_, idx) => {
          const isActive = (current % initialSlides.length) === idx;
          return (
            <button
              key={idx}
              onClick={() => setCurrent(initialSlides.length + idx)}
              className={`relative h-1 md:h-1.5 transition-all duration-300 rounded-full overflow-hidden ${
                isActive ? "bg-primary-500" : "bg-foreground/20 dark:bg-white/20"
              }`}
              style={{ width: isActive ? "1.5rem" : "0.4rem" }}
            >
              {isActive && autoPlay && (
                <motion.div
                  key={current}
                  initial={{ width: 0 }}
                  animate={{ width: (isHovering || isDragging) ? "0%" : "100%" }}
                  transition={{ duration: interval / 1000, ease: "linear" }}
                  className="absolute inset-0 bg-primary-600"
                />
              )}
              {isActive && !autoPlay && <div className="absolute inset-0 bg-primary-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
