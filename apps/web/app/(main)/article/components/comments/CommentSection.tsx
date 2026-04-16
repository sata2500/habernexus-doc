"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, LogIn } from "lucide-react";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import { getComments } from "../../actions";
import Link from "next/link";

interface Props {
  articleId: string;
  userId?: string | null;
}

export function CommentSection({ articleId, userId }: Props) {
  const [comments, setComments] = useState<any[]>([]); // TODO: Prisma tipine çevrilebilir
  const [isLoading, setIsLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getComments(articleId);
      setComments(data);
    } catch (err) {
      console.error("Yorumlar yüklenirken hata oluştu:", err);
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return (
    <section className="mt-16 border-t border-border pt-12 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold font-(family-name:--font-outfit) flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary-500" />
          Yorumlar
          <span className="text-sm font-normal text-muted-foreground ml-2">({comments.length})</span>
        </h2>
      </div>

      {userId ? (
        <div className="mb-12">
          <CommentForm 
            articleId={articleId} 
            userId={userId} 
            onSuccess={fetchComments} 
          />
        </div>
      ) : (
        <div className="bg-muted/50 rounded-2xl p-8 text-center mb-12 border border-dashed border-border group hover:border-primary-500/30 transition-colors">
          <LogIn className="h-8 w-8 text-muted-foreground mx-auto mb-3 group-hover:text-primary-500 transition-colors" />
          <p className="text-muted-foreground mb-4 font-medium">Yorum yapmak için giriş yapmalısınız.</p>
          <Link
            href="/login"
            className="inline-flex items-center px-6 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-500 transition-all shadow-md shadow-primary-500/20 active:scale-95"
          >
            Giriş Yap
          </Link>
        </div>
      )}

      <div className="space-y-8">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((n) => (
              <div key={n} className="flex gap-4 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-full shrink-0" />
                <div className="flex-1 space-y-2 mt-1">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-12 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment: any) => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              userId={userId} 
              articleId={articleId}
              onUpdate={fetchComments}
            />
          ))
        ) : (
          <div className="text-center py-12 opacity-50">
            <p className="text-sm">Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
          </div>
        )}
      </div>
    </section>
  );
}
