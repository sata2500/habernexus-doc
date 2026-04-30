"use client";

import { useState } from "react";
import { RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { triggerRssScan, triggerAiAnalysis } from "../actions";

export function AdminTriggerButtons() {
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");

  const handleScan = async () => {
    setScanning(true);
    setMessage("");
    const res = await triggerRssScan();
    setScanning(false);
    if (res.success) {
      const added = "totalAdded" in res ? (res.totalAdded ?? 0) : ("added" in res ? (res.added ?? 0) : 0);
      setMessage(`✓ Tarama tamamlandı: ${added} yeni öğe eklendi.`);
    } else {
      setMessage(`⚠ Hata: ${res.error}`);
    }
    setTimeout(() => setMessage(""), 6000);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setMessage("");
    const res = await triggerAiAnalysis();
    setAnalyzing(false);
    if (res.success) {
      const msg =
        "analyzed" in res
          ? `✓ İşlem tamamlandı: ${res.analyzed} analiz edildi. ${!res.aiUsed ? `(Yapay Zeka atlandı: ${res.error || "Bilinmeyen hata"})` : ""}`
          : "✓ İşlem tamamlandı.";
      setMessage(msg);
    } else {
      setMessage(`⚠ Hata: ${res.error}`);
    }
    setTimeout(() => setMessage(""), 8000);
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={handleScan}
          disabled={scanning || analyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-blue-500/20"
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {scanning ? "Taranıyor..." : "Tümünü Tara"}
        </button>
        <button
          onClick={handleAnalyze}
          disabled={scanning || analyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-primary-500/20"
        >
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {analyzing ? "Analiz ediliyor..." : "AI Analiz ve Özet"}
        </button>
      </div>
      {message && (
        <p className="text-xs text-muted-foreground text-right max-w-sm">{message}</p>
      )}
    </div>
  );
}

