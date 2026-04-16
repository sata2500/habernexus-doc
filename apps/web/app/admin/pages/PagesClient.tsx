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
  CheckCircle2
} from "lucide-react";
import { updateStaticPage } from "@/app/actions/static-pages";

const ICON_MAP: Record<string, any> = {
  about: Info,
  contact: Mail,
  careers: Briefcase,
  advertise: Megaphone,
  privacy: Shield,
  terms: Scale,
  cookies: Settings,
  kvkk: Shield,
};

export function PagesClient({ initialPages }: { initialPages: any[] }) {
  const [pages, setPages] = useState(initialPages);
  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleEdit = (page: any) => {
    setEditingPage({ ...page });
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pages.map((page) => {
        const Icon = ICON_MAP[page.slug] || FileText;
        return (
          <Card key={page.id} className="p-5 flex flex-col justify-between hover:border-primary-500/50 transition-colors group">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary-500/10 transition-colors">
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary-500 transition-colors" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">{page.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {page.slug === "about" ? "/about" : `/${page.slug}`}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(page)}>
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
          <Card className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-primary-500/20">
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  {editingPage.slug && ICON_MAP[editingPage.slug] ? (
                    <editingPage.slug_icon className="h-4 w-4 text-primary-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary-500" />
                  )}
                </div>
                <h2 className="text-xl font-bold">{editingPage.title} Düzenle</h2>
              </div>
              <button 
                onClick={() => setEditingPage(null)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Sayfa Başlığı</label>
                <input 
                  type="text"
                  value={editingPage.title}
                  onChange={(e) => setEditingPage({...editingPage, title: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-muted-foreground">Sayfa İçeriği (HTML Destekli)</label>
                  <span className="text-[10px] text-muted-foreground italic">* prose stili otomatik uygulanır</span>
                </div>
                <textarea 
                  value={editingPage.content}
                  onChange={(e) => setEditingPage({...editingPage, content: e.target.value})}
                  className="w-full h-[400px] p-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono text-sm leading-relaxed"
                  placeholder="<p>Hakkımızda içeriği buraya gelecek...</p>"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex items-center justify-between bg-muted/30">
              <p className="text-xs text-muted-foreground font-mono">/{editingPage.slug}</p>
              <div className="flex items-center gap-3">
                {success && (
                  <span className="text-sm text-green-500 font-medium flex items-center gap-1 animate-in fade-in zoom-in">
                    <CheckCircle2 className="h-4 w-4" /> Başarıyla kaydedildi
                  </span>
                )}
                <Button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="min-w-[140px] gap-2 rounded-xl"
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
