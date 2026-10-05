import { Sparkles } from "lucide-react";
import { getAuthorSuggestions } from "./actions";
import { SuggestionsGrid } from "./components/SuggestionCard";

export const dynamic = "force-dynamic";

export default async function AuthorSuggestionsPage() {
  const suggestions = await getAuthorSuggestions();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2.5">
          <Sparkles className="h-6 w-6 text-primary-500" /> Haber önerileri
        </h1>
        <p className="text-sm text-muted-foreground">
          Karar Merkezi&apos;nde puanlanmış, henüz yazılmamış konular. &quot;Haber yaz&quot; dediğinde konu senin olur ve AI Yazar
          onu yazmaz; başlık, özet ve kaynaklar editöre gelir.
        </p>
      </div>
      <SuggestionsGrid suggestions={suggestions} />
    </div>
  );
}
