"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { createArticle, getCategories } from "../../actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Image as ImageIcon, Tag, Loader2, Eye, Save } from "lucide-react";
import { ImageUploader } from "@/components/ui/ImageUploader";

// TipTap SSR değil CSR gerektirdiği için dynamic import zorunlu
const TiptapEditor = dynamic(
  () => import("../../components/TiptapEditor").then((m) => m.TiptapEditor),
  { ssr: false, loading: () => <div className="h-96 rounded-2xl bg-muted animate-pulse" /> }
);



export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("<p>Haberi burada yazın...</p>");
  const [coverImage, setCoverImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const cats = await getCategories();
      setCategories(cats);
    }
    load();
  }, []);

  const handleSubmit = async (targetStatus: "DRAFT" | "PUBLISHED") => {
    if (!title.trim()) { setError("Haber başlığı boş bırakılamaz."); return; }
    if (!categoryId) { setError("Lütfen bir kategori seçin."); return; }
    if (!content || content === "<p></p>") { setError("Haber içeriği boş bırakılamaz."); return; }

    setSaving(true);
    setError("");

    const result = await createArticle({
      title: title.trim(),
      excerpt: excerpt.trim() || undefined,
      content,
      coverImage: coverImage.trim() || undefined,
      categoryId,
      status: targetStatus,
    });

    if (result.success) {
      router.push("/author/articles");
    } else {
      setError(result.error || "Beklenmeyen bir hata oluştu.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Yeni Haber Yaz</h1>
        <p className="text-muted-foreground text-sm">Aşağıdaki alanları doldurun ve haberi taslak olarak kaydedin veya yayınlayın.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Sol: Ana İçerik ────────────────── */}
        <div className="xl:col-span-2 space-y-5">
          {/* Başlık */}
          <Card className="p-5 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Başlık</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Etkileyici bir haber başlığı girin..."
              className="w-full text-2xl font-bold font-(family-name:--font-outfit) bg-transparent border-none outline-none placeholder:text-muted-foreground/40 placeholder:font-medium resize-none"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/200</p>
          </Card>

          {/* Özet */}
          <Card className="p-5 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Özet (Opsiyonel)</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Haberin kısa bir özetini yazın (Anasayfada gösterilir)..."
              className="w-full bg-transparent border-none outline-none placeholder:text-muted-foreground/40 resize-none text-sm leading-relaxed min-h-[72px]"
              maxLength={300}
            />
          </Card>

          {/* İçerik Editörü */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">İçerik</label>
            <TiptapEditor content={content} onChange={setContent} />
          </div>
        </div>

        {/* ── Sağ: Ayar Paneli ───────────────── */}
        <div className="space-y-5">
          {/* Yayın Durumu */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Yayın Durumu
            </h3>
            <div className="flex gap-2">
              {(["DRAFT", "PUBLISHED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                    status === s
                      ? s === "PUBLISHED"
                        ? "bg-green-500 text-white border-green-500"
                        : "bg-amber-500 text-white border-amber-500"
                      : "bg-transparent text-muted-foreground border-border hover:border-foreground"
                  }`}
                >
                  {s === "DRAFT" ? "Taslak" : "Yayında"}
                </button>
              ))}
            </div>
          </Card>

          {/* Kategori */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold">Kategori</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    categoryId === cat.id
                      ? "bg-primary-500 text-white border-primary-500"
                      : "border-border text-muted-foreground hover:border-primary-400 hover:text-primary-600"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && <p className="text-xs text-muted-foreground">Kategori yükleniyor...</p>}
            </div>
          </Card>

          {/* Kapak Resmi */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" /> Kapak Fotoğrafı
            </h3>
            <ImageUploader 
              value={coverImage}
              onChange={setCoverImage}
              type="article"
              aspectRatio="video"
            />
            <p className="text-[10px] text-muted-foreground">Önerilen boyut: 1200x675px (16:9)</p>
          </Card>

          {/* Hata Mesajı */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Aksiyon Butonları */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSubmit("PUBLISHED")}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/20 cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Yayınla
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("DRAFT")}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-xl transition-all cursor-pointer disabled:opacity-60 border border-border"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Taslak Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
