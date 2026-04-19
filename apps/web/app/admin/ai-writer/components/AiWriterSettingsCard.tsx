"use client";

import { useState } from "react";
import { Sparkles, Save, Loader2, Wand2, Image as ImageIcon } from "lucide-react";
import { updateAiWriterSettings } from "../../rss-feeds/actions";

interface Props {
  initialPrompt: string;
  initialImagePrompt: string;
  initialModel: string;
  initialImageModel: string;
}

const AVAILABLE_MODELS = [
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro (En Zeki)" },
  { id: "gemini-3.1-flash", name: "Gemini 3.1 Flash (En Hızlı)" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite (Ekonomik)" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image (Görsel İçin)" },
  { id: "gemini-3.1-flash-image-preview", name: "Nano Banana 2 (4K Görsel)" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
];

export function AiWriterSettingsCard({ 
  initialPrompt, 
  initialImagePrompt,
  initialModel,
  initialImageModel
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [imagePrompt, setImagePrompt] = useState(initialImagePrompt);
  const [model, setModel] = useState(initialModel);
  const [imageModel, setImageModel] = useState(initialImageModel);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    const res = await updateAiWriterSettings({ 
      prompt, 
      imagePrompt,
      model,
      imageModel
    });
    if (res.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="glass-strong rounded-3xl border border-border overflow-hidden shadow-2xl">
      <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-bold font-(family-name:--font-outfit)">AI Yazar & Model Seçimi</h3>
            <p className="text-xs text-muted-foreground">İçerik ve Görsel Üretim Motorlarını Yönetin</p>
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
        {/* Model Selection Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Yazar Modeli</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Görsel Üretim Modeli</label>
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Makale Yazım Promptu (System Prompt)
          </label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            AI'ın haberi nasıl bir dille, hangi formatta ve hangi derinlikte yazacağını burada belirleyin. 
            Google Arama sonuçlarını bu talimatlara göre işleyecektir.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="w-full bg-muted/30 border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all resize-none"
            placeholder="AI için talimatları girin..."
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold flex items-center gap-2 text-foreground">
            <ImageIcon className="h-4 w-4 text-blue-500" />
            Görsel Üretim Promptu
          </label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Haber kapak görseli için temel stil talimatı. AI bu metnin sonuna haberin başlığını ekleyerek görsel üretecektir.
          </p>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            rows={3}
            className="w-full bg-muted/30 border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
            placeholder="Görsel stili talimatlarını girin..."
          />
        </div>

        <div className="bg-primary-500/5 border border-primary-500/10 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500 mt-0.5">
            <Wand2 className="h-4 w-4" />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p className="font-bold text-foreground mb-1">İpucu:</p>
            Promptlarda "HTML formatında yaz", "h2 ve p etiketleri kullan", "gerçekçi fotoğraf kalitesinde" gibi spesifik 
            yönergeler kullanmak sonuç kalitesini doğrudan etkiler. Gemini 3.1 modelleri oldukça zekidir, detaylı talimat verebilirsiniz.
          </div>
        </div>
      </div>
    </div>
  );
}
