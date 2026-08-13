"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Wand2,
  ListChecks,
  Search,
  BookOpen,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeArticleAction as adminAnalyze, rewriteArticleWithAIAction as adminRewrite } from "@/app/admin/actions";
import { analyzeArticleAction as authorAnalyze, rewriteArticleWithAIAction as authorRewrite } from "@/app/author/actions";

interface PlagiarismSource {
  url?: string;
  title?: string;
  matchPercent?: number;
}

interface AnalysisReportData {
  plagiarism?: {
    score?: number;
    aiProbability?: number;
    sources?: PlagiarismSource[];
    comment?: string;
  };
  seo?: {
    score?: number;
    hasHeadingStructure?: boolean;
    keywordSuggestions?: string[];
    comment?: string;
  };
  readability?: {
    score?: number;
    comment?: string;
  };
  suggestions?: string[];
}

interface ArticleAnalysisModalProps {
  articleId: string;
  articleTitle: string;
  userRole: "ADMIN" | "AUTHOR";
  initialData?: {
    plagiarismRate: number | null;
    seoScore: number | null;
    readabilityScore: number | null;
    qualityScore: number | null;
    analysisReport: unknown;
  };
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAnalysisComplete?: (updatedArticle: any) => void;
}

function CircularProgress({
  value,
  label,
  size = 100,
  strokeWidth = 8,
  isPlagiarism = false
}: {
  value: number | null;
  label: string;
  size?: number;
  strokeWidth?: number;
  isPlagiarism?: boolean;
}) {
  const val = value ?? 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (val / 100) * circumference;

  let colorClass = "stroke-primary-500 text-primary-500";
  let bgClass = "stroke-primary-500/10";
  
  if (value === null) {
    colorClass = "stroke-muted text-muted-foreground";
    bgClass = "stroke-muted/10";
  } else if (isPlagiarism) {
    if (val <= 30) {
      colorClass = "stroke-primary-500 text-primary-500";
      bgClass = "stroke-primary-500/10";
    } else if (val <= 60) {
      colorClass = "stroke-primary-500 text-primary-500";
      bgClass = "stroke-primary-500/10";
    } else {
      colorClass = "stroke-primary-500 text-primary-500";
      bgClass = "stroke-primary-500/10";
    }
  } else {
    if (val >= 70) {
      colorClass = "stroke-primary-500 text-primary-500";
      bgClass = "stroke-primary-500/10";
    } else if (val >= 40) {
      colorClass = "stroke-primary-500 text-primary-500";
      bgClass = "stroke-primary-500/10";
    } else {
      colorClass = "stroke-primary-500 text-primary-500";
      bgClass = "stroke-primary-500/10";
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-muted/20 border border-border/40 rounded-2xl">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            className={cn("transition-all duration-300", bgClass)}
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {value !== null && (
            <circle
              className={cn("transition-all duration-500 ease-out", colorClass)}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx={size / 2}
              cy={size / 2}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold tracking-tight">
            {value !== null ? `${val}%` : "—"}
          </span>
        </div>
      </div>
      <span className="mt-3 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">{label}</span>
    </div>
  );
}

export function ArticleAnalysisModal({
  articleId,
  articleTitle,
  userRole,
  initialData,
  onClose,
  onAnalysisComplete
}: ArticleAnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "plagiarism" | "seo" | "suggestions">("overview");
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<"analyze" | "rewrite" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [articleData, setArticleData] = useState({
    plagiarismRate: initialData?.plagiarismRate ?? null,
    seoScore: initialData?.seoScore ?? null,
    readabilityScore: initialData?.readabilityScore ?? null,
    qualityScore: initialData?.qualityScore ?? null,
    analysisReport: (initialData?.analysisReport as AnalysisReportData) ?? null
  });

  const hasAnalysis = articleData.qualityScore !== null;

  const handleAnalyze = () => {
    setError(null);
    setActionType("analyze");
    startTransition(async () => {
      try {
        const res = userRole === "ADMIN" ? await adminAnalyze(articleId) : await authorAnalyze(articleId);
        if (res.success && res.article) {
          setArticleData({
            plagiarismRate: res.plagiarismRate ?? null,
            seoScore: res.seoScore ?? null,
            readabilityScore: res.readabilityScore ?? null,
            qualityScore: res.qualityScore ?? null,
            analysisReport: (res.analysisReport as AnalysisReportData) ?? null
          });
          if (onAnalysisComplete) onAnalysisComplete(res.article);
        } else {
          setError(res.error || "Analiz sırasında bir hata meydana geldi.");
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Sunucuyla bağlantı kurulurken hata oluştu.";
        setError(errMsg);
      } finally {
        setActionType(null);
      }
    });
  };

  const handleRewrite = () => {
    if (!confirm("Makale yapay zeka tarafından yeniden yazılacaktır. Mevcut makale içeriği güncellenecektir. Devam etmek istiyor musunuz?")) return;
    setError(null);
    setActionType("rewrite");
    startTransition(async () => {
      try {
        const res = userRole === "ADMIN" ? await adminRewrite(articleId) : await authorRewrite(articleId);
        if (res.success && res.analysis?.success) {
          const re = res.analysis;
          setArticleData({
            plagiarismRate: re.plagiarismRate ?? null,
            seoScore: re.seoScore ?? null,
            readabilityScore: re.readabilityScore ?? null,
            qualityScore: re.qualityScore ?? null,
            analysisReport: (re.analysisReport as AnalysisReportData) ?? null
          });
          if (onAnalysisComplete) onAnalysisComplete(re.article);
          setActiveTab("overview");
        } else {
          setError(res.error || "Makale yeniden yazılırken bir hata oluştu.");
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Sunucuyla bağlantı kurulurken hata oluştu.";
        setError(errMsg);
      } finally {
        setActionType(null);
      }
    });
  };

  const report = articleData.analysisReport;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-(family-name:--font-outfit) text-foreground">Makale Analiz ve İntihal Raporu</h2>
              <p className="text-xs text-muted-foreground truncate max-w-[280px] sm:max-w-md md:max-w-xl font-medium mt-0.5">{articleTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-transparent hover:border-border"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-6 py-3 bg-primary-500/10 border-b border-primary-500/20 text-primary-500 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!hasAnalysis ? (
            <div className="text-center py-16 space-y-6 max-w-md mx-auto">
              <div className="h-16 w-16 bg-muted/40 rounded-full flex items-center justify-center mx-auto text-muted-foreground/60">
                <Search className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg text-foreground">Analiz Bulunmuyor</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Bu makale henüz yapay zeka ile analiz edilmemiş. Özgünlük (intihal), SEO uyumluluğu, okunabilirlik ve içerik kalitesi skorlarını hesaplamak için analizi başlatın.
                </p>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isPending}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 text-white font-bold rounded-xl transition-all shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending && actionType === "analyze" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Makaleyi Şimdi Analiz Et
              </button>
            </div>
          ) : (
            <>
              {/* Gauges Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <CircularProgress value={articleData.qualityScore} label="Yazım Kalitesi" />
                <CircularProgress value={articleData.plagiarismRate} label="İntihal Oranı" isPlagiarism={true} />
                <CircularProgress value={articleData.seoScore} label="SEO Skoru" />
                <CircularProgress value={articleData.readabilityScore} label="Okunabilirlik" />
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-border bg-muted/10 p-1.5 rounded-xl">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab === "overview" ? "bg-background shadow text-primary-600" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5" /> Özet Analiz
                </button>
                <button
                  onClick={() => setActiveTab("plagiarism")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab === "plagiarism" ? "bg-background shadow text-primary-600" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Search className="h-3.5 w-3.5" /> İntihal & AI Tespiti
                </button>
                <button
                  onClick={() => setActiveTab("seo")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab === "seo" ? "bg-background shadow text-primary-600" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingUp className="h-3.5 w-3.5" /> SEO & Okunabilirlik
                </button>
                <button
                  onClick={() => setActiveTab("suggestions")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab === "suggestions" ? "bg-background shadow text-primary-600" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ListChecks className="h-3.5 w-3.5" /> Öneriler
                </button>
              </div>

              {/* Tab Contents */}
              <div className="min-h-[220px] bg-muted/5 border border-border/40 p-5 rounded-2xl">
                <AnimatePresence mode="wait">
                  {activeTab === "overview" && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="space-y-4"
                    >
                      <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Editör Özeti</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/20 border border-border/30 rounded-xl space-y-2">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase">İntihal Durumu</p>
                          <p className="text-sm font-medium leading-relaxed">
                            {report?.plagiarism?.comment || "Makale özgünlük analizi tamamlandı."}
                          </p>
                        </div>
                        <div className="p-4 bg-muted/20 border border-border/30 rounded-xl space-y-2">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase">Okunabilirlik Analizi</p>
                          <p className="text-sm font-medium leading-relaxed">
                            {report?.readability?.comment || "Makale okunabilirlik analizi tamamlandı."}
                          </p>
                        </div>
                      </div>

                      {/* Warnings / High Plagiarism Banner */}
                      {(articleData.plagiarismRate ?? 0) > 30 && (
                        <div className="p-4 bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400 rounded-xl flex gap-3 text-xs">
                          <AlertTriangle className="h-5 w-5 shrink-0" />
                          <div className="space-y-1">
                            <p className="font-bold">Yüksek Benzerlik / İntihal Uyarısı (%{articleData.plagiarismRate})</p>
                            <p className="leading-relaxed font-medium">
                              Bu makalede benzer haber kaynaklarıyla yüksek oranda anlamsal benzerlik tespit edilmiştir. İntihal oranını düşürmek için makaleyi düzenleyebilir veya Yapay Zeka ile yeniden yazdırabilirsiniz.
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "plagiarism" && (
                    <motion.div
                      key="plagiarism"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="space-y-5"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">İntihal ve Yapay Zeka Tespiti</h3>
                        {report?.plagiarism?.aiProbability !== undefined && (
                          <div className="flex items-center gap-2 self-start px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-500 font-semibold text-xs">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Yapay Zeka Olasılığı: %{report.plagiarism.aiProbability}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Eşleşen Benzer Kaynaklar</p>
                        {!report?.plagiarism?.sources || report.plagiarism.sources.length === 0 ? (
                          <div className="p-6 bg-muted/20 border border-dashed border-border rounded-xl text-center text-xs font-semibold text-muted-foreground">
                            Herhangi bir doğrudan kopya veya eşleşen haber kaynağı bulunamadı. Makale anlamsal olarak özgün görünüyor.
                          </div>
                        ) : (
                          <div className="divide-y divide-border border border-border/40 rounded-xl overflow-hidden bg-background">
                            {report.plagiarism.sources.map((source, i) => (
                              <div key={i} className="p-3 flex items-center justify-between gap-4 text-xs">
                                <div className="min-w-0">
                                  <p className="font-bold truncate text-foreground">{source.title || "Haber Kaynağı"}</p>
                                  {source.url && (
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary-500 hover:underline flex items-center gap-1 mt-1 font-semibold"
                                    >
                                      {source.url} <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                                <div className="shrink-0 px-2 py-1 bg-primary-500/10 text-primary-500 font-extrabold rounded-md text-[10px]">
                                  %{source.matchPercent || 0} Benzerlik
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {report?.plagiarism?.comment && (
                        <div className="p-4 bg-muted/20 border border-border/30 rounded-xl">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Analiz Yorumu</p>
                          <p className="text-xs font-medium leading-relaxed">{report.plagiarism.comment}</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "seo" && (
                    <motion.div
                      key="seo"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="space-y-4"
                    >
                      <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">SEO Analizi ve Okunabilirlik</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/20 border border-border/30 rounded-xl space-y-3">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Hiyerarşik Yapı</p>
                          <div className="flex items-center gap-2">
                            {report?.seo?.hasHeadingStructure ? (
                              <div className="flex items-center gap-1.5 text-primary-500 text-xs font-bold">
                                <CheckCircle2 className="h-4.5 w-4.5" />
                                <span>Doğru Alt Başlık Yapısı (H2, H3)</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-primary-500 text-xs font-bold">
                                <AlertTriangle className="h-4.5 w-4.5" />
                                <span>Başlık Hiyerarşisi Eksik</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-4 bg-muted/20 border border-border/30 rounded-xl space-y-2">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Önerilen Anahtar Kelimeler</p>
                          <div className="flex flex-wrap gap-1.5">
                            {report?.seo?.keywordSuggestions && report.seo.keywordSuggestions.length > 0 ? (
                              report.seo.keywordSuggestions.map((kw, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 bg-primary-500/10 border border-primary-500/20 text-primary-500 font-bold rounded-full">
                                  {kw}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic font-semibold">Anahtar kelime önerisi bulunmuyor.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {report?.seo?.comment && (
                        <div className="p-4 bg-muted/20 border border-border/30 rounded-xl">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">SEO Değerlendirmesi</p>
                          <p className="text-xs font-medium leading-relaxed">{report.seo.comment}</p>
                        </div>
                      )}

                      {report?.readability?.comment && (
                        <div className="p-4 bg-muted/20 border border-border/30 rounded-xl">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Okunabilirlik Değerlendirmesi</p>
                          <p className="text-xs font-medium leading-relaxed">{report.readability.comment}</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "suggestions" && (
                    <motion.div
                      key="suggestions"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="space-y-4"
                    >
                      <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">İçerik İyileştirme Önerileri</h3>
                      
                      {!report?.suggestions || report.suggestions.length === 0 ? (
                        <div className="p-6 bg-muted/20 border border-dashed border-border rounded-xl text-center text-xs font-semibold text-muted-foreground">
                          Yapay zekanın bu makale için sunduğu ek bir iyileştirme önerisi bulunmuyor.
                        </div>
                      ) : (
                        <ul className="space-y-3">
                          {report.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex gap-3 p-3 bg-primary-500/5 border border-primary-500/10 rounded-xl text-xs font-medium leading-relaxed">
                              <span className="flex-shrink-0 h-5 w-5 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]">
                                {i + 1}
                              </span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-muted/20">
          <div>
            {hasAnalysis && (
              <button
                onClick={handleAnalyze}
                disabled={isPending}
                className="flex items-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isPending && actionType === "analyze" && "animate-spin")} />
                Yeniden Analiz Et
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              Kapat
            </button>
            
            {/* Rewrite Action (shows when plagiarism is above 30% or quality below 70, and article has analysis) */}
            {hasAnalysis && (
              <button
                onClick={handleRewrite}
                disabled={isPending}
                title="Makaleyi yapay zeka ile yeniden yazdır"
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                {isPending && actionType === "rewrite" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                Yapay Zeka ile Yeniden Yaz
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
