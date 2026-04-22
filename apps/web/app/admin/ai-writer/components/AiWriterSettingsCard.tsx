"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Save, 
  Loader2, 
  Wand2, 
  Image as ImageIcon, 
  ChevronDown, 
  Check,
  Cpu,
  Zap,
  Info,
  MessageSquare,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { updateAiWriterSettings } from "../../rss-feeds/actions";

interface AiModel {
  id: string;
  name: string;
  description: string | null;
  type: "TEXT" | "IMAGE" | "MULTIMODAL";
  isFree: boolean;
}

interface Props {
  initialPrompt: string;
  initialImagePrompt: string;
  initialModel: string;
  initialImageModel: string;
  initialUseRssImage: boolean;
  initialSearchEnabled: boolean;
  initialAnalyzerModel: string;
  availableModels: AiModel[];
}

/**
 * Premium Stilize Seçim Bileşeni
 */
function StylishSelect({ 
  options, 
  value, 
  onChange, 
  label, 
  icon: Icon 
}: { 
  options: AiModel[], 
  value: string, 
  onChange: (val: string) => void,
  label: string,
  icon: any
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(o => o.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative space-y-2" ref={containerRef}>
      <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-medium shadow-sm hover:border-primary-500/50 transition-all outline-none text-left"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-2 w-2 rounded-full bg-primary-500 shrink-0 shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
          <span className="truncate dark:text-neutral-100 text-neutral-900">
            {selectedOption ? selectedOption.name : "Model Seçin..."}
          </span>
          {selectedOption?.isFree && (
            <span className="px-1.5 py-0.5 bg-green-500/10 text-green-600 text-[10px] rounded-md font-bold border border-green-500/20">Ücretsiz</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-50 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
              {options.length > 0 ? (
                options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex flex-col gap-0.5 px-4 py-3 rounded-xl text-left transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 group ${
                      value === opt.id ? "bg-primary-50 dark:bg-primary-500/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-sm font-bold truncate ${value === opt.id ? "text-primary-600 dark:text-primary-400" : "text-neutral-700 dark:text-neutral-200"}`}>
                        {opt.name}
                      </span>
                      {value === opt.id && <Check className="h-4 w-4 text-primary-500" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-400 font-mono truncate flex-1">{opt.id}</span>
                      {opt.isFree && <span className="text-[9px] font-bold text-green-500">FREE</span>}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-neutral-500">
                  <Cpu className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Aktif model bulunamadı.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AiWriterSettingsCard({
  initialPrompt,
  initialImagePrompt,
  initialModel,
  initialImageModel,
  initialUseRssImage,
  initialSearchEnabled,
  initialAnalyzerModel,
  availableModels,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [imagePrompt, setImagePrompt] = useState(initialImagePrompt);
  const [model, setModel] = useState(initialModel);
  const [imageModel, setImageModel] = useState(initialImageModel);
  const [useRssImage, setUseRssImage] = useState(initialUseRssImage);
  const [searchEnabled, setSearchEnabled] = useState(initialSearchEnabled);
  const [analyzerModel, setAnalyzerModel] = useState(initialAnalyzerModel);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const textModels = availableModels.filter(m => m.type === "TEXT" || m.type === "MULTIMODAL");
  const imageModels = availableModels.filter(m => m.type === "IMAGE");

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    const res = await (updateAiWriterSettings as any)({ 
      prompt, 
      imagePrompt, 
      model, 
      imageModel, 
      useRssImage, 
      searchEnabled,
      analyzerModel
    });
    if (res.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="glass-strong rounded-[2.5rem] border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-2xl transition-all">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-purple-600/5 to-blue-600/5 dark:from-purple-600/10 dark:to-blue-600/10 px-8 py-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20 shadow-inner">
            <Wand2 className="h-6 w-6 text-primary-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg font-(family-name:--font-outfit) text-neutral-900 dark:text-white">AI Yazar Ayarları</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Yapay zeka modellerini ve yazım parametrelerini yapılandırın.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary-500/25 active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {success ? "Kaydedildi!" : "Ayarları Kaydet"}
        </button>
      </div>

      <div className="p-8 space-y-10">
        {/* ── Modeller Seksiyonu ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StylishSelect 
            label="Makale Yazım Modeli"
            icon={Zap}
            value={model}
            onChange={setModel}
            options={textModels}
          />
          <StylishSelect 
            label="Görsel Üretim Modeli"
            icon={ImageIcon}
            value={imageModel}
            onChange={setImageModel}
            options={imageModels}
          />
          <StylishSelect 
            label="AI Analiz ve Özet Modeli"
            icon={Search}
            value={analyzerModel}
            onChange={setAnalyzerModel}
            options={textModels}
          />
        </div>

        {/* ── Prompt Ayarları ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Yazar Talimatı (Prompt)
            </label>
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-48 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-[1.5rem] px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 transition-all resize-none dark:text-neutral-200 text-neutral-800 group-hover:border-primary-500/20"
              />
              <div className="absolute bottom-4 right-4 h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Info className="h-4 w-4 text-neutral-400" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5" />
              Görsel Talimatı (Prompt)
            </label>
            <div className="relative group">
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="w-full h-48 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-[1.5rem] px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 transition-all resize-none dark:text-neutral-200 text-neutral-800 group-hover:border-primary-500/20"
              />
              <div className="absolute bottom-4 right-4 h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Info className="h-4 w-4 text-neutral-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Ek Seçenekler ── */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full flex items-center justify-between p-5 bg-neutral-50 dark:bg-neutral-900/50 rounded-[1.5rem] border border-neutral-200 dark:border-neutral-800 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-900">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-inner ${useRssImage ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                <ImageIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold dark:text-neutral-200 text-neutral-900">RSS Görselini Referans Al</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Orijinal görselden ilham alarak yeni içerik üretir.</p>
              </div>
            </div>
            <button
              onClick={() => setUseRssImage(!useRssImage)}
              className={`w-14 h-7 rounded-full transition-all relative shadow-inner ${useRssImage ? "bg-primary-600" : "bg-neutral-300 dark:bg-neutral-800"}`}
            >
              <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${useRssImage ? "translate-x-7" : ""}`} />
            </button>
          </div>
          
          <div className="flex-1 w-full flex items-center justify-between p-5 bg-neutral-50 dark:bg-neutral-900/50 rounded-[1.5rem] border border-neutral-200 dark:border-neutral-800 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-900">
             <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-inner ${searchEnabled ? "bg-amber-500/10 text-amber-500" : "bg-neutral-500/10 text-neutral-500"}`}>
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold dark:text-neutral-200 text-neutral-900">Google Arama Desteği</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Haberleri internetten araştırır ve doğrular.</p>
              </div>
            </div>
            <button
              onClick={() => setSearchEnabled(!searchEnabled)}
              className={`w-14 h-7 rounded-full transition-all relative shadow-inner ${searchEnabled ? "bg-primary-600" : "bg-neutral-300 dark:bg-neutral-800"}`}
            >
              <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${searchEnabled ? "translate-x-7" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Global stiller için CSS eklenmesi gerekebilir veya tailwind ile çözülebilir
const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);
