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
}

export function SliderClient({ 
  slides, 
  interval = 5000, 
  autoPlay = true,
  height = "500px" 
}: SliderClientProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0); // 1 for right, -1 for left
  const [isHovering, setIsHovering] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (autoPlay && !isHovering && slides.length > 1) {
      timerRef.current = setInterval(nextSlide, interval);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, isHovering, interval, nextSlide, slides.length]);

  if (!slides.length) return null;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 1.1,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for "premium" feel
      },
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      },
    }),
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)",
      transition: { 
        delay: 0.4, 
        duration: 0.6,
        ease: "easeOut"
      } 
    },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  return (
    <div 
      className="relative w-full overflow-hidden rounded-[2.5rem] shadow-2xl border border-border/50 group"
      style={{ height }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 w-full h-full"
        >
          {/* Image */}
          <div className="relative w-full h-full">
            <Image
              src={slides[current].imageUrl}
              alt={slides[current].title || "Slide"}
              fill
              priority
              className="object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-linear-to-r from-black/60 via-transparent to-transparent hidden md:block" />
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex items-center md:items-end md:pb-16 px-6 md:px-12">
            <motion.div 
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-w-3xl space-y-4 md:space-y-6"
            >
              {slides[current].title && (
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white font-(family-name:--font-outfit) leading-[1.1] drop-shadow-lg">
                  {slides[current].title}
                </h2>
              )}
              {slides[current].description && (
                <p className="text-white/80 text-base md:text-xl line-clamp-3 md:line-clamp-none max-w-2xl font-medium leading-relaxed drop-shadow-md">
                  {slides[current].description}
                </p>
              )}
              
              {slides[current].link && (
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="pt-2"
                >
                  <Link 
                    href={slides[current].link!}
                    className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-white text-black rounded-2xl font-bold text-sm md:text-base hover:bg-primary-500 hover:text-white transition-all shadow-xl shadow-black/20 group/btn"
                  >
                    Detayları Gör
                    <ArrowRight className="h-4 w-4 md:h-5 md:w-5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      {slides.length > 1 && (
        <>
          {/* Arrows */}
          <div className="absolute inset-y-0 left-4 md:left-8 flex items-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button 
              onClick={(e) => { e.stopPropagation(); prevSlide(); }}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all"
              aria-label="Önceki"
            >
              <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
            </button>
          </div>
          <div className="absolute inset-y-0 right-4 md:right-8 flex items-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button 
              onClick={(e) => { e.stopPropagation(); nextSlide(); }}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all"
              aria-label="Sonraki"
            >
              <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
            </button>
          </div>

          {/* Dots & Progress */}
          <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > current ? 1 : -1);
                  setCurrent(idx);
                }}
                className="relative h-1.5 md:h-2 transition-all duration-300 rounded-full bg-white/30 overflow-hidden"
                style={{ width: current === idx ? "2rem" : "0.5rem" }}
              >
                {current === idx && autoPlay && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: isHovering ? "100%" : "100%" }}
                    transition={{ 
                      duration: interval / 1000, 
                      ease: "linear",
                      repeat: Infinity 
                    }}
                    className="absolute inset-0 bg-primary-500"
                  />
                )}
                {current === idx && !autoPlay && (
                  <div className="absolute inset-0 bg-primary-500" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
