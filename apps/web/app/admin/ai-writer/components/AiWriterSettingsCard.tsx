"use client";

import { useState } from "react";
import { Sparkles, Save, Loader2, Wand2, Image as ImageIcon, AlertCircle } from "lucide-react";
import { updateAiWriterSettings } from "../../rss-feeds/actions";

interface Props {
  initialPrompt: string;
  initialImagePrompt: string;
  initialModel: string;
  initialImageModel: string;
  initialUseRssImage: boolean;
}

const MODELS = [
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash (Önerilen - Hızlı)", type: "free" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet (En Kaliteli Yazım)", type: "paid" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B (Güçlü & Ücretsiz)", type: "free" },
  { id: "openai/gpt-4o", name: "GPT-4o (Standart)", type: "paid" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3 (Ekonomik)", type: "free" },
  { id: "google/gemini-pro-1.5", name: "Gemini 1.5 Pro", type: "paid" },
];

const IMAGE_MODELS = [
  {
    id: "flux",
    name: "🎨 Flux (Pollinations)",
    desc: "Ücretsiz • En yüksek kalite ve gerçekçilik (Sınırsız)",
    type: "free",
  },
  {
    id: "turbo",
    name: "⚡ Turbo (Pollinations)",
    desc: "Ücretsiz • Çok hızlı üretim, iyi kalite (Sınırsız)",
    type: "free",
  },
];

export function AiWriterSettingsCard({
  initialPrompt,
  initialImagePrompt,
  initialModel,
  initialImageModel,
  initialUseRssImage,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [imagePrompt, setImagePrompt] = useState(initialImagePrompt);
  const [model, setModel] = useState(initialModel);
  const [imageModel, setImageModel] = useState(initialImageModel);
  const [useRssImage, setUseRssImage] = useState(initialUseRssImage);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    // Provider parametresi backend'den kaldırıldığı için gönderilmiyor
    const res = await (updateAiWriterSettings as any)({ prompt, imagePrompt, model, imageModel, useRssImage });
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
            <h3 className="font-bold font-(family-name:--font-outfit)">AI Yazar Ayarları</h3>
            <p className="text-xs text-muted-foreground">Tüm modeller OpenRouter üzerinden çalışmaktadır.</p>
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

      <div className="p-6 space-y-8">
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
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Seçilen model OpenRouter üzerinden makale üretimi için kullanılır.</p>
        </div>

        {/* ── Görsel Modeli ── */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
            Görsel Üretim Motoru
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {IMAGE_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setImageModel(m.id)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  imageModel === m.id
                    ? "bg-blue-500/10 border-blue-500 shadow-sm"
                    : "bg-muted/30 border-border hover:border-blue-500/30"
                }`}
              >
                <p className="text-sm font-bold">{m.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Prompt Ayarları ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Yazar Talimatı (Prompt)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-500/50 resize-none font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Görsel Talimatı (Prompt)</label>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="w-full h-32 bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-500/50 resize-none font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${useRssImage ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">RSS Görselini Referans Al</p>
              <p className="text-[10px] text-muted-foreground">Varsa haber kaynağındaki görseli baz alarak yeni görsel üretir.</p>
            </div>
          </div>
          <button
            onClick={() => setUseRssImage(!useRssImage)}
            className={`w-12 h-6 rounded-full transition-all relative ${useRssImage ? "bg-primary-600" : "bg-muted"}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${useRssImage ? "translate-x-6" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
