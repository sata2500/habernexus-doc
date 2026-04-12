import Link from "next/link";
import { getCategoriesWithCount } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Newspaper, ArrowRight, FolderOpen } from "lucide-react";

export const metadata = {
  title: "Tüm Kategoriler",
  description: "Haber Nexus üzerinde bulunan tüm haber kategorileri ve konular.",
};

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCount();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-500/10 text-primary-500 mb-2">
            <FolderOpen className="h-8 w-8" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold font-(family-name:--font-outfit)">
          Kategoriler
        </h1>
        <p className="text-lg text-muted-foreground">
          Platformumuzdaki tüm haber konularını ve analiz kategorilerini keşfedin. İlgi alanınıza en uygun haberlere hızlıca ulaşın.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.map((cat: any) => (
          <Link key={cat.slug} href={`/category/${cat.slug}`} className="group">
            <Card variant="interactive" className="h-full flex flex-col p-6 hover:shadow-glow transition-all">
              <div className="flex items-center justify-between mb-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${cat.color || "#888"}20` }}
                >
                  <Newspaper className="h-6 w-6" style={{ color: cat.color || "#888" }} />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  {cat._count.articles} İçerik
                </div>
              </div>
              <h3 className="text-xl font-bold font-(family-name:--font-outfit) mb-2 group-hover:text-primary-600 transition-colors">
                {cat.name}
              </h3>
              <p className="text-sm text-muted-foreground flex-1 mb-4">
                {cat.description || `${cat.name} alanındaki en güncel gelişmeler ve detaylı analizler.`}
              </p>
              <div className="flex items-center text-primary-500 text-sm font-semibold group-hover:gap-2 transition-all">
                Göz At <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
      
      {categories.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          Henüz kategori bulunmuyor.
        </div>
      )}
    </div>
  );
}
