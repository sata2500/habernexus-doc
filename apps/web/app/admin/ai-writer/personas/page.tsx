import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPersonas } from "./actions";
import { PersonaManager } from "./components/PersonaManager";

export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  const [personas, categories] = await Promise.all([
    getPersonas(),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/admin/ai-writer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> AI Yazar
      </Link>
      <PersonaManager
        personas={personas.map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          image: p.image,
          description: p.description,
          prompt: p.prompt,
          imagePrompt: p.imagePrompt,
          isActive: p.isActive,
          articleCount: p._count.articles,
          categories: p.categories.map((c) => c.category),
        }))}
        categories={categories}
      />
    </div>
  );
}
