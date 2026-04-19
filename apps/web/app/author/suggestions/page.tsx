import { getAuthorSuggestions } from "./actions";
import { SuggestionsGrid } from "./components/SuggestionCard";
import { Sparkles, Info } from "lucide-react";

export default async function AuthorSuggestionsPage() {
  const suggestions = await getAuthorSuggestions();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold font-(family-name:--font-outfit) flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary-500" />
          Haber Önerileri
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI tarafından puanlanmış güncel haberler ve yöneticilerimizin özellikle önerdiği konular.
        </p>
      </div>

      {/* ── Info Banner ── */}
      <div className="flex items-start gap-3 p-4 bg-primary-500/5 border border-primary-500/15 rounded-2xl">
        <Info className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">Bu öneriler nasıl çalışır?</strong>
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Farklı haber sitelerinin RSS kaynaklarından saatte düzenli olarak derleniyor.</li>
            <li>AI, her haberi 0-100 arası puanlıyor: güncellik, özgünlük ve viral potansiyeline göre.</li>
            <li>Zaten haberleştirdiğimiz konular otomatik olarak listeden çıkarılıyor.</li>
            <li>&quot;Haber Yaz&quot; butonuna tıklarsan konu listeden kaldırılır ve editör açılır.</li>
            <li>&quot;İlginç Değil&quot; ile konuyu kalıcı olarak reddedebilirsin.</li>
          </ul>
        </div>
      </div>

      {/* ── Öneriler ── */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{suggestions.length}</span> aktif öneri
          </p>
          {suggestions.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              En yüksek puanlılar üstte
            </span>
          )}
        </div>
        <SuggestionsGrid suggestions={suggestions} />
      </div>
    </div>
  );
}
