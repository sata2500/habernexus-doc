"use client";

import { useId, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { addComment } from "../../actions";
import { authClient } from "@/lib/auth-client";
import { Avatar } from "@/components/ui/Avatar";

interface Props {
  articleId: string;
  parentId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  isReply?: boolean;
}

const MAX_LENGTH = 5000;

export function CommentForm({ articleId, parentId, onSuccess, onCancel, isReply }: Props) {
  const { data: session } = authClient.useSession();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await addComment({ articleId, content, parentId });
      if (result.success) {
        setContent("");
        onSuccess();
      } else {
        setError(result.error || "Yorum gönderilemedi.");
      }
    } catch {
      setError("Yorum gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-4 w-full">
      {!isReply && session?.user && (
        <Avatar src={session.user.image || undefined} fallback={session.user.name} size="md" className="hidden sm:flex shrink-0 mt-1" />
      )}
      <form onSubmit={handleSubmit} className="flex-1 space-y-2">
        <label htmlFor={fieldId} className="sr-only">{isReply ? "Yanıtınız" : "Yorumunuz"}</label>
        <textarea
          id={fieldId}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isReply ? "Yanıtınızı yazın…" : "Düşüncelerinizi paylaşın…"}
          maxLength={MAX_LENGTH}
          rows={isReply ? 3 : 4}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className="w-full p-4 rounded-2xl bg-muted/30 border border-border focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all resize-y text-base sm:text-sm placeholder:text-muted-foreground/60"
          required
          autoFocus={isReply}
        />
        {error && (
          <p id={`${fieldId}-error`} role="alert" className="p-3 text-xs rounded-xl bg-error/10 border border-error/20 text-error font-semibold">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {content.length > MAX_LENGTH * 0.8 ? `${content.length}/${MAX_LENGTH}` : ""}
          </span>
          <div className="flex gap-2">
            {onCancel && (
              <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                İptal
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-500 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 active:scale-95 cursor-pointer focus-ring"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
              {isSubmitting ? "Gönderiliyor…" : isReply ? "Yanıtla" : "Yorumu Gönder"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
