"use client";

import { useState, useEffect, useRef, useMemo, useSyncExternalStore } from "react";
import { Play, Pause, Square, Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  title: string;
}

const subscribeToSpeechSupport = () => () => undefined;
const getSpeechSupportSnapshot = () => typeof window !== "undefined" && "speechSynthesis" in window;
const getSpeechSupportServerSnapshot = () => false;

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function AudioPlayer({ content, title }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rate, setRate] = useState(1); // 0.75, 1, 1.25, 1.5, 2
  const isSupported = useSyncExternalStore(
    subscribeToSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  );
  const cleanText = useMemo(() => `${title}. ${stripHtml(content)}`.trim(), [content, title]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentSentenceIndex = useRef(0);
  const sentencesRef = useRef<string[]>([]);

  useEffect(() => {
    if (!isSupported) return;

    const updateVoices = () => {
      window.speechSynthesis.getVoices();
    };
    const previousHandler = window.speechSynthesis.onvoiceschanged;
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = previousHandler;
    };
  }, [isSupported]);

  // Sayfadan çıkıldığında seslendirmeyi durdur
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakSentence = (index: number) => {
    if (!window.speechSynthesis || index >= sentencesRef.current.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      return;
    }

    currentSentenceIndex.current = index;
    const textToSpeak = sentencesRef.current[index];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    const voices = window.speechSynthesis.getVoices();
    const trVoice =
      voices.find((v) => v.lang.startsWith("tr-") || v.lang === "tr") ||
      voices.find((v) => v.lang.startsWith("en"));
    if (trVoice) {
      utterance.voice = trVoice;
    }
    utterance.lang = "tr-TR";
    utterance.rate = rate;

    utterance.onend = () => {
      const nextIndex = index + 1;
      const totalSentences = sentencesRef.current.length;
      setProgress(Math.round((nextIndex / totalSentences) * 100));
      speakSentence(nextIndex);
    };

    utterance.onerror = (e) => {
      console.error("Speech synthesis sentence error:", e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = () => {
    if (!isSupported || !cleanText) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    // Mobil uyumluluk için cümle bazlı böl ve başlat
    window.speechSynthesis.cancel();

    const sentences = cleanText
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    sentencesRef.current = sentences;
    setIsPlaying(true);
    setIsPaused(false);
    setProgress(0);
    speakSentence(0);
  };

  const handlePause = () => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setIsPlaying(false);
    setIsPaused(true);
  };

  const handleStop = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    currentSentenceIndex.current = 0;
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying || isPaused) {
      // Oynatılıyorsa güncel hızla yeniden başlat
      setTimeout(() => {
        handlePlay();
      }, 50);
    }
  };

  if (!isSupported) {
    return null; // Tarayıcı desteklemiyorsa gösterme
  }

  return (
    <div className="w-full glass-strong border border-border/50 rounded-2xl p-4 flex flex-col gap-3 shadow-soft relative overflow-hidden transition-all duration-300">
      {/* Glow Süsleme Arka Planı */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary-500/5 blur-xl -z-10" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Sol Taraf: Durum ve Bilgi */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
            isPlaying
              ? "bg-primary-500/10 text-primary-500 animate-pulse-glow"
              : "bg-muted text-muted-foreground"
          )}>
            {isPlaying ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold font-(family-name:--font-outfit)">Haberi Sesli Dinle</h4>
            <p className="text-xs text-muted-foreground">
              {isPlaying ? "Makale seslendiriliyor..." : isPaused ? "Seslendirme duraklatıldı." : "AI okuyucu ile dinleyin."}
            </p>
          </div>
        </div>

        {/* Sağ Taraf: Hız Kontrolleri */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mr-1">Hız:</span>
          {[0.75, 1, 1.25, 1.5, 2].map((r) => (
            <button
              key={r}
              onClick={() => handleRateChange(r)}
              className={cn(
                "px-2 py-1 text-xs font-bold rounded-lg border border-border/40 transition-all cursor-pointer",
                rate === r
                  ? "bg-primary-600 border-primary-500 text-white shadow-sm"
                  : "bg-card/50 hover:bg-muted text-muted-foreground"
              )}
            >
              {r}x
            </button>
          ))}
        </div>
      </div>

      {/* İlerleme Çubuğu ve Oynatma Butonları */}
      <div className="flex items-center gap-4 mt-1">
        {/* Butonlar */}
        <div className="flex items-center gap-2 shrink-0">
          {isPlaying ? (
            <button
              onClick={handlePause}
              className="h-10 w-10 rounded-xl bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center transition-all shadow-md shadow-primary-500/20 active:scale-95 cursor-pointer"
              title="Duraklat"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className="h-10 w-10 rounded-xl bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center transition-all shadow-md shadow-primary-500/20 active:scale-95 cursor-pointer"
              title="Başlat"
            >
              <Play className="h-4 w-4 fill-current" />
            </button>
          )}

          {(isPlaying || isPaused || progress > 0) && (
            <button
              onClick={handleStop}
              className="h-10 w-10 rounded-xl bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-all border border-border/50 active:scale-95 cursor-pointer"
              title="Durdur"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          )}
        </div>

        {/* İlerleme */}
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1 h-2 bg-muted rounded-full overflow-hidden border border-border/30">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-muted-foreground min-w-[32px] text-right">
            %{progress}
          </span>
        </div>
      </div>
    </div>
  );
}
