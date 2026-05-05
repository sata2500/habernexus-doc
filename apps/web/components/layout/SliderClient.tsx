"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  slides, 
  interval = 5000, 
  autoPlay = true,
  height = "500px",
  mobileHeight = "300px"
}: SliderClientProps) {
  const [current, setCurrent] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // We'll use a stable itemsToShow calculation that matches our CSS
  const [itemsToShow, setItemsToShow] = useState(1);

  useEffect(() => {
    const updateItems = () => {
      if (window.innerWidth >= 1536) setItemsToShow(3);
      else if (window.innerWidth >= 1024) setItemsToShow(2);
      else setItemsToShow(1);
    };
    updateItems();
    window.addEventListener("resize", updateItems);
    return () => window.removeEventListener("resize", updateItems);
  }, []);

  const totalPages = Math.max(1, slides.length - itemsToShow + 1);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % totalPages);
  }, [totalPages]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + totalPages) % totalPages);
  }, [totalPages]);

  useEffect(() => {
    if (autoPlay && !isHovering && !isDragging && slides.length > itemsToShow) {
      timerRef.current = setInterval(nextSlide, interval);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, isHovering, isDragging, interval, nextSlide, slides.length, itemsToShow, current]);

  if (!slides.length) return null;

  return (
    <div 
      ref={containerRef}
      className="slider-wrapper relative w-full overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-border/50 group bg-black transition-all duration-500"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <style jsx>{`
        .slider-wrapper { height: ${mobileHeight}; }
        @media (min-width: 768px) { .slider-wrapper { height: ${height}; } }
        
        .slide-item { width: 100%; }
        @media (min-width: 1024px) { .slide-item { width: 50%; } }
        @media (min-width: 1536px) { .slide-item { width: 33.333%; } }
      `}</style>
      
      <motion.div
        animate={{ x: `-${current * (100 / itemsToShow)}%` }}
        transition={{ 
          type: "spring", 
          stiffness: 150, 
          damping: 25,
          mass: 1
        }}
        drag="x"
        dragConstraints={{ left: -((slides.length - itemsToShow) * (100 / itemsToShow)), right: 0 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false);
          const swipeThreshold = 50;
          if (info.offset.x > swipeThreshold) prevSlide();
          else if (info.offset.x < -swipeThreshold) nextSlide();
        }}
        className="flex h-full cursor-grab active:cursor-grabbing touch-pan-y justify-start"
        style={{ width: `${(slides.length / itemsToShow) * 100}%` }}
      >
        {slides.map((slide, index) => (
          <div 
            key={slide.id} 
            className="slide-item relative h-full px-1 md:px-2 flex-shrink-0"
          >
            <div className="relative w-full h-full rounded-[1.5rem] md:rounded-[2rem] overflow-hidden group/slide bg-zinc-900/50">
              {/* Background Blur */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={slide.imageUrl}
                  alt=""
                  fill
                  className="object-cover blur-2xl opacity-40 scale-110"
                />
              </div>

              {/* Main Image */}
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <Image
                  src={slide.imageUrl}
                  alt={slide.title || ""}
                  fill
                  className="object-contain p-2 md:p-6"
                  priority={index < 3}
                />
              </div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 z-20 bg-linear-to-t from-black/80 via-transparent to-transparent" />

              {/* Content - Adjusted padding for mobile */}
              <div className="absolute inset-0 z-30 flex items-end justify-center pb-4 md:pb-12 px-6 md:px-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="w-full max-w-[90%] md:max-w-[85%] space-y-1.5 md:space-y-4 text-center"
                >
                  {slide.title && (
                    <h2 className="text-lg md:text-3xl lg:text-4xl font-bold text-white font-(family-name:--font-outfit) leading-tight drop-shadow-xl line-clamp-2">
                      {slide.title}
                    </h2>
                  )}
                  {slide.description && itemsToShow === 1 && (
                    <p className="text-white/90 text-xs md:text-lg line-clamp-2 font-medium leading-relaxed drop-shadow-md mx-auto max-w-2xl hidden md:block">
                      {slide.description}
                    </p>
                  )}
                  
                  {slide.link && (
                    <div className="pt-1 md:pt-4">
                      <Link 
                        href={slide.link!}
                        className="inline-flex items-center gap-2 px-3 py-1.5 md:px-6 md:py-3 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-xl font-bold text-[10px] md:text-sm hover:bg-white hover:text-black transition-all shadow-xl group/btn"
                      >
                        İncele
                        <ArrowRight className="h-3 w-3 md:h-4 md:w-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Controls */}
      {slides.length > itemsToShow && (
        <>
          {/* Arrows */}
          <div className="absolute inset-y-0 left-2 md:left-4 flex items-center z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button 
              onClick={(e) => { e.stopPropagation(); prevSlide(); }}
              className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-primary-500 transition-all shadow-2xl"
              aria-label="Önceki"
            >
              <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
            </button>
          </div>
          <div className="absolute inset-y-0 right-2 md:right-4 flex items-center z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button 
              onClick={(e) => { e.stopPropagation(); nextSlide(); }}
              className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-primary-500 transition-all shadow-2xl"
              aria-label="Sonraki"
            >
              <ChevronRight className="h-4 w-4 md:h-6 md:w-6" />
            </button>
          </div>

          {/* Dots */}
          <div className="absolute bottom-3 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className="h-1 md:h-1.5 transition-all duration-300 rounded-full bg-white/20 overflow-hidden"
                style={{ 
                  width: current === idx ? "1.25rem" : "0.5rem",
                  backgroundColor: current === idx ? "var(--color-primary-500)" : "rgba(255,255,255,0.2)"
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
