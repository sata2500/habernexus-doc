import Link from "next/link";
import { Home, Newspaper, Search, SearchX } from "lucide-react";

/** "Sayfa bulunamadı" ekranı: aramaya ve son haberlere yönlendirir */
export function NotFoundState({ title = "Aradığınız sayfa bulunamadı", text }: { title?: string; text?: string }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center space-y-5">
        <span className="mx-auto h-14 w-14 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
          <SearchX className="h-7 w-7" aria-hidden />
        </span>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">404</p>
          <h1 className="text-2xl font-bold font-display">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {text ?? "Bağlantı hatalı olabilir ya da haber yayından kaldırılmış olabilir. Aradığınızı bulmak için arama yapabilirsiniz."}
          </p>
        </div>
        <form action="/search" method="get" role="search" className="flex gap-2">
          <label htmlFor="nf-search" className="sr-only">Haberlerde ara</label>
          <input
            id="nf-search"
            name="q"
            type="search"
            placeholder="Haberlerde ara"
            className="flex-1 min-w-0 h-11 rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary-500"
          />
          <button type="submit" aria-label="Ara" className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-xl bg-primary-600 hover:bg-primary-700 text-white cursor-pointer">
            <Search className="h-4 w-4" aria-hidden />
          </button>
        </form>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/" className="inline-flex h-11 items-center justify-center gap-2 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-muted">
            <Home className="h-4 w-4" aria-hidden /> Ana sayfa
          </Link>
          <Link href="/latest" className="inline-flex h-11 items-center justify-center gap-2 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-muted">
            <Newspaper className="h-4 w-4" aria-hidden /> Son haberler
          </Link>
        </div>
      </div>
    </div>
  );
}
