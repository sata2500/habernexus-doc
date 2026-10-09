"use client";

import { cn, SITE_TIME_ZONE } from "@/lib/utils";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Trash2, ExternalLink, MessageSquare, Loader2 } from "lucide-react";
import Link from "next/link";

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  user: { name: string; image: string | null; email?: string };
  article: { title: string; slug: string };
}

interface Props {
  comments: Comment[];
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  isAdmin?: boolean;
  /** Yorumu yazanın adı ve fotoğrafı (kullanıcının kendi yorumlarında gereksiz) */
  showUser?: boolean;
}

export function CommentTable({ comments, onDelete, isAdmin, showUser = true }: Props) {
  const [, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
    
    setDeletingId(id);
    startTransition(async () => {
      const resp = await onDelete(id);
      if (!resp.success) {
        alert(resp.error || "Silme işlemi başarısız.");
      }
      setDeletingId(null);
    });
  };

  if (comments.length === 0) {
    return (
      <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border mt-6">
        <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">Henüz yorum bulunmuyor.</h3>
      </div>
    );
  }

  const date = (d: Date) => new Date(d).toLocaleDateString("tr-TR", { timeZone: SITE_TIME_ZONE });
  const deleteButton = (id: string) => (
    <button
      type="button"
      onClick={() => handleDelete(id)}
      disabled={deletingId === id}
      className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:bg-error/10 hover:text-error border border-border/60 hover:border-error/25 transition-all disabled:opacity-50 cursor-pointer"
      title="Yorumu sil"
      aria-label="Yorumu sil"
    >
      {deletingId === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );

  return (
    <ul className="mt-6 rounded-2xl border border-border bg-card shadow-soft divide-y divide-border/60 overflow-hidden animate-in fade-in duration-300">
      {/* Masaüstünde sütun başlıkları; mobilde her yorum bir kart */}
      <li aria-hidden="true" className="hidden md:grid grid-cols-[minmax(0,1fr)_14rem_6rem_2.25rem] gap-4 px-5 py-3 bg-muted/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span>{showUser ? "Kullanıcı / Yorum" : "Yorum"}</span><span>Haber</span><span>Tarih</span><span />
      </li>
      {comments.map((comment) => (
        <li key={comment.id} className="p-4 md:px-5 md:grid md:grid-cols-[minmax(0,1fr)_14rem_6rem_2.25rem] md:gap-4 md:items-start hover:bg-primary-500/5 transition-colors">
          <div className="flex gap-3 min-w-0">
            {showUser && <Avatar src={comment.user.image || undefined} fallback={comment.user.name} size="sm" />}
            <div className="min-w-0 flex-1">
              {showUser && (
                <p className="flex flex-wrap items-baseline gap-x-2 min-w-0">
                  <span className="text-sm font-bold truncate max-w-full">{comment.user.name}</span>
                  {isAdmin && comment.user.email && <span className="text-[11px] text-muted-foreground truncate max-w-full">{comment.user.email}</span>}
                </p>
              )}
              <p className={cn("text-sm text-foreground/90 line-clamp-4 break-words whitespace-pre-wrap", showUser && "mt-1")}>{comment.content}</p>
            </div>
            <div className="md:hidden">{deleteButton(comment.id)}</div>
          </div>

          <div className={cn("mt-3 md:mt-0 min-w-0 text-xs", showUser && "pl-11 md:pl-0")}>
            <Link
              href={`/article/${comment.article.slug}`}
              target="_blank"
              className="inline-flex items-start gap-1.5 font-semibold text-primary-500 hover:text-primary-600 hover:underline max-w-full"
            >
              <span className="line-clamp-2 break-words">{comment.article.title}</span>
              <ExternalLink className="h-3 w-3 shrink-0 mt-0.5" aria-hidden="true" />
            </Link>
            <p className="md:hidden mt-1 text-muted-foreground">{date(comment.createdAt)}</p>
          </div>

          <span className="hidden md:block text-xs text-muted-foreground">{date(comment.createdAt)}</span>
          <div className="hidden md:block">{deleteButton(comment.id)}</div>
        </li>
      ))}
    </ul>
  );
}
