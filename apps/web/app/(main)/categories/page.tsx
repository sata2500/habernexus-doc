import Link from "next/link";
import { getCategoriesWithCount } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { FolderOpen, ArrowRight, Newspaper } from "lucide-react";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { getCardGlowStyles } from "@/lib/utils";

export const metadata = {
  title: "Tüm Kategoriler",
  description: "Haber Nexus üzerinde bulunan tüm haber kategorileri ve konular.",
};

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCount();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-primary text-white mb-2 shadow-glow animate-pulse-glow">
          <FolderOpen className="h-8 w-8" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold font-display tracking-tight">
          Kategoriler
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Platformumuzdaki tüm haber konularını ve analiz kategorilerini keşfedin. İlgi alanınıza en uygun haberlere hızlıca ulaşın.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((cat) => {
          return (
            <Link key={cat.slug} href={`/category/${cat.slug}`} className="group block">
              <Card
                variant="interactive"
                noPadding
                className="h-full flex flex-col p-6 shine rounded-2xl card-360-border bg-card/65 hover:bg-card transition-all duration-300 ease-out"
                style={getCardGlowStyles(cat.color)}
              >
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_12px_var(--cat-glow)]"
                    style={{ backgroundColor: `${cat.color || "#888"}12` }}
                  >
                    <DynamicIcon name={cat.icon} fallback={Newspaper} className="h-6 w-6 transition-colors duration-300" style={{ color: cat.color || "#888" }} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full group-hover:bg-[var(--cat-glow)] group-hover:text-[var(--cat-color)] transition-all duration-300">
                    {cat._count.articles} İçerik
                  </div>
                </div>
                <h3 className="text-xl font-bold font-display mb-2 text-card-foreground group-hover:text-[var(--cat-color)] transition-colors duration-300">
                  {cat.name}
                </h3>
                <p className="text-sm text-muted-foreground flex-1 mb-5 leading-relaxed">
                  {cat.description || `${cat.name} alanındaki en güncel gelişmeler ve detaylı analizler.`}
                </p>
                <div className="flex items-center text-[var(--cat-color)] text-sm font-bold transition-all duration-300">
                  <span className="group-hover:mr-1 transition-all duration-300">Göz At</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          Henüz kategori bulunmuyor.
        </div>
      )}
    </div>
  );
}
