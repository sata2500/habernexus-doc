"use client";

import { useState, useTransition } from "react";
import { updateArticleStatus, deleteArticle } from "../actions";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Trash2, Eye, EyeOff } from "lucide-react";

interface Article {
  id: string;
  title: string;
  status: string;
  viewCount: number;
  createdAt: Date;
  publishedAt: Date | null;
  author: { name: string; email: string };
  category: { name: string; color: string | null } | null;
}

function getStatusInfo(status: string) {
  if (status === "PUBLISHED") return { label: "Yayında", variant: "success" as const };
  if (status === "DRAFT")     return { label: "Taslak",  variant: "warning" as const };
  return { label: status, variant: "default" as const };
}

export function ArticleModerator({ articles }: { articles: Article[] }) {
  const [pending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  const handleStatus = (id: string, newStatus: string) => {
    setActionId(id + "-status");
    startTransition(async () => {
      await updateArticleStatus(id, newStatus);
      setActionId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bu makaleyi kalıcı olarak silmek istediğinizden emin misiniz?")) return;
    setActionId(id + "-delete");
    startTransition(async () => {
      await deleteArticle(id);
      setActionId(null);
    });
  };

  return (
    <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
      {articles.map((article: any) => {
        const { label, variant } = getStatusInfo(article.status);
        const isLoading = actionId?.startsWith(article.id);

        return (
          <div key={article.id} className="flex items-center gap-4 p-4 bg-background hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-sm font-medium truncate">{article.title}</p>
              <p className="text-xs text-muted-foreground">
                {article.author.name}
                {article.category && <> · <span style={{ color: article.category.color || undefined }}>{article.category.name}</span></>}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" /> {article.viewCount}
            </div>
            <Badge variant={variant}>{label}</Badge>
            <div className="flex items-center gap-1.5 shrink-0">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <button
                    onClick={() => handleStatus(article.id, article.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title={article.status === "PUBLISHED" ? "Taslağa al" : "Yayınla"}
                  >
                    {article.status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
