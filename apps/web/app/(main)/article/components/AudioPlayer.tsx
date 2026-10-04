"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play, RotateCcw, RotateCw, Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_TTS_VOICE, isTtsVoiceId, TTS_VOICES, type TtsVoiceId } from "@/lib/tts-voices";

interface Props {
  articleId: string;
  content: string;
  title: string;
}

const VOICE_STORAGE_KEY = "hn_tts_voice";
const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

type Status = "idle" | "preparing" | "playing" | "paused" | "error" | "fallback";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

const subscribeNoop = () => () => {};

function readStoredVoice(): TtsVoiceId {
  try {
    const stored = localStorage.getItem(VOICE_STORAGE_KEY);
    return isTtsVoiceId(stored) ? stored : DEFAULT_TTS_VOICE;
  } catch {
    return DEFAULT_TTS_VOICE;
  }
}

/**
 * Haberi gerçekçi insan sesiyle (Gemini TTS) okur.
 * Ses ilk istekte üretilip saklanır; sonraki dinleyiciler hazır dosyayı alır.
 * Servis kullanılamazsa tarayıcının yerleşik sesine düşer.
 */
export function AudioPlayer({ articleId, content, title }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlCache = useRef(new Map<TtsVoiceId, string>());
  // Kayıtlı tercih (sunucuda varsayılan ses), kullanıcı seçimi onu geçersiz kılar
  const storedVoice = useSyncExternalStore(subscribeNoop, readStoredVoice, () => DEFAULT_TTS_VOICE);
  const [chosenVoice, setVoice] = useState<TtsVoiceId | null>(null);
  const voice = chosenVoice ?? storedVoice;
  const [status, setStatus] = useState<Status>("idle");
  const [rate, setRate] = useState<number>(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState("");

  // Sayfadan çıkarken her türlü seslendirmeyi durdur
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const startBrowserFallback = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatus("error");
      setMessage("Seslendirme şu anda kullanılamıyor.");
      return;
    }
    window.speechSynthesis.cancel();
    const sentences = `${title}. ${stripHtml(content)}`.split(/(?<=[.?!])\s+/).filter(Boolean);
    const trVoice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("tr"));
    sentences.forEach((sentence, i) => {
      const u = new SpeechSynthesisUtterance(sentence);
      u.lang = "tr-TR";
      u.rate = rate;
      if (trVoice) u.voice = trVoice;
      if (i === sentences.length - 1) u.onend = () => setStatus("idle");
      window.speechSynthesis.speak(u);
    });
    setStatus("fallback");
    setMessage("Gelişmiş ses şu an hazır değil, tarayıcı sesi kullanılıyor.");
  };

  const loadAndPlay = async (targetVoice: TtsVoiceId) => {
    const audio = audioRef.current;
    if (!audio) return;

    let url = urlCache.current.get(targetVoice);
    if (!url) {
      setStatus("preparing");
      setMessage("Ses hazırlanıyor… İlk dinlemede birkaç saniye sürebilir.");
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, voice: targetVoice }),
        });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          if (res.status === 429) {
            setStatus("error");
            setMessage(data.error || "Çok fazla istek. Biraz sonra tekrar deneyin.");
            return;
          }
          startBrowserFallback();
          return;
        }
        url = data.url;
        urlCache.current.set(targetVoice, url);
      } catch {
        startBrowserFallback();
        return;
      }
    }

    if (audio.src !== url) {
      audio.src = url;
      setCurrent(0);
      setDuration(0);
    }
    audio.playbackRate = rate;
    try {
      await audio.play();
      setMessage("");
    } catch {
      setStatus("error");
      setMessage("Ses oynatılamadı. Tekrar deneyin.");
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (status === "fallback") {
      window.speechSynthesis.cancel();
      setStatus("idle");
      setMessage("");
      return;
    }
    if (!audio) return;
    if (status === "playing") audio.pause();
    else void loadAndPlay(voice);
  };

  const changeVoice = (next: TtsVoiceId) => {
    if (next === voice) return;
    setVoice(next);
    try { localStorage.setItem(VOICE_STORAGE_KEY, next); } catch {}
    const wasActive = status === "playing" || status === "preparing";
    audioRef.current?.pause();
    if (status === "fallback") window.speechSynthesis.cancel();
    setCurrent(0);
    setDuration(0);
    setStatus("idle");
    if (wasActive) void loadAndPlay(next);
  };

  const changeRate = (next: number) => {
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const seekBy = (delta: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = Math.min(Math.max(0, audio.currentTime + delta), duration);
  };

  const isBusy = status === "preparing";
  const isPlaying = status === "playing" || status === "fallback";
  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div className="w-full bg-card/70 border border-border rounded-2xl p-4 flex flex-col gap-3 shadow-soft">
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setStatus("playing")}
        onPause={() => setStatus((s) => (s === "playing" ? "paused" : s))}
        onEnded={() => { setStatus("idle"); setCurrent(0); }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onWaiting={() => setMessage("Yükleniyor…")}
        onPlaying={() => setMessage("")}
        onError={() => { if (status !== "idle") startBrowserFallback(); }}
      />

      {/* Başlık + ses seçimi */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center",
          isPlaying ? "bg-primary-500/10 text-primary-500" : "bg-muted text-muted-foreground"
        )}>
          <Volume2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold font-display">Haberi Sesli Dinle</h4>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {message || "Yapay zekâ ile gerçekçi insan sesi. Bir ses seçin."}
          </p>
        </div>
      </div>

      <div role="radiogroup" aria-label="Okuyucu sesi" className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {(Object.keys(TTS_VOICES) as TtsVoiceId[]).map((id) => {
          const v = TTS_VOICES[id];
          const active = id === voice;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => changeVoice(id)}
              className={cn(
                "h-10 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1",
                active
                  ? "bg-primary-500 border-primary-500 text-white shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {v.gender} <span className={cn("font-medium", active ? "text-white/80" : "text-muted-foreground/80")}>· {v.label}</span>
            </button>
          );
        })}
      </div>

      {/* Oynatma kontrolleri */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => seekBy(-15)}
          disabled={!duration}
          className="h-10 w-10 shrink-0 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
          aria-label="15 saniye geri"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          disabled={isBusy}
          className="h-12 w-12 shrink-0 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center shadow-md shadow-primary-500/20 active:scale-95 transition-all disabled:opacity-70 cursor-pointer"
          aria-label={isPlaying ? "Duraklat" : "Dinle"}
        >
          {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
        </button>
        <button
          type="button"
          onClick={() => seekBy(15)}
          disabled={!duration}
          className="h-10 w-10 shrink-0 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
          aria-label="15 saniye ileri"
        >
          <RotateCw className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={current}
            disabled={!duration}
            onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }}
            className="w-full h-2 accent-primary-500 cursor-pointer disabled:cursor-default"
            style={{ background: `linear-gradient(to right, var(--color-primary-500) ${progress}%, var(--muted) ${progress}%)`, borderRadius: 9999 }}
            aria-label="Konum"
          />
          <div className="flex justify-between text-[11px] font-medium text-muted-foreground tabular-nums">
            <span>{formatTime(current)}</span>
            <span>{duration ? formatTime(duration) : "--:--"}</span>
          </div>
        </div>
      </div>

      {/* Hız */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mr-1">Hız</span>
        {RATES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => changeRate(r)}
            className={cn(
              "min-h-8 min-w-10 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer",
              rate === r
                ? "bg-primary-600 border-primary-500 text-white"
                : "bg-card border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {r}x
          </button>
        ))}
      </div>
    </div>
  );
}
