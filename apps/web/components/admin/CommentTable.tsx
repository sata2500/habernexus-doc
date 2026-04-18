"use client";

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
}

export function CommentTable({ comments, onDelete, isAdmin }: Props) {
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

  return (
    <div className="mt-6 border border-border rounded-2xl overflow-hidden shadow-sm bg-background">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Kullanıcı / Yorum</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Makale</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tarih</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {comments.map((comment) => (
              <tr key={comment.id} className="hover:bg-muted/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex gap-4">
                    <Avatar 
                      src={comment.user.image || undefined} 
                      fallback={comment.user.name} 
                      size="sm" 
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate">{comment.user.name}</span>
                        {isAdmin && comment.user.email && (
                          <span className="text-[10px] text-muted-foreground">({comment.user.email})</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{comment.content}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-[200px]">
                    <Link 
                      href={`/article/${comment.article.slug}`}
                      className="text-xs font-medium text-primary-600 hover:underline flex items-center gap-1.5"
                      target="_blank"
                    >
                      <span className="truncate">{comment.article.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-all disabled:opacity-50 cursor-pointer"
                    title="Yorumu Kaldır"
                  >
                    {deletingId === comment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
