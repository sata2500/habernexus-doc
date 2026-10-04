"use client";

import { useState, useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";

interface Reaction {
  id: string;
  emoji: string;
  label: string;
  baseCount: number;
}

const DEFAULT_REACTIONS: Reaction[] = [
  { id: "like", emoji: "👍", label: "Beğendim", baseCount: 14 },
  { id: "insightful", emoji: "💡", label: "Bilgilendirici", baseCount: 9 },
  { id: "surprised", emoji: "😮", label: "Şaşırtıcı", baseCount: 6 },
  { id: "applause", emoji: "👏", label: "Tebrik", baseCount: 8 },
  { id: "angry", emoji: "😡", label: "Tepkili", baseCount: 2 },
];

interface ArticleReactionsProps {
  articleId: string;
}

const subscribeNoop = () => () => {};

function getInitialCounts(): Record<string, number> {
  return DEFAULT_REACTIONS.reduce((acc, r) => {
    acc[r.id] = r.baseCount;
    return acc;
  }, {} as Record<string, number>);
}

function readStoredReactions(articleId: string) {
  const state = {
    articleId,
    selectedReaction: null as string | null,
    counts: getInitialCounts(),
  };
  if (typeof window === "undefined") return state;

  try {
    const storedCounts = localStorage.getItem(`reactions:${articleId}`);
    state.selectedReaction = localStorage.getItem(`user_reaction:${articleId}`);
    if (storedCounts) {
      state.counts = JSON.parse(storedCounts);
    }
  } catch {
    // Ignored
  }
  return state;
}

export function ArticleReactions({ articleId }: ArticleReactionsProps) {
  // Sunucuda ve hidrasyon sırasında false, istemcide true döner
  const hasMounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [stored, setStored] = useState(() => readStoredReactions(articleId));

  // articleId değişirse localStorage'dan yeniden oku (render sırasında state ayarlama deseni)
  if (stored.articleId !== articleId) {
    setStored(readStoredReactions(articleId));
  }

  const { selectedReaction, counts } = stored;

  const handleSelect = (reactionId: string) => {
    const storageKey = `reactions:${articleId}`;
    const userSelectedKey = `user_reaction:${articleId}`;

    const newCounts = { ...counts };

    if (selectedReaction === reactionId) {
      // Toggle off
      newCounts[reactionId] = Math.max(0, (newCounts[reactionId] || 1) - 1);
      setStored({ articleId, selectedReaction: null, counts: newCounts });
      try {
        localStorage.removeItem(userSelectedKey);
        localStorage.setItem(storageKey, JSON.stringify(newCounts));
      } catch {
        // Ignored
      }
    } else {
      // Decrement previous if any
      if (selectedReaction && newCounts[selectedReaction]) {
        newCounts[selectedReaction] = Math.max(0, newCounts[selectedReaction] - 1);
      }
      // Increment new
      newCounts[reactionId] = (newCounts[reactionId] || 0) + 1;
      setStored({ articleId, selectedReaction: reactionId, counts: newCounts });
      try {
        localStorage.setItem(userSelectedKey, reactionId);
        localStorage.setItem(storageKey, JSON.stringify(newCounts));
      } catch {
        // Ignored
      }
    }
  };

  const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

  if (!hasMounted) {
    return null;
  }

  return (
    <section aria-label="Okur tepkileri" className="w-full my-8 p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="flex items-center gap-2 text-sm sm:text-base font-bold font-display text-foreground">
          <Sparkles className="h-4 w-4 text-primary-500 shrink-0" />
          Bu habere tepkiniz?
        </h3>
        <span className="text-[11px] sm:text-xs text-muted-foreground font-medium shrink-0">
          {totalReactions} tepki
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {DEFAULT_REACTIONS.map((r) => {
          const count = counts[r.id] ?? r.baseCount;
          const isSelected = selectedReaction === r.id;

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r.id)}
              aria-pressed={isSelected}
              aria-label={`${r.label}: ${count}`}
              title={r.label}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 group ${
                isSelected
                  ? "bg-primary-500/15 border-primary-500 text-foreground ring-1 ring-primary-500/30"
                  : "bg-card/70 border-border/60 hover:border-primary-500/40 hover:bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xl sm:text-2xl leading-none group-hover:scale-110 transition-transform duration-200 select-none">
                {r.emoji}
              </span>
              <span className={`text-xs font-bold tabular-nums ${isSelected ? "text-primary-500" : ""}`}>
                {count}
              </span>
              <span className="hidden sm:block text-[11px] font-medium truncate max-w-full">{r.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
