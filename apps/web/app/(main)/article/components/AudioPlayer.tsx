"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play, Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_TTS_VOICE, normalizeTtsVoice, TTS_VOICES, type TtsVoiceId } from "@/lib/tts-voices";
import { reportListen, setListening } from "@/lib/article-session";

interface Props {
  articleId: string;
  content: string;
  title: string;
}

const VOICE_STORAGE_KEY = "hn_tts_voice";
const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

type Status = "idle" | "preparing" | "playing" | "paused" | "error";

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
    return normalizeTtsVoice(localStorage.getItem(VOICE_STORAGE_KEY));
  } catch {
    return DEFAULT_TTS_VOICE;
  }
}

/** Tarayıcı sesinin Türkçe ortalama hızı (karakter/sn, 1x). Süre bu değerle tahmin edilir. */
const BROWSER_CHARS_PER_SECOND = 14;

interface Speech {
  sentences: string[];
  /** Her cümlenin metindeki başlangıç konumu (karakter) */
  offsets: number[];
  total: number;
  /** Okunan son konum (karakter) */
  spoken: number;
  /** Okunan cümle */
  index: number;
}

/**
 * Haberi gerçekçi insan sesiyle (Gemini TTS) okur.
 * Ses ilk istekte üretilip saklanır; sonraki dinleyiciler hazır dosyayı alır.
 * Servis kullanılamazsa tarayıcının yerleşik sesine düşer; bu durumda da süre (tahmini),
 * ilerleme, sarma, duraklatma ve hız değişikliği çalışır. Dinleme ilerlemesi okuma oturumuna
 * bildirilir: haberi sonuna kadar dinlemek de "okundu" sayılır.
 */
export function AudioPlayer({ articleId, content, title }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlCache = useRef(new Map<TtsVoiceId, string>());
  const speech = useRef<Speech | null>(null);
  // Tarayıcı sesinde iptal edilen eski okumaların olaylarını yok saymak için
  const generation = useRef(0);
  // Kayıtlı tercih (sunucuda varsayılan ses), kullanıcı seçimi onu geçersiz kılar
  const storedVoice = useSyncExternalStore(subscribeNoop, readStoredVoice, () => DEFAULT_TTS_VOICE);
  const [chosenVoice, setVoice] = useState<TtsVoiceId | null>(null);
  const voice = chosenVoice ?? storedVoice;
  const [mode, setMode] = useState<"audio" | "browser">("audio");
  const [status, setStatus] = useState<Status>("idle");
  const [rate, setRate] = useState<number>(1);
  const rateRef = useRef(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState("");

  // Sayfadan çıkarken her türlü seslendirmeyi durdur
  useEffect(() => {
    const audio = audioRef.current;
    const gen = generation;
    return () => {
      audio?.pause();
      gen.current++;
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
      setListening(false);
    };
  }, []);

  // ── Tarayıcı sesi ──
  const browserSeconds = (chars: number, r = rateRef.current) => chars / BROWSER_CHARS_PER_SECOND / r;

  const prepareSpeech = (): Speech => {
    if (speech.current) return speech.current;
    const body = stripHtml(content);
    // Gövde başlıkla başlıyorsa başlık ikinci kez okunmasın
    const text = body.toLocaleLowerCase("tr").startsWith(title.trim().toLocaleLowerCase("tr")) ? body : `${title}. ${body}`;
    const sentences = text.split(/(?<=[.?!…])\s+/).filter(Boolean);
    const offsets: number[] = [];
    let total = 0;
    for (const sentence of sentences) { offsets.push(total); total += sentence.length + 1; }
    speech.current = { sentences, offsets, total, spoken: 0, index: 0 };
    return speech.current;
  };

  const reportBrowserProgress = (sp: Speech, playing: boolean) => {
    setCurrent(browserSeconds(sp.spoken));
    setDuration(browserSeconds(sp.total));
    reportListen((sp.spoken / sp.total) * 100, playing, browserSeconds(sp.total - sp.spoken));
  };

  const speakFrom = (index: number) => {
    const sp = prepareSpeech();
    const synth = window.speechSynthesis;
    const gen = ++generation.current;
    synth.cancel();
    sp.index = Math.max(0, Math.min(index, sp.sentences.length - 1));
    sp.spoken = sp.offsets[sp.index];
    const trVoice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("tr"));
    for (let i = sp.index; i < sp.sentences.length; i++) {
      const u = new SpeechSynthesisUtterance(sp.sentences[i]);
      u.lang = "tr-TR";
      u.rate = rateRef.current;
      if (trVoice) u.voice = trVoice;
      u.onstart = () => {
        if (gen !== generation.current) return;
        sp.index = i;
        sp.spoken = sp.offsets[i];
        reportBrowserProgress(sp, true);
      };
      u.onboundary = (e) => {
        if (gen !== generation.current) return;
        sp.spoken = sp.offsets[i] + e.charIndex;
        reportBrowserProgress(sp, true);
      };
      if (i === sp.sentences.length - 1) {
        u.onend = () => {
          if (gen !== generation.current) return;
          sp.spoken = sp.total;
          reportBrowserProgress(sp, false);
          sp.index = 0;
          sp.spoken = 0;
          setCurrent(0);
          setStatus("idle");
        };
      }
      synth.speak(u);
    }
    setStatus("playing");
    reportBrowserProgress(sp, true);
  };

  const startBrowserFallback = (reason?: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatus("error");
      setMessage("Seslendirme şu anda kullanılamıyor.");
      return;
    }
    audioRef.current?.pause();
    setMode("browser");
    const note = `${reason ? `${reason} ` : "Gelişmiş ses şu an hazır değil. "}Şimdilik tarayıcı sesi kullanılıyor.`;
    setMessage(note);
    // Bilgi notu bir süre sonra kalkar; yerine konum çubuğu gelir (sarma yapılabilsin)
    setTimeout(() => setMessage((m) => (m === note ? "" : m)), 5000);
    speakFrom(speech.current?.index ?? 0);
  };

  const pauseBrowser = () => {
    generation.current++;
    window.speechSynthesis.cancel();
    setStatus("paused");
    setListening(false);
  };

  // ── Gelişmiş ses (dosya) ──
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
    audio.playbackRate = rateRef.current;
    try {
      await audio.play();
      setMessage("");
    } catch {
      setStatus("error");
      setMessage("Ses oynatılamadı. Tekrar deneyin.");
    }
  };

  const togglePlay = () => {
    if (mode === "browser") {
      if (status === "playing") pauseBrowser();
      else speakFrom(speech.current?.index ?? 0);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (status === "playing") audio.pause();
    else void loadAndPlay(voice);
  };

  const seek = (seconds: number) => {
    if (mode === "browser") {
      const sp = prepareSpeech();
      const chars = seconds * BROWSER_CHARS_PER_SECOND * rateRef.current;
      let index = 0;
      while (index + 1 < sp.offsets.length && sp.offsets[index + 1] <= chars) index++;
      if (status === "playing") speakFrom(index);
      else {
        sp.index = index;
        sp.spoken = sp.offsets[index];
        reportBrowserProgress(sp, false);
      }
      return;
    }
    if (audioRef.current) audioRef.current.currentTime = seconds;
  };

  const changeVoice = (next: TtsVoiceId) => {
    if (next === voice) return;
    setVoice(next);
    try { localStorage.setItem(VOICE_STORAGE_KEY, next); } catch {}
    const wasActive = status === "playing" || status === "preparing";
    audioRef.current?.pause();
    if (mode === "browser") { generation.current++; window.speechSynthesis.cancel(); }
    // Yeni ses denenirken gelişmiş sese geri dönülür
    setMode("audio");
    speech.current = null;
    setCurrent(0);
    setDuration(0);
    setStatus("idle");
    setMessage("");
    if (wasActive) void loadAndPlay(next);
  };

  const changeRate = (next: number) => {
    setRate(next);
    rateRef.current = next;
    if (audioRef.current) audioRef.current.playbackRate = next;
    if (mode === "browser" && speech.current) {
      // Tarayıcı sesinde hız yalnızca yeni cümlelere uygulanır: okunan cümleden yeniden başlatılır
      if (status === "playing") speakFrom(speech.current.index);
      else reportBrowserProgress(speech.current, false);
    }
  };

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length];
    changeRate(next);
  };

  const isBusy = status === "preparing";
  const isPlaying = status === "playing";
  const progress = duration ? (current / duration) * 100 : 0;
  const approx = mode === "browser" ? "≈ " : "";
  const statusText = message || (status === "idle" && !duration ? "Yapay zekâ ile gerçekçi insan sesi" : "");

  return (
    <div className="w-full bg-card/70 border border-border rounded-2xl px-3 py-2.5 sm:px-4 flex items-center gap-3 shadow-soft">
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setStatus("playing")}
        onPause={() => { setStatus((s) => (s === "playing" ? "paused" : s)); setListening(false); }}
        onEnded={() => { reportListen(100, false, 0); setStatus("idle"); setCurrent(0); }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCurrent(a.currentTime);
          if (a.duration > 0) reportListen((a.currentTime / a.duration) * 100, !a.paused, (a.duration - a.currentTime) / (a.playbackRate || 1));
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onWaiting={() => setMessage("Yükleniyor…")}
        onPlaying={() => setMessage("")}
        onError={() => { if (status !== "idle" && mode === "audio") startBrowserFallback(); }}
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
              {approx}{formatTime(current)} / {approx}{formatTime(duration)}
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
            onChange={(e) => seek(Number(e.target.value))}
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

      <div role="radiogroup" aria-label="Okuyucu sesi" className="shrink-0 flex h-8 rounded-lg border border-border bg-card p-0.5">
        {(Object.keys(TTS_VOICES) as TtsVoiceId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === voice}
            onClick={() => changeVoice(id)}
            className={cn(
              "px-2 sm:px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer",
              id === voice ? "bg-primary-600 text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {TTS_VOICES[id].label}
          </button>
        ))}
      </div>
    </div>
  );
}
