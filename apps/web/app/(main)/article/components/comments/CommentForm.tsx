"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { addComment } from "../../actions";

interface Props {
  articleId: string;
  userId: string;
  parentId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  isReply?: boolean;
}

export function CommentForm({ articleId, userId, parentId, onSuccess, onCancel, isReply }: Props) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await addComment({
      articleId,
      userId,
      content,
      parentId,
    });

    if (result.success) {
      setContent("");
      onSuccess();
    } else {
      alert(result.error);
    }
    setIsSubmitting(false);
  };

  return (
    <div className={`flex gap-4 ${isReply ? "mt-4 ml-8" : ""}`}>
      {!isReply && (
        <div className="hidden sm:block shrink-0 mt-1">
          <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold border border-primary-200/50">
            {/* User image from parent or context? For now simple fallback */}
            <span className="text-xs">HB</span>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex-1 space-y-3">
        <div className="relative group">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isReply ? "Yanıtınızı yazın..." : "Düşüncelerinizi paylaşın..."}
            className="w-full min-h-[100px] p-4 rounded-2xl bg-muted/30 border border-border focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all resize-none text-sm placeholder:text-muted-foreground/60"
            required
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                İptal
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-500 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  {isReply ? "Yanıtla" : "Yorumu Gönder"}
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
