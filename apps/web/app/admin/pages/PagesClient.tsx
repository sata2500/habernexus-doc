"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  FileText, 
  Settings, 
  Shield, 
  Scale, 
  Info, 
  Mail, 
  Briefcase, 
  Megaphone, 
  X,
  Save,
  Loader2,
  CheckCircle2,
  Phone,
  MapPin,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { updateStaticPage } from "@/app/actions/static-pages";
import { StaticPageWithData } from "@/lib/types";
import { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  about: Info,
  contact: Mail,
  careers: Briefcase,
  advertise: Megaphone,
  privacy: Shield,
  terms: Scale,
  cookies: Settings,
  kvkk: Shield,
};

export function PagesClient({ initialPages }: { initialPages: StaticPageWithData[] }) {
  const [pages, setPages] = useState<StaticPageWithData[]>(initialPages);
  const [editingPage, setEditingPage] = useState<StaticPageWithData | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleEdit = (page: StaticPageWithData) => {
    setEditingPage({ 
      ...page, 
      extraData: page.extraData || {} 
    });
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!editingPage) return;
    setLoading(true);

    try {
      const result = await updateStaticPage(editingPage.id, {
        title: editingPage.title,
        content: editingPage.content,
        description: editingPage.description,
        extraData: editingPage.extraData,
      });

      if (result.success) {
        setPages(pages.map(p => p.id === editingPage.id ? result.page : p));
        setSuccess(true);
        setTimeout(() => {
          setEditingPage(null);
          setSuccess(false);
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      alert("Sayfa güncellenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const updateExtraData = (key: string, value: string) => {
    if (!editingPage) return;
    setEditingPage({
      ...editingPage,
      extraData: {
        ...editingPage.extraData,
        [key]: value
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {pages.map((page) => {
        const slug = page.slug?.toLowerCase().trim();
        const Icon = ICON_MAP[slug] || FileText;
        const isSpecial = slug === "contact" || slug === "advertise";

        return (
          <Card key={page.id} className="p-5 flex flex-col justify-between hover:border-primary-500/50 transition-all duration-300 group shadow-sm hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary-500/10 transition-colors shrink-0">
                <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary-500 transition-colors" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm uppercase tracking-wider truncate">{page.title}</h3>
                  {isSpecial && (
                    <span className="flex items-center gap-1 text-[10px] bg-primary-500/10 text-primary-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter shrink-0">
                      <Sparkles className="h-3 w-3" /> Akıllı
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> /{page.slug === "about" ? "about" : page.slug}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleEdit(page)}
                className="rounded-lg hover:bg-primary-500/10 hover:text-primary-600"
              >
                Düzenle
              </Button>
            </div>
          </Card>
        );
      })}

      {/* Editor Modal Overlay */}
      {editingPage && (
        <div className="fixed inset-0 z-(--z-modal) flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !loading && setEditingPage(null)} />
          <Card className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-primary-500/20 rounded-3xl">
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  {(() => {
                    const slug = editingPage.slug?.toLowerCase().trim();
                    const Icon = (slug && ICON_MAP[slug]) || FileText;
                    return <Icon className="h-5 w-5 text-primary-500" />;
                  })()}
                </div>
                <div>
                  <h2 className="text-xl font-bold font-(family-name:--font-outfit)">{editingPage.title} Düzenle</h2>
                  <p className="text-[10px] text-muted-foreground font-mono">slug: /{editingPage.slug}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingPage(null)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Sayfa Ayarları */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sayfa Başlığı</label>
                  <input 
                    type="text"
                    value={editingPage.title}
                    onChange={(e) => setEditingPage({...editingPage, title: e.target.value})}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SEO Açıklaması (Keywords/Description)</label>
                  <input 
                    type="text"
                    value={editingPage.description || ""}
                    onChange={(e) => setEditingPage({...editingPage, description: e.target.value})}
                    placeholder="Arama motorları için kısa özet..."
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Ekstra Veriler (İletişim / Reklam) - CASE INSENSITIVE CHECK */}
              {(() => {
                const slug = editingPage.slug?.toLowerCase().trim();
                if (slug === "contact" || slug === "advertise") {
                  return (
                    <div className="p-6 rounded-2xl bg-primary-500/5 border border-primary-500/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                      <h3 className="text-xs font-bold flex items-center gap-2 text-primary-600 uppercase tracking-wider">
                        <Settings className="h-4 w-4" /> Sayfaya Özel Kart Bilgileri
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {slug === "contact" && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" /> Telefon Numarası
                              </label>
                              <input 
                                type="text" 
                                value={editingPage.extraData.phone || ""} 
                                onChange={(e) => updateExtraData("phone", e.target.value)}
                                className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary-500 outline-none"
                                placeholder="+90 (212) 000 00 00"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" /> E-Posta Adresi
                              </label>
                              <input 
                                type="text" 
                                value={editingPage.extraData.email || ""} 
                                onChange={(e) => updateExtraData("email", e.target.value)}
                                className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary-500 outline-none"
                                placeholder="info@habernexus.com"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> Ofis Adresi
                              </label>
                              <input 
                                type="text" 
                                value={editingPage.extraData.address || ""} 
                                onChange={(e) => updateExtraData("address", e.target.value)}
                                className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary-500 outline-none"
                                placeholder="Levent Mah. Medya Sk. No: 1, Beşiktaş / İstanbul"
                              />
                            </div>
                          </>
                        )}
                        {slug === "advertise" && (
                          <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> Reklam İletişim E-Postası
                            </label>
                            <input 
                              type="text" 
                              value={editingPage.extraData.email || ""} 
                              onChange={(e) => updateExtraData("email", e.target.value)}
                              className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary-500 outline-none"
                              placeholder="ads@habernexus.com"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Ana İçerik */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ana Metin İçeriği (HTML)</label>
                  <span className="text-[10px] text-muted-foreground italic shrink-0">* prose stili otomatik uygulanır</span>
                </div>
                <textarea 
                  value={editingPage.content}
                  onChange={(e) => setEditingPage({...editingPage, content: e.target.value})}
                  className="w-full h-[350px] p-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono text-sm leading-relaxed custom-scrollbar"
                  placeholder="<p>Sayfa içeriğini buraya girin...</p>"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex items-center justify-between bg-muted/30">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setEditingPage(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                İptal Et
              </Button>
              <div className="flex items-center gap-3">
                {success && (
                  <span className="text-sm text-green-500 font-medium flex items-center gap-1 animate-in fade-in zoom-in">
                    <CheckCircle2 className="h-4 w-4" /> Kaydedildi
                  </span>
                )}
                <Button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="min-w-[160px] gap-2 rounded-xl h-11 shadow-lg shadow-primary-500/20"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
