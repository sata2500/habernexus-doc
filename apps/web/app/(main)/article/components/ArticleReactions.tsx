"use client";

import { useState, useEffect } from "react";
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

export function ArticleReactions({ articleId }: ArticleReactionsProps) {
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    const storageKey = `reactions:${articleId}`;
    const userSelectedKey = `user_reaction:${articleId}`;

    try {
      const storedCounts = localStorage.getItem(storageKey);
      const userSelected = localStorage.getItem(userSelectedKey);

      if (userSelected) {
        setSelectedReaction(userSelected);
      }

      if (storedCounts) {
        setCounts(JSON.parse(storedCounts));
      } else {
        // Initialize with default base counts
        const initial = DEFAULT_REACTIONS.reduce((acc, r) => {
          acc[r.id] = r.baseCount;
          return acc;
        }, {} as Record<string, number>);
        setCounts(initial);
      }
    } catch {
      // Ignored
    }
  }, [articleId]);

  const handleSelect = (reactionId: string) => {
    const storageKey = `reactions:${articleId}`;
    const userSelectedKey = `user_reaction:${articleId}`;

    const newCounts = { ...counts };

    if (selectedReaction === reactionId) {
      // Toggle off
      newCounts[reactionId] = Math.max(0, (newCounts[reactionId] || 1) - 1);
      setSelectedReaction(null);
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
      setSelectedReaction(reactionId);
      try {
        localStorage.setItem(userSelectedKey, reactionId);
        localStorage.setItem(storageKey, JSON.stringify(newCounts));
      } catch {
        // Ignored
      }
    }

    setCounts(newCounts);
  };

  const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

  if (!hasMounted) {
    return null;
  }

  return (
    <div className="w-full my-10 p-6 rounded-3xl bg-muted/20 border border-border/50 backdrop-blur-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-base font-bold font-display text-foreground">
            Bu haber hakkındaki düşünceniz nedir?
          </h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          Toplam {totalReactions} okur tepkisi
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
        {DEFAULT_REACTIONS.map((r) => {
          const count = counts[r.id] ?? r.baseCount;
          const isSelected = selectedReaction === r.id;

          return (
            <button
              key={r.id}
              onClick={() => handleSelect(r.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-95 group ${
                isSelected
                  ? "bg-primary-500/15 border-primary-500 text-foreground shadow-sm scale-102 ring-2 ring-primary-500/30"
                  : "bg-card/70 border-border/60 hover:border-primary-500/40 hover:bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-2xl group-hover:scale-125 transition-transform duration-200 select-none">
                {r.emoji}
              </span>
              <span className="text-xs font-semibold mt-1.5">{r.label}</span>
              <span
                className={`text-[11px] font-bold mt-0.5 px-2 py-0.2 rounded-full ${
                  isSelected
                    ? "bg-primary-500 text-white font-extrabold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
