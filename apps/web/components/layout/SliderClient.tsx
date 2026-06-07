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
  height?: string;
  mobileHeight?: string;
}

export function SliderClient({ 
  slides: initialSlides, 
  interval = 5000, 
  autoPlay = true,
  height = "500px",
  mobileHeight = "300px"
}: SliderClientProps) {
  const isAspectMode = height === "aspect-16-9";

  // Infinite loop için slaytları çoğaltıyoruz (önce ve sona kopya)
  // Bu, her durumda (tek/çift) sorunsuz dönüş sağlar
  const slides = [...initialSlides, ...initialSlides, ...initialSlides];
  const [current, setCurrent] = useState(initialSlides.length); // Ortadaki gruptan başla
  const [itemsToShow, setItemsToShow] = useState(1);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive items calculation
  useEffect(() => {
    const updateItems = () => {
      if (isAspectMode) {
        if (window.innerWidth >= 1024) { setItemsToShow(2); } 
        else { setItemsToShow(1); }
      } else {
        if (window.innerWidth >= 1536) { setItemsToShow(3); } 
        else if (window.innerWidth >= 1024) { setItemsToShow(2); } 
        else { setItemsToShow(1); }
      }
    };
    updateItems();
    window.addEventListener("resize", updateItems);
    return () => window.removeEventListener("resize", updateItems);
  }, [isAspectMode]);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => prev + 1);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => prev - 1);
  }, []);

  // Infinite loop logic: Gruptan dışarı çıkınca sessizce başa/sona dön
  useEffect(() => {
    if (current >= initialSlides.length * 2) {
      setTimeout(() => {
        // Animasyonsuz sıçrama için bir yöntem lazım ama Framer Motion 'animate' propu ile zor.
        // Şimdilik basit tutuyoruz, 'current' kontrolü ile loop sağlıyoruz.
        setCurrent(initialSlides.length);
      }, 500);
    } else if (current < initialSlides.length) {
      setTimeout(() => {
        setCurrent(initialSlides.length * 2 - 1);
      }, 500);
    }
  }, [current, initialSlides.length]);

  useEffect(() => {
    if (autoPlay && !isHovering && !isDragging) {
      timerRef.current = setInterval(nextSlide, interval);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, isHovering, isDragging, interval, nextSlide]);

  if (!initialSlides.length) return null;

  return (
    <div 
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`slider-container relative w-full overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-border/50 group bg-card transition-all duration-500 ${
        isAspectMode ? "aspect-[16/10] sm:aspect-[16/9] lg:aspect-[32/9]" : ""
      }`}
    >
      {!isAspectMode && (
        <style jsx>{`
          .slider-container { height: ${mobileHeight}; }
          @media (min-width: 768px) { .slider-container { height: ${height}; } }
        `}</style>
      )}
      
      <motion.div
        animate={{ x: `-${current * (100 / slides.length)}%` }}
        transition={{ 
          type: "spring", 
          stiffness: 150, 
          damping: 25,
          mass: 1
        }}
        drag="x"
        dragConstraints={{ left: -10000, right: 10000 }} // Büyük bir alan veriyoruz ki sürükleme doğal olsun
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false);
          const velocityThreshold = 500;
          const distanceThreshold = 100;
          
          if (info.velocity.x > velocityThreshold || info.offset.x > distanceThreshold) {
            prevSlide();
          } else if (info.velocity.x < -velocityThreshold || info.offset.x < -distanceThreshold) {
            nextSlide();
          }
        }}
        className="flex h-full cursor-grab active:cursor-grabbing touch-pan-y"
        style={{ width: `${(slides.length / itemsToShow) * 100}%` }}
      >
        {slides.map((slide, index) => {
          const isActive = index >= current && index < current + itemsToShow;
          return (
            <div 
              key={`${slide.id}-${index}`} 
              className="relative h-full px-1 md:px-2 flex-shrink-0"
              style={{ width: `${100 / slides.length}%` }}
            >
              <div className="relative w-full h-full rounded-[1.5rem] md:rounded-[2rem] overflow-hidden group/slide bg-zinc-900/40">
                {isAspectMode ? (
                  <div className="absolute inset-0 z-10 w-full h-full">
                    <Image
                      src={slide.imageUrl}
                      alt={slide.title || ""}
                      fill
                      className="object-cover group-hover/slide:scale-105 transition-transform duration-1000"
                      priority={index >= initialSlides.length && index < initialSlides.length + itemsToShow}
                    />
                  </div>
                ) : (
                  <>
                    {/* Background Blur */}
                    <div className="absolute inset-0 z-0">
                      <Image src={slide.imageUrl} alt="" fill className="object-cover blur-2xl opacity-30 scale-110" />
                    </div>

                    {/* Main Image */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center p-4 md:p-8">
                      <div className="relative w-full h-full max-w-full max-h-full">
                        <Image
                          src={slide.imageUrl}
                          alt={slide.title || ""}
                          fill
                          className="object-contain"
                          priority={index >= initialSlides.length && index < initialSlides.length + itemsToShow}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Overlay */}
                <div 
                  className={
                    isAspectMode 
                      ? "absolute inset-0 z-20 bg-gradient-to-t from-card/95 via-card/50 dark:from-card dark:via-card/60 to-transparent transition-colors duration-300" 
                      : "absolute inset-0 z-20 bg-linear-to-t from-black/80 via-black/20 to-transparent"
                  } 
                />

                {/* Content */}
                <div className="absolute inset-0 z-30 flex items-end justify-center pb-8 md:pb-12 px-4 md:px-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[95%] md:max-w-[85%] space-y-2 md:space-y-3.5 text-center"
                  >
                    {slide.title && (
                      <h2 className={
                        isAspectMode 
                          ? "text-lg md:text-xl lg:text-2xl font-bold font-display leading-tight line-clamp-2 text-foreground transition-colors duration-300"
                          : "text-xl md:text-3xl lg:text-4xl font-bold text-white font-display leading-tight drop-shadow-xl line-clamp-2"
                      }>
                        {slide.title}
                      </h2>
                    )}
                    {itemsToShow === 1 && slide.description && (
                      <p className={
                        isAspectMode 
                          ? "text-muted-foreground text-xs md:text-sm line-clamp-2 font-medium leading-relaxed max-w-xl mx-auto hidden md:block transition-colors duration-300"
                          : "text-white/90 text-xs md:text-lg line-clamp-2 font-medium leading-relaxed drop-shadow-md mx-auto max-w-2xl hidden md:block"
                      }>
                        {slide.description}
                      </p>
                    )}
                    
                    {slide.link && (
                      <div className="pt-2 md:pt-3.5">
                        <Link 
                          href={slide.link!}
                          className={
                            isAspectMode
                              ? "inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white dark:bg-primary-600 dark:hover:bg-primary-700 rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-primary-500/10 group/btn"
                              : "inline-flex items-center gap-3 px-6 py-2.5 md:px-10 md:py-4 bg-white/10 backdrop-blur-2xl text-white border border-white/20 rounded-2xl font-bold text-xs md:text-sm hover:bg-white/20 hover:border-white/40 hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl shadow-black/40 group/btn"
                          }
                        >
                          İncele
                          <div className={
                            isAspectMode
                              ? "bg-white/25 rounded-full p-0.5"
                              : "bg-white/20 rounded-full p-1 group-hover/btn:bg-primary-500 transition-colors duration-300"
                          }>
                            <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5" />
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

      {/* Controls */}
      <div className="absolute inset-y-0 left-2 md:left-6 flex items-center z-40">
        <button 
          onClick={(e) => { e.stopPropagation(); prevSlide(); }}
          className={
            isAspectMode
              ? "h-9 w-9 md:h-11 md:w-11 rounded-full bg-card/75 dark:bg-card/45 backdrop-blur-xl border border-border/30 text-foreground flex items-center justify-center hover:bg-primary-500 hover:text-white hover:border-primary-400 hover:scale-110 active:scale-95 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-md"
              : "h-9 w-9 md:h-12 md:w-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-primary-500 hover:border-primary-400 hover:scale-110 active:scale-95 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg"
          }
        >
          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>
      <div className="absolute inset-y-0 right-2 md:right-6 flex items-center z-40">
        <button 
          onClick={(e) => { e.stopPropagation(); nextSlide(); }}
          className={
            isAspectMode
              ? "h-9 w-9 md:h-11 md:w-11 rounded-full bg-card/75 dark:bg-card/45 backdrop-blur-xl border border-border/30 text-foreground flex items-center justify-center hover:bg-primary-500 hover:text-white hover:border-primary-400 hover:scale-110 active:scale-95 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-md"
              : "h-9 w-9 md:h-12 md:w-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-primary-500 hover:border-primary-400 hover:scale-110 active:scale-95 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg"
          }
        >
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>

      {/* Progress Dots */}
      <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-40">
        {initialSlides.map((_, idx) => {
          const isActive = (current % initialSlides.length) === idx;
          return (
            <button
              key={idx}
              onClick={() => setCurrent(initialSlides.length + idx)}
              className={
                isAspectMode
                  ? `relative h-1 md:h-1.5 transition-all duration-300 rounded-full ${isActive ? "bg-primary-500" : "bg-foreground/20"} overflow-hidden`
                  : `relative h-1 md:h-1.5 transition-all duration-300 rounded-full bg-white/20 overflow-hidden`
              }
              style={{ width: isActive ? "1.5rem" : "0.5rem" }}
            >
              {isActive && autoPlay && (
                <motion.div 
                  key={current}
                  initial={{ width: 0 }}
                  animate={{ width: (isHovering || isDragging) ? "0%" : "100%" }}
                  transition={{ duration: interval / 1000, ease: "linear" }}
                  className={isAspectMode ? "absolute inset-0 bg-primary-600" : "absolute inset-0 bg-primary-500"}
                />
              )}
              {isActive && !autoPlay && <div className={isAspectMode ? "absolute inset-0 bg-primary-600" : "absolute inset-0 bg-primary-500"} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
