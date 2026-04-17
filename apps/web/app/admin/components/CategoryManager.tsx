"use client";

import { useState, useTransition, FormEvent } from "react";
import { createCategory, updateCategory, deleteCategoryAdmin } from "../actions";
import { Loader2, Trash2, Edit2, Bookmark, CheckCircle2, AlertCircle } from "lucide-react";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { IconPicker } from "@/components/ui/IconPicker";

import { CategoryWithCount } from "@/lib/types";

type Category = CategoryWithCount;

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [pending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [isEditing, setIsEditing] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [icon, setIcon] = useState("");
  const [order, setOrder] = useState(0);

  const resetForm = () => {
    setIsEditing(null);
    setName("");
    setSlug("");
    setColor("#3b82f6");
    setIcon("");
    setOrder(categories.length);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const startEdit = (cat: Category) => {
    setIsEditing(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setColor(cat.color || "#3b82f6");
    setIcon(cat.icon || "");
    setOrder(cat.order);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    setActionId("form-submit");
    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      let result;
      if (isEditing) {
        result = await updateCategory(isEditing.id, { name, slug, color, icon, order });
      } else {
        result = await createCategory({ name, slug, color, icon, order });
      }

      if (result.success) {
        setSuccessMsg(isEditing ? "Kategori başarıyla güncellendi." : "Kategori başarıyla eklendi.");
        if (!isEditing) {
            resetForm();
        }
      } else {
        setErrorMsg(result.error || "Bilinmeyen bir hata oluştu.");
      }
      setActionId(null);
    });
  };

  const handleDelete = (id: string, count: number) => {
    if (count > 0) {
      alert("Bu kategoriye ait makaleler olduğu için silinemez. Lütfen önce makaleleri şuradan taşıyın veya silin.");
      return;
    }
    if (!confirm("Kategoriyi kalıcı olarak silmek istediğinizden emin misiniz?")) return;

    setActionId(id + "-delete");
    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const result = await deleteCategoryAdmin(id);
      if (result.success) {
        setSuccessMsg("Kategori silindi.");
      } else {
        setErrorMsg(result.error || "Silinirken hata oluştu.");
      }
      setActionId(null);
    });
  };

  return (
    <div className="space-y-8">
      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Form Column */}
        <div className="glass-strong rounded-2xl p-6 border border-border shadow-soft h-fit sticky top-24">
          <h3 className="font-bold font-(family-name:--font-outfit) mb-6 text-lg">
            {isEditing ? "Kategoriyi Düzenle" : "Yeni Kategori Ekle"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kategori Adı</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Örn: Teknoloji"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium">URL (Slug)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="teknoloji"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">/category/teknoloji adresinde kullanılacak.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kategori Simgesi</label>
              <IconPicker value={icon} onChange={setIcon} />
              <p className="text-xs text-muted-foreground mt-1">Sitede görünecek modern Lucide simgesini yukarıdan seçebilirsiniz.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tema Rengi</label>
                <div className="flex bg-background border border-border rounded-xl px-1 overflow-hidden h-10 items-center">
                    <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded bg-transparent border-0 p-0 shadow-none appearance-none"
                    />
                    <span className="text-xs font-mono ml-2 text-muted-foreground uppercase">{color}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Sıra (Order)</label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 h-10 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="submit"
                disabled={pending && actionId === "form-submit"}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium focus:ring-4 focus:ring-primary-500/30 transition-all text-sm flex items-center justify-center cursor-pointer disabled:opacity-70"
              >
                {pending && actionId === "form-submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEditing ? "Güncelle" : "Ekle")}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-sm font-medium transition-all"
                >
                  İptal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 divide-y divide-border rounded-2xl border border-border overflow-hidden bg-background">
          {categories.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
                 <Bookmark className="h-10 w-10 mb-3 opacity-20" />
                 <p>Henüz kategori eklenmemiş.</p>
             </div>
          ) : categories.map((cat) => {
            const isLoading = actionId?.startsWith(cat.id);
            const isDeleting = actionId === cat.id + "-delete";

            return (
              <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-xl border border-border flex items-center justify-center bg-muted/50 transition-transform group-hover:scale-105" style={{ color: cat.color || "#3b82f6" }}>
                      <DynamicIcon name={cat.icon} className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">/{cat.slug} · Sıra: {cat.order}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 shrink-0 sm:self-center self-end">
                  <div className="text-xs border border-border bg-muted/50 px-2.5 py-1 rounded-md text-muted-foreground">
                    {cat._count.articles} {cat._count.articles === 1 ? "Haber" : "Haber"}
                  </div>
                  
                  <div className="flex items-center gap-1.5 flex-row">
                    <button
                        onClick={() => startEdit(cat)}
                        disabled={pending}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-primary-500/10 text-muted-foreground hover:text-primary-500 transition-colors cursor-pointer disabled:opacity-50"
                        title="Düzenle"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(cat.id, cat._count.articles)}
                        disabled={pending || cat._count.articles > 0}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title={cat._count.articles > 0 ? "İçinde makale varken silinemez" : "Sil"}
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

