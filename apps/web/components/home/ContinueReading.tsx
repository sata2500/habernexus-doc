"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, X } from "lucide-react";
import { removeReadingHistoryItem } from "@/app/dashboard/actions";
import { getServerSnapshot, getSnapshot, removeProgress, subscribe, unfinished, type ReadingEntry } from "@/lib/reading-progress";

/**
 * Yarım bırakılan haberler: bu cihazdakiler + (giriş yapılmışsa) hesaptakiler, yani diğer cihazlarda
 * yarım kalanlar da. Hiç yoksa hiçbir şey göstermez.
 */
export function ContinueReading({ accountEntries = [] }: { accountEntries?: ReadingEntry[] }) {
  const local = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [now] = useState(() => Date.now());
  const [hidden, setHidden] = useState<string[]>([]);
  const merged = new Map<string, ReadingEntry>();
  for (const e of [...local, ...accountEntries]) {
    const prev = merged.get(e.slug);
    if (!prev || e.at > prev.at) merged.set(e.slug, e);
  }
  const entries = [...merged.values()].filter((e) => !hidden.includes(e.slug)).sort((a, b) => b.at - a.at);
  const items = unfinished(entries, now);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="continue-reading-title" className="space-y-3">
      <h2 id="continue-reading-title" className="flex items-center gap-2 text-lg font-bold font-display">
        <BookOpen className="h-5 w-5 text-primary-500" /> Kaldığın yerden devam et
      </h2>
      <ul className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3">
        {items.map((e) => (
          <li key={e.slug} className="relative shrink-0 w-[78%] sm:w-auto">
            <Link href={`/article/${e.slug}`} className="flex gap-3 rounded-2xl border border-border bg-card p-2.5 pr-9 shadow-card hover:border-primary-500/40 transition-colors">
              <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {e.coverImage && <Image src={e.coverImage} alt="" fill sizes="80px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1 flex flex-col justify-between">
                <span className="text-sm font-semibold leading-snug line-clamp-2">{e.title}</span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <span className="block h-full rounded-full bg-primary-500" style={{ width: `${e.progress}%` }} />
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">%{e.progress}</span>
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => {
                removeProgress(e.slug);
                setHidden((h) => [...h, e.slug]);
                const accountId = accountEntries.find((a) => a.slug === e.slug)?.id;
                if (accountId) void removeReadingHistoryItem(accountId).catch(() => {});
              }}
              aria-label={`${e.title} listeden kaldır`}
              className="absolute top-1.5 right-1.5 h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
