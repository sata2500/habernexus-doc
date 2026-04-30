import { getSystemSettings } from "../rss-feeds/cron-actions";
import { AiWriterSettingsCard } from "./components/AiWriterSettingsCard";
import { AiWriterAutomationCard } from "./components/AiWriterAutomationCard";
import { Wand2, Sparkles, BrainCircuit, Rocket, Users, Cpu } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

interface AiModel {
  id: string;
  name: string;
  description: string | null;
  type: "TEXT" | "IMAGE" | "MULTIMODAL";
  isFree: boolean;
  supportsSearch: boolean;
  supportsVision: boolean;
  supportsT2I: boolean;
  supportsI2I: boolean;
}

export default async function AdminAiWriterPage() {
  const settings = await getSystemSettings();
  const allModels = await prisma.aiModel.findMany({
    where: { isActive: true },
    orderBy: { type: "asc" }
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-(family-name:--font-outfit) flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              < Wand2 className="h-6 w-6 text-purple-500" />
            </div>
            AI Yazar Merkezi
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Gemini 3.1 ve 2.5 Flash modellerini kullanarak tam otomatik haber araştırma, yazım ve görsel üretim süreçlerini yönetin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/ai-writer/models"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-primary-500/20"
          >
            <Cpu className="h-4 w-4" />
            Model Merkezi
          </Link>
          <Link 
            href="/admin/ai-writer/personas"
            className="flex items-center gap-2 px-5 py-2.5 bg-muted hover:bg-muted/80 rounded-2xl font-bold text-sm transition-all active:scale-95 border border-border"
          >
            <Users className="h-4 w-4 text-primary-500" />
            Personaları Yönet
          </Link>
        </div>
      </div>

      {/* ── İstatistikler / Bilgi ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-strong rounded-3xl p-6 border border-border shadow-soft flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Aktif Model</p>
            <p className="font-bold text-lg">{settings.aiWriterModel}</p>
          </div>
        </div>
        <div className="glass-strong rounded-3xl p-6 border border-border shadow-soft flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Otomasyon</p>
            <p className="font-bold text-lg">{settings.aiWriterAutoEnabled ? "Aktif" : "Devre Dışı"}</p>
          </div>
        </div>
        <div className="glass-strong rounded-3xl p-6 border border-border shadow-soft flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Rocket className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Sıklık</p>
            <p className="font-bold text-lg">Günde {(24 / parseInt(settings.aiWriterAutoCron.split("/")[1] || "24")).toFixed(0)} Kez</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <AiWriterSettingsCard 
          initialPrompt={settings.aiWriterPrompt}
          initialImagePrompt={settings.aiWriterImagePrompt}
          initialModel={settings.aiWriterModel}
          initialImageModel={settings.aiWriterImageModel}
          initialUseRssImage={settings.aiWriterUseRssImage}
          initialSearchEnabled={settings.aiWriterSearchEnabled}
          initialAnalyzerModel={settings.aiAnalyzerModel}
          availableModels={allModels as unknown as AiModel[]}
        />
        <AiWriterAutomationCard 
          enabled={settings.aiWriterAutoEnabled}
          count={settings.aiWriterAutoCount}
          cron={settings.aiWriterAutoCron}
        />
      </div>

      <div className="bg-muted/30 border border-border rounded-3xl p-8 text-center space-y-4">
        <h3 className="font-bold text-xl">Sistem Nasıl Çalışır?</h3>
        <p className="text-sm text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          AI Yazar, RSS kaynaklarından gelen en iyi haber önerilerini alır. Önce <strong>Google Arama Grounding</strong> kullanarak 
          konu hakkında en güncel bilgileri internetten toplar. Ardından seçtiğiniz yazım modeline göre profesyonel bir makale oluşturur. 
          Eş zamanlı olarak <strong>Flash Image (Nano Banana)</strong> motoru, haberin orijinal görselini ve başlığını referans alarak 
          gerçekçi bir kapak fotoğrafı tasarlar. Tüm bu süreç sonucunda tam teşekküllü bir haber saniyeler içinde yayına hazır hale gelir.
        </p>
      </div>
    </div>
  );
}
