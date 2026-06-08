"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { triggerRssScan, triggerAiAnalysis } from "../actions";
import { Button } from "@/components/ui/Button";

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
    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
      <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
        <Button
          onClick={handleScan}
          disabled={scanning || analyzing}
          isLoading={scanning}
          variant="outline"
          className="flex-1 sm:flex-initial gap-2 text-xs font-semibold px-4 cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          Tümünü Tara
        </Button>
        <Button
          onClick={handleAnalyze}
          disabled={scanning || analyzing}
          isLoading={analyzing}
          className="flex-1 sm:flex-initial gap-2 text-xs font-semibold px-4 cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          AI Analiz ve Özet
        </Button>
      </div>
      {message && (
        <p className="text-xs text-muted-foreground text-right max-w-sm">{message}</p>
      )}
    </div>
  );
}

