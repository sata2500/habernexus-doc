"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { 
  Settings, 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  Loader2, 
  CheckCircle2, 
  X,
  ExternalLink,
  Eye,
  EyeOff,
  Clock,
  Layout
} from "lucide-react";
import { updateSlider, upsertSlide, deleteSlide, reorderSlides } from "@/app/actions/slider";
import { SliderWithSlides } from "@/lib/types";
import { Slide } from "@/lib/generated/client";
import { Reorder, AnimatePresence, motion } from "framer-motion";

export function SliderClient({ initialSlider }: { initialSlider: SliderWithSlides }) {
  const [slider, setSlider] = useState<SliderWithSlides>(initialSlider);
  const [slides, setSlides] = useState<Slide[]>(initialSlider.slides);
  const [editingSlide, setEditingSlide] = useState<Partial<Slide> | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSliderUpdate = async () => {
    setLoading(true);
    try {
      const result = await updateSlider((slider as any).id, {
        name: slider.name,
        autoPlay: slider.autoPlay,
        interval: slider.interval,
        height: slider.height || undefined,
        isActive: slider.isActive,
      });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (error) {
      console.error(error);
      alert("Ayarlar güncellenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSlideSave = async () => {
    if (!editingSlide || !editingSlide.imageUrl) return;
    setLoading(true);
    try {
      const result = await upsertSlide({
        ...editingSlide,
        sliderId: (slider as any).id,
      } as any);

      if (result.success && result.slide) {
        const updatedSlide = result.slide as Slide;
        if (editingSlide.id) {
          setSlides(slides.map(s => s.id === updatedSlide.id ? updatedSlide : s));
        } else {
          setSlides([...slides, updatedSlide]);
        }
        setEditingSlide(null);
      }
    } catch (error) {
      console.error(error);
      alert("Slide kaydedilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (!confirm("Bu slide'ı silmek istediğinize emin misiniz?")) return;
    try {
      const result = await deleteSlide(id);
      if (result.success) {
        setSlides(slides.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error(error);
      alert("Slide silinirken bir hata oluştu.");
    }
  };

  const handleReorder = async (newOrder: Slide[]) => {
    setSlides(newOrder);
    await reorderSlides(newOrder.map(s => s.id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Slider Settings */}
      <Card className="p-6 border-primary-500/10 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary-500" />
          </div>
          <h2 className="text-xl font-bold font-(family-name:--font-outfit)">Genel Ayarlar</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Slider Durumu</label>
            <div className="flex items-center gap-3 h-11 px-4 rounded-xl border border-border bg-background/50">
              <input 
                type="checkbox" 
                checked={slider.isActive} 
                onChange={(e) => setSlider({...slider, isActive: e.target.checked})}
                className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
              />
              <span className="text-sm font-medium">{slider.isActive ? "Aktif" : "Devre Dışı"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Otomatik Oynat</label>
            <div className="flex items-center gap-3 h-11 px-4 rounded-xl border border-border bg-background/50">
              <input 
                type="checkbox" 
                checked={slider.autoPlay} 
                onChange={(e) => setSlider({...slider, autoPlay: e.target.checked})}
                className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
              />
              <span className="text-sm font-medium">Aktif</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Geçiş Süresi (ms)</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="number" 
                value={slider.interval} 
                onChange={(e) => setSlider({...slider, interval: parseInt(e.target.value)})}
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                step="500"
                min="1000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Slayt Alanı Yüksekliği</label>
            <div className="relative">
              <Layout className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                value={slider.height || ""} 
                onChange={(e) => setSlider({...slider, height: e.target.value})}
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                placeholder="Örn: 500px veya 60vh"
              />
            </div>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={handleSliderUpdate} 
              disabled={loading}
              className="w-full h-11 rounded-xl gap-2 shadow-lg shadow-primary-500/20"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {success ? "Güncellendi" : "Ayarları Kaydet"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Slides Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold font-(family-name:--font-outfit)">Slaytlar</h2>
          </div>
          <Button 
            onClick={() => setEditingSlide({ order: slides.length, isActive: true })}
            className="rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" /> Yeni Slide Ekle
          </Button>
        </div>

        <Reorder.Group axis="y" values={slides} onReorder={handleReorder} className="space-y-3">
          {slides.map((slide) => (
            <Reorder.Item 
              key={slide.id} 
              value={slide}
              className="relative group"
            >
              <Card className="p-4 flex items-center gap-4 hover:border-primary-500/30 transition-all cursor-default select-none shadow-sm hover:shadow-md">
                <div className="cursor-grab active:cursor-grabbing p-2 text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                
                <div className="relative h-20 w-32 rounded-lg overflow-hidden shrink-0 border border-border">
                  <img 
                    src={slide.imageUrl} 
                    alt={slide.title || ""} 
                    className="h-full w-full object-cover"
                  />
                  {!slide.isActive && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{slide.title || "Başlıksız Slide"}</h3>
                  <p className="text-xs text-muted-foreground truncate">{slide.description || "Açıklama yok"}</p>
                  {slide.link && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-500 font-medium">
                      <ExternalLink className="h-3 w-3" /> {slide.link}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setEditingSlide(slide)}
                    className="rounded-full hover:bg-primary-500/10 hover:text-primary-500"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteSlide(slide.id)}
                    className="rounded-full hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {slides.length === 0 && (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
            <Layout className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">Henüz bir slayt eklenmemiş.</p>
          </div>
        )}
      </div>

      {/* Slide Edit Modal */}
      <AnimatePresence>
        {editingSlide && (
          <div className="fixed inset-0 z-(--z-modal) flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
              onClick={() => !loading && setEditingSlide(null)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <Card className="shadow-2xl border-primary-500/20 rounded-3xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                  <h2 className="text-xl font-bold font-(family-name:--font-outfit)">
                    {editingSlide.id ? "Slide Düzenle" : "Yeni Slide Ekle"}
                  </h2>
                  <button onClick={() => setEditingSlide(null)} className="p-2 hover:bg-muted rounded-full">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Slide Görseli</label>
                    <ImageUploader 
                      value={editingSlide.imageUrl || ""} 
                      onChange={(url) => setEditingSlide({...editingSlide, imageUrl: url})}
                      type="article"
                      autoOptimize={true}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Başlık</label>
                      <input 
                        type="text" 
                        value={editingSlide.title || ""} 
                        onChange={(e) => setEditingSlide({...editingSlide, title: e.target.value})}
                        className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="Slide başlığı..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Link (Opsiyonel)</label>
                      <input 
                        type="text" 
                        value={editingSlide.link || ""} 
                        onChange={(e) => setEditingSlide({...editingSlide, link: e.target.value})}
                        className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Açıklama</label>
                    <textarea 
                      value={editingSlide.description || ""} 
                      onChange={(e) => setEditingSlide({...editingSlide, description: e.target.value})}
                      className="w-full h-24 p-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                      placeholder="Kısa açıklama metni..."
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editingSlide.isActive} 
                        onChange={(e) => setEditingSlide({...editingSlide, isActive: e.target.checked})}
                        className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                      />
                      <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Aktif</span>
                    </label>
                  </div>
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30">
                  <Button variant="ghost" onClick={() => setEditingSlide(null)} disabled={loading}>
                    İptal
                  </Button>
                  <Button 
                    onClick={handleSlideSave} 
                    disabled={loading || !editingSlide.imageUrl}
                    className="min-w-[140px] gap-2 rounded-xl"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingSlide.id ? "Güncelle" : "Ekle"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
