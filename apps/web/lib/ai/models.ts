/**
 * Yapay zekâ model referansları ve görev tanımları (sunucu ve istemci ortak).
 *
 * Bir model "sağlayıcı:model" biçiminde saklanır:
 *   google:gemini-3.8-flash            → Google Gemini API (GEMINI_API_KEY)
 *   openrouter:anthropic/claude-sonnet-5.5 → OpenRouter (OPENROUTER_API_KEY)
 * Eski kayıtlar (önek yok) için: "/" içeriyorsa OpenRouter, yoksa Google kabul edilir.
 */

export type AiProvider = "google" | "openrouter";

export type AiTask = "writer" | "analyzer" | "image" | "tts";

export interface ModelRef {
  provider: AiProvider;
  model: string;
}

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  google: "Google Gemini",
  openrouter: "OpenRouter",
};

export const AI_TASKS: Record<AiTask, { label: string; description: string; output: "text" | "image" | "audio" }> = {
  writer: {
    label: "Haber yazımı",
    description: "RSS ve Google Trends önerilerinden makale yazar, yeniden yazar.",
    output: "text",
  },
  analyzer: {
    label: "Analiz ve özet",
    description: "RSS haberlerini puanlar, makale kalitesini ölçer, yorumları denetler ve özetler.",
    output: "text",
  },
  image: {
    label: "Kapak görseli",
    description: "Yazılan haber için kapak görseli üretir.",
    output: "image",
  },
  tts: {
    label: "Seslendirme",
    description: "Haberleri gerçekçi insan sesiyle okur (yalnızca Google).",
    output: "audio",
  },
};

/** Ekim 2026 itibarıyla önerilen güncel modeller */
export const DEFAULT_MODELS: Record<AiTask, Record<AiProvider, string | null>> = {
  writer: { google: "gemini-3.8-flash", openrouter: "google/gemini-3.8-flash" },
  analyzer: { google: "gemini-3.5-flash-lite", openrouter: "google/gemini-3.5-flash-lite" },
  image: { google: "gemini-3.1-flash-image", openrouter: "google/gemini-3.1-flash-image" },
  tts: { google: "gemini-3.8-flash-tts", openrouter: null },
};

/** Kullanımdan kalkmış / erişimi kısıtlanmış model aileleri: otomatik olarak görev varsayılanına yükseltilir */
const RETIRED_MODEL_PATTERNS = [
  /(^|\/)gemini-1\./,
  /(^|\/)gemini-2\.0/,
  /(^|\/)gemini-2\.5/,
  /(^|\/)gemini-pro(-vision)?$/,
  /(^|\/)imagen-[34]/,
];

export function isRetiredModel(model: string) {
  return RETIRED_MODEL_PATTERNS.some((re) => re.test(model));
}

export function parseModelRef(value: string | null | undefined): ModelRef | null {
  const raw = value?.trim();
  if (!raw) return null;
  const match = raw.match(/^(google|openrouter):(.+)$/);
  if (match) return { provider: match[1] as AiProvider, model: match[2].trim() };
  // Eski biçim: OpenRouter kimlikleri "sağlayıcı/model" şeklindedir
  return raw.includes("/") ? { provider: "openrouter", model: raw } : { provider: "google", model: raw };
}

export function formatModelRef(ref: ModelRef) {
  return `${ref.provider}:${ref.model}`;
}

/** Aynı modelin diğer sağlayıcıdaki karşılığı (yalnızca Google modelleri için anlamlı) */
export function crossProviderRef(ref: ModelRef): ModelRef | null {
  if (ref.provider === "google") return { provider: "openrouter", model: `google/${ref.model}` };
  if (ref.provider === "openrouter" && ref.model.startsWith("google/")) {
    return { provider: "google", model: ref.model.slice("google/".length).replace(/:.*$/, "") };
  }
  return null;
}

export function modelDisplayName(ref: ModelRef | null) {
  if (!ref) return "Seçilmedi";
  return `${ref.model} · ${PROVIDER_LABELS[ref.provider]}`;
}
