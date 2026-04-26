"use client";

import { useState } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Wand2, 
  Image as ImageIcon,
  ChevronRight,
  Info,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { createPersona, updatePersona, deletePersona } from "../actions";
import { ImageUploader } from "@/components/ui/ImageUploader";

interface Category {
  id: string;
  name: string;
}

interface Persona {
  id: string;
  name: string;
  role: string | null;
  image: string | null;
  description: string | null;
  prompt: string;
  imagePrompt: string;
  categories: { category: Category }[];
}

interface Props {
  initialPersonas: Persona[];
  allCategories: Category[];
}

export function PersonaManager({ initialPersonas, allCategories }: Props) {
  const [personas, setPersonas] = useState(initialPersonas);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    role: "Haber Editörü",
    image: "",
    description: "",
    prompt: "",
    imagePrompt: "",
    categoryIds: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      name: "",
      role: "Haber Editörü",
      image: "",
      description: "",
      prompt: "",
      imagePrompt: "",
      categoryIds: [],
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (persona: Persona) => {
    setFormData({
      name: persona.name,
      role: persona.role || "Haber Editörü",
      image: persona.image || "",
      description: persona.description || "",
      prompt: persona.prompt,
      imagePrompt: persona.imagePrompt,
      categoryIds: persona.categories.map(c => c.category.id),
    });
    setEditingId(persona.id);
    setIsAdding(false);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.prompt) {
      alert("İsim ve Prompt alanları zorunludur.");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const res = await updatePersona(editingId, formData);
        if (res.success) {
          alert("Persona güncellendi.");
          window.location.reload();
        } else {
          alert(res.error || "Güncelleme başarısız.");
        }
      } else {
        const res = await createPersona(formData);
        if (res.success) {
          alert("Persona oluşturuldu.");
          window.location.reload();
        } else {
          alert(res.error || "Oluşturma başarısız.");
        }
      }
    } catch (err) {
      alert("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu personayı silmek istediğinize emin misiniz?")) return;

    try {
      const res = await deletePersona(id);
      if (res.success) {
        alert("Persona silindi.");
        window.location.reload();
      }
    } catch (err) {
      alert("Silme işlemi başarısız.");
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId]
    }));
  };

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Users className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-(family-name:--font-outfit)">AI Personaları</h2>
            <p className="text-sm text-muted-foreground">Farklı kategoriler için farklı yazım stilleri ve görsel karakterler tanımlayın.</p>
          </div>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-primary-500/20"
          >
            <Plus className="h-5 w-5" />
            Yeni Persona Ekle
          </button>
        )}
      </div>

      {/* ── Form (Add/Edit) ── */}
      {(isAdding || editingId) && (
        <div className="glass-strong rounded-3xl border border-primary-500/30 p-8 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2">
              {editingId ? <Edit2 className="h-5 w-5 text-primary-500" /> : <Plus className="h-5 w-5 text-primary-500" />}
              {editingId ? "Personayı Düzenle" : "Yeni Persona Tanımla"}
            </h3>
            <button onClick={resetForm} className="p-2 hover:bg-muted rounded-xl transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Persona Adı</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Caner KÖSE"
                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Ünvan / Rol</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Örn: Teknoloji Editörü"
                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-blue-500" />
                  Profil Fotoğrafı
                </label>
                <ImageUploader
                  value={formData.image}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                  type="profile"
                  aspectRatio="square"
                  autoOptimize={true}
                  className="w-full"
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Yüklenen görseller otomatik olarak WebP formatına çevrilir ve optimize edilir.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">Kısa Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Bu persona hangi tarzda yazar? (İsteğe bağlı)"
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none transition-all h-20 resize-none"
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold block">Hizmet Edeceği Kategoriler</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-muted/20 rounded-xl border border-border">
                  {allCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        formData.categoryIds.includes(cat.id)
                          ? "bg-primary-500 text-white border-primary-400 shadow-md shadow-primary-500/20"
                          : "bg-background border-border hover:border-primary-500/50"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Bu kategoriye atanmış birden fazla persona varsa, sırayla (rotasyonla) yazarlar.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-500" />
                  Yazım Komutu (System Prompt)
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={e => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="Yapay zekaya nasıl yazması gerektiğini anlatın..."
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none transition-all h-40 font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-blue-500" />
                  Görsel Üretim Komutu (Image Prompt)
                </label>
                <textarea
                  value={formData.imagePrompt}
                  onChange={e => setFormData({ ...formData, imagePrompt: e.target.value })}
                  placeholder="Kapak görselleri için stil talimatları..."
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none transition-all h-32 font-mono text-xs leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border flex justify-end gap-4">
            <button
              onClick={resetForm}
              className="px-6 py-2 rounded-xl hover:bg-muted transition-colors font-bold"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Kaydediliyor..." : editingId ? "Değişiklikleri Kaydet" : "Personayı Oluştur"}
            </button>
          </div>
        </div>
      )}

      {/* ── Personas Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {personas.map(persona => (
          <div key={persona.id} className="glass-strong rounded-3xl border border-border p-6 hover:border-primary-500/30 transition-all group flex flex-col h-full shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center overflow-hidden">
                  {persona.image ? (
                    <img src={persona.image} alt={persona.name} className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-6 w-6 text-primary-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-lg leading-tight">{persona.name}</h4>
                  <p className="text-xs text-primary-500 font-bold">{persona.role || "Haber Editörü"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(persona)}
                  className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(persona.id)}
                  className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{persona.description || "Açıklama yok."}</p>

            <div className="mt-auto space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Aktif Kategoriler</p>
                <div className="flex flex-wrap gap-1">
                  {persona.categories.length > 0 ? (
                    persona.categories.map(c => (
                      <span key={c.category.id} className="px-2 py-0.5 bg-muted rounded-md text-[10px] font-bold">
                        {c.category.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] italic text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Kategori atanmadı
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleEdit(persona)}
                className="w-full flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-xs font-bold"
              >
                Detayları İncele
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {personas.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center glass-strong rounded-3xl border border-dashed border-border">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Henüz bir AI Personası tanımlanmamış.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-4 text-primary-500 font-bold hover:underline"
            >
              Hemen ilk personayı oluştur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
