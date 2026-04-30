"use client";

import { useState } from "react";
import { 
  Cpu, 
  RefreshCw, 
  Search, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  Zap,
  Image as ImageIcon,
  MessageSquare
} from "lucide-react";
import { 
  syncModelsFromOpenRouter, 
  toggleModelActive, 
  deleteModel, 
  upsertManualModel 
} from "../actions";

interface AiModel {
  id: string;
  name: string;
  description: string | null;
  type: "TEXT" | "IMAGE" | "MULTIMODAL";
  isFree: boolean;
  isActive: boolean;
  supportsSearch: boolean;
  supportsVision: boolean;
  supportsT2I: boolean;
  supportsI2I: boolean;
}

interface Props {
  initialModels: AiModel[];
}

export function ModelManagerClient({ initialModels }: Props) {
  const [models, setModels] = useState(initialModels);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "TEXT" | "T2I" | "I2I" | "VISION">("ALL");
  const [syncing, setSyncing] = useState(false);

  const filteredModels = models.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase());
    
    let matchesFilter = true;
    if (filter === "TEXT") matchesFilter = m.type === "TEXT";
    else if (filter === "T2I") matchesFilter = m.supportsT2I;
    else if (filter === "I2I") matchesFilter = m.supportsI2I;
    else if (filter === "VISION") matchesFilter = m.supportsVision;

    return matchesSearch && matchesFilter;
  });

  const handleSync = async () => {
    setSyncing(true);
    const res = await syncModelsFromOpenRouter();
    if (res.success) {
      alert(`${res.count} model başarıyla senkronize edildi.`);
      window.location.reload();
    } else {
      alert("Hata: " + res.error);
    }
    setSyncing(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    const res = await toggleModelActive(id, active);
    if (res.success) {
      setModels(prev => prev.map(m => m.id === id ? { ...m, isActive: active } : m));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu modeli silmek istediğinize emin misiniz?")) return;
    const res = await deleteModel(id);
    if (res.success) {
      setModels(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleUpdateType = async (id: string, type: "TEXT" | "IMAGE" | "MULTIMODAL") => {
    const model = models.find(m => m.id === id);
    if (!model) return;
    const res = await upsertManualModel({ ...model, type });
    if (res.success) {
      setModels(prev => prev.map(m => m.id === id ? { ...m, type } : m));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20 shadow-inner">
            <Cpu className="h-7 w-7 text-primary-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-(family-name:--font-outfit)">AI Model Merkezi</h1>
            <p className="text-sm text-muted-foreground">OpenRouter ve özel modelleri dinamik olarak yönetin.</p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-primary-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Senkronize Ediliyor..." : "OpenRouter'dan Senkronize Et"}
        </button>
      </div>

      {/* ── Kontroller ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            placeholder="Model adı veya ID ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-medium"
          />
        </div>

        <div className="flex p-1 bg-muted/30 border border-border rounded-2xl overflow-x-auto no-scrollbar">
          {(["ALL", "TEXT", "T2I", "I2I", "VISION"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex-1 min-w-[60px] py-2 px-3 rounded-xl text-[10px] font-bold transition-all ${
                filter === t ? "bg-primary-600 text-white shadow-md" : "hover:bg-muted-foreground/10"
              }`}
            >
              {t === "ALL" ? "Hepsi" : t}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end px-4 py-2 bg-muted/10 rounded-2xl border border-border italic text-xs text-muted-foreground">
          Toplam {filteredModels.length} model listeleniyor.
        </div>
      </div>

      {/* ── Modeller Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModels.map((m) => (
          <div key={m.id} className={`glass-strong rounded-3xl border transition-all group relative overflow-hidden ${m.isActive ? "border-primary-500/30" : "border-border opacity-70"}`}>
            {/* Status Indicator */}
            <div className={`absolute top-0 right-0 h-1 w-full ${m.isActive ? "bg-primary-500" : "bg-muted"}`} />

            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    m.type === "IMAGE" ? "bg-blue-500/10 text-blue-500" : 
                    m.type === "MULTIMODAL" ? "bg-purple-500/10 text-purple-500" : 
                    "bg-orange-500/10 text-orange-500"
                  }`}>
                    {m.type === "IMAGE" ? <ImageIcon className="h-5 w-5" /> : 
                     m.type === "MULTIMODAL" ? <Sparkles className="h-5 w-5" /> : 
                     <MessageSquare className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight">{m.name}</h4>
                    <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">{m.id}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => handleToggle(m.id, !m.isActive)}
                  className={`p-2 rounded-xl transition-all ${m.isActive ? "bg-primary-500/10 text-primary-500" : "bg-muted text-muted-foreground hover:bg-muted-foreground/10"}`}
                >
                  {m.isActive ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </button>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                {m.description || "Açıklama bulunmuyor."}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {m.isFree && (
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-600 rounded-md text-[9px] font-bold border border-green-500/20">Ücretsiz</span>
                )}
                {m.supportsSearch && (
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-md text-[9px] font-bold border border-amber-500/20 flex items-center gap-1">
                    <Search className="h-2.5 w-2.5" />
                    Google Search
                  </span>
                )}
                {m.supportsI2I && (
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-md text-[9px] font-bold border border-blue-500/20">i2i</span>
                )}
                {m.supportsVision && (
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded-md text-[9px] font-bold border border-purple-500/20">Vision</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  value={m.type}
                  onChange={(e) => handleUpdateType(m.id, e.target.value as "TEXT" | "IMAGE" | "MULTIMODAL")}
                  className="w-full bg-muted/50 border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none cursor-pointer"
                >
                  <option value="TEXT">Metin (LLM)</option>
                  <option value="IMAGE">Görsel (T2I/i2i)</option>
                  <option value="MULTIMODAL">Gelişmiş (Vision)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-muted-foreground">Durum: <strong className={m.isActive ? "text-primary-500" : ""}>{m.isActive ? "Aktif" : "Pasif"}</strong></span>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border">
          <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Aradığınız kriterlere uygun model bulunamadı.</p>
        </div>
      )}
    </div>
  );
}
