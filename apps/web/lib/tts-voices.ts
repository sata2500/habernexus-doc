/** Seslendirme sesleri (sunucu ve istemci ortak). voiceName: Gemini TTS hazır ses adı. */
export const TTS_VOICES = {
  "kadin-1": { voiceName: "Kore", label: "Kadın" },
  "erkek-1": { voiceName: "Charon", label: "Erkek" },
} as const;

export type TtsVoiceId = keyof typeof TTS_VOICES;

export const DEFAULT_TTS_VOICE: TtsVoiceId = "kadin-1";

export function isTtsVoiceId(value: unknown): value is TtsVoiceId {
  return typeof value === "string" && value in TTS_VOICES;
}

/** Eski 4 sesli sürümden kalan tercihleri (kadin-2, erkek-2) aynı cinsiyetteki sese çevirir */
export function normalizeTtsVoice(value: unknown): TtsVoiceId {
  if (isTtsVoiceId(value)) return value;
  if (typeof value === "string" && value.startsWith("erkek")) return "erkek-1";
  return DEFAULT_TTS_VOICE;
}
