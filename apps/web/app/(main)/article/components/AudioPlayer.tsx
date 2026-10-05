"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play, Volume2, Loader2 } from "lucide-react";
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

  const startBrowserFallback = (reason?: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatus("error");
      setMessage("Seslendirme şu anda kullanılamıyor.");
      return;
    }
    window.speechSynthesis.cancel();
    const body = stripHtml(content);
    // Gövde başlıkla başlıyorsa başlık ikinci kez okunmasın
    const text = body.toLocaleLowerCase("tr").startsWith(title.trim().toLocaleLowerCase("tr")) ? body : `${title}. ${body}`;
    const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean);
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
    setMessage(`${reason ? `${reason} ` : "Gelişmiş ses şu an hazır değil. "}Şimdilik tarayıcı sesi kullanılıyor.`);
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
          startBrowserFallback(data.error);
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

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length];
    changeRate(next);
  };

  const isBusy = status === "preparing";
  const isPlaying = status === "playing" || status === "fallback";
  const progress = duration ? (current / duration) * 100 : 0;
  const statusText = message || (status === "idle" && !duration ? "Yapay zekâ ile gerçekçi insan sesi" : "");

  return (
    <div className="w-full bg-card/70 border border-border rounded-2xl px-3 py-2.5 sm:px-4 flex items-center gap-3 shadow-soft">
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

      <button
        type="button"
        onClick={togglePlay}
        disabled={isBusy}
        className="h-10 w-10 shrink-0 rounded-full bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center shadow-md shadow-primary-500/20 active:scale-95 transition-all disabled:opacity-70 cursor-pointer"
        aria-label={isPlaying ? "Duraklat" : "Haberi sesli dinle"}
      >
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current translate-x-px" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold font-display truncate flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5 shrink-0 text-primary-500" /> Sesli dinle
          </span>
          {duration > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
              {formatTime(current)} / {formatTime(duration)}
            </span>
          )}
        </div>
        {statusText ? (
          <p className="text-[11px] leading-4 text-muted-foreground truncate mt-0.5" aria-live="polite" title={statusText}>{statusText}</p>
        ) : (
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={current}
            disabled={!duration}
            onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }}
            className="block w-full h-1.5 mt-1.5 accent-primary-500 cursor-pointer disabled:cursor-default"
            style={{ background: `linear-gradient(to right, var(--color-primary-500) ${progress}%, var(--muted) ${progress}%)`, borderRadius: 9999 }}
            aria-label="Konum"
          />
        )}
      </div>

      <button
        type="button"
        onClick={cycleRate}
        className="h-8 min-w-10 shrink-0 px-1.5 rounded-lg border border-border bg-card text-xs font-bold tabular-nums text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
        aria-label={`Okuma hızı ${rate}x, değiştirmek için dokunun`}
        title="Okuma hızı"
      >
        {rate}x
      </button>

      <label className="shrink-0">
        <span className="sr-only">Okuyucu sesi</span>
        <select
          value={voice}
          onChange={(e) => { if (isTtsVoiceId(e.target.value)) changeVoice(e.target.value); }}
          className="h-8 w-[6.75rem] sm:w-auto rounded-lg border border-border bg-card px-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          title="Okuyucu sesi"
        >
          {(Object.keys(TTS_VOICES) as TtsVoiceId[]).map((id) => (
            <option key={id} value={id}>{TTS_VOICES[id].gender} · {TTS_VOICES[id].label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
