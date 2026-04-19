"use client";

import { useState } from "react";
import { Sparkles, Save, Loader2, Wand2, Image as ImageIcon, AlertCircle } from "lucide-react";
import { updateAiWriterSettings } from "../../rss-feeds/actions";

interface Props {
  initialPrompt: string;
  initialImagePrompt: string;
  initialModel: string;
  initialImageModel: string;
}

// ── Metin Yazım Modelleri (Google Search Grounding destekli) ──────────────────
const TEXT_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Ücretsiz - Önerilen)", type: "free" },
  { id: "gemini-3.1-flash", name: "Gemini 3.1 Flash (Ücretsiz)", type: "free" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite (Ücretsiz - Ekonomik)", type: "free" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Ücretli)", type: "paid" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro (Ücretli - En Zeki)", type: "paid" },
];

// ── Görsel Üretim Modelleri (Imagen & Nano Banana) ─────────────────────────
// Kaynak: https://ai.google.dev/gemini-api/docs/image-generation
const IMAGE_MODELS = [
  {
    id: "imagen-3.0-generate-002",
    name: "🖼️ Imagen 3.0 (Önerilen)",
    desc: "Ücretsiz Katman • AI Studio'da Imagen Requests olarak listelenir",
    type: "free",
  },
  {
    id: "imagen-4.0-fast-generate-001",
    name: "🖼️ Imagen 4.0 Fast (Ücretli)",
    desc: "Ücretli • Çok daha hızlı ve gerçekçi (Paid/Billing gerektirir)",
    type: "paid",
  },
  {
    id: "gemini-2.5-flash-image",
    name: "🍌 Nano Banana (Gemini 2.5 Image)",
    desc: "Ücretsiz • Multimodal altyapı kullanır",
    type: "free",
  },
  {
    id: "gemini-3.1-flash-image-preview",
    name: "🍌🍌 Nano Banana 2 (Gemini 3.1 Image)",
    desc: "Ücretli • Pro seviye zeka + Flash hızı",
    type: "paid",
  },
];

export function AiWriterSettingsCard({
  initialPrompt,
  initialImagePrompt,
  initialModel,
  initialImageModel,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [imagePrompt, setImagePrompt] = useState(initialImagePrompt);
  const [model, setModel] = useState(initialModel);
  const [imageModel, setImageModel] = useState(initialImageModel);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedImageModel = IMAGE_MODELS.find(m => m.id === imageModel);

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    const res = await updateAiWriterSettings({ prompt, imagePrompt, model, imageModel });
    if (res.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="glass-strong rounded-3xl border border-border overflow-hidden shadow-2xl">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-bold font-(family-name:--font-outfit)">AI Yazar & Model Seçimi</h3>
            <p className="text-xs text-muted-foreground">Metin ve Görsel Üretim Motorlarını Yönetin</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary-500/20 active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {success ? "Kaydedildi!" : "Ayarları Kaydet"}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* ── Metin Modeli ── */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            Haber Yazım Modeli
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {TEXT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Google Search grounding ile internetten araştırarak haber makalesi yazar.</p>
        </div>

        {/* ── Görsel Modeli ── */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
            Görsel Üretim Modeli (Nano Banana Serisi)
          </label>
          <div className="grid grid-cols-1 gap-2">
            {IMAGE_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setImageModel(m.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  imageModel === m.id
                    ? "border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/40"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{m.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    m.type === "free"
                      ? "bg-green-500/10 text-green-500"
                      : "bg-amber-500/10 text-amber-600"
                  }`}>
                    {m.type === "free" ? "Ücretsiz" : "Ücretli"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Seçilen görsel model uyarısı ── */}
        {selectedImageModel?.type === "free" && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-3 flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <span>
              <strong>Nano Banana (Ücretsiz):</strong> Günde ~1500 istek, dakikada 15 istek limiti. Kota dolduğunda sistem RSS'ten gelen orijinal görseli kullanacak.
            </span>
          </div>
        )}

        {/* ── Makale Promptu ── */}
        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Makale Yazım Talimatı (System Prompt)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="w-full bg-muted/30 border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all resize-none"
            placeholder="Örn: Sen profesyonel bir haber yazarısın. Haberleri Türkçe, akıcı, SEO uyumlu yaz..."
          />
        </div>

        {/* ── Görsel Promptu ── */}
        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-blue-500" />
            Görsel Üretim Talimatı (İngilizce önerilir)
          </label>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            rows={3}
            className="w-full bg-muted/30 border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
            placeholder="Örn: Professional, photorealistic editorial news photography. Dramatic lighting, high quality..."
          />
          <p className="text-xs text-muted-foreground">Haberin başlığı bu talimata otomatik eklenir. İngilizce promptlar görsel modellerinde daha iyi sonuç verir.</p>
        </div>
      </div>
    </div>
  );
}
