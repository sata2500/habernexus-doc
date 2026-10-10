"use client";

import { confirmDialog, toast } from "@/components/ui/feedback";

import { SITE_TIME_ZONE } from "@/lib/utils";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Trash2, Reply } from "lucide-react";
import { CommentForm } from "./CommentForm";
import { deleteComment } from "../../actions";

interface CommentDetail {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  user?: { name: string; image?: string | null };
  replies?: CommentDetail[];
}

interface Props {
  comment: CommentDetail;
  userId?: string | null;
  articleId: string;
  onUpdate: () => void;
  isReply?: boolean;
  /** Yanıtlar ana yorumun altında toplanır: yanıta yanıt da ana yoruma bağlanır */
  rootId?: string;
}

export function CommentItem({ comment, userId, articleId, onUpdate, isReply, rootId }: Props) {
  const [isReplying, setIsReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = userId === comment.userId;
  const createdAt = new Date(comment.createdAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SITE_TIME_ZONE,
  });

  const handleDelete = async () => {
    if (!(await confirmDialog({ title: "Yorum silinsin mi?", message: "Bu işlem geri alınamaz.", confirmText: "Sil", tone: "danger" }))) return;

    setIsDeleting(true);
    const result = await deleteComment(comment.id);
    if (result.success) {
      onUpdate();
    } else {
      toast.error(result.error || "Yorum silinemedi.");
      setIsDeleting(false);
    }
  };

  const userName = comment.user?.name || "Anonim";
  const userImage = comment.user?.image || undefined;

  return (
    <article className={`group animate-in fade-in duration-300 ${isReply ? "ml-4 sm:ml-12 border-l-2 border-border pl-4 sm:pl-6 py-2" : ""}`} aria-label={`${userName} yorumu`}>
      <div className="flex gap-4">
        <Avatar
          src={userImage}
          fallback={userName}
          size="sm"
          className="shrink-0 ring-2 ring-background shadow-sm"
        />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-(family-name:--font-outfit)">{userName}</span>
              <time dateTime={new Date(comment.createdAt).toISOString()} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded leading-none">{createdAt}</time>
            </div>

            {(canDelete || userId) && (
              <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {userId && !isReplying && (
                  <button
                    type="button"
                    onClick={() => setIsReplying(true)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary-500 transition-colors cursor-pointer"
                    title="Yanıtla"
                    aria-label={`${userName} yorumunu yanıtla`}
                  >
                    <Reply className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-2 rounded-lg hover:bg-error/10 text-muted-foreground hover:text-error transition-colors disabled:opacity-50 cursor-pointer"
                    title="Sil"
                    aria-label="Yorumumu sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-muted/20 dark:bg-muted/10 p-3.5 rounded-2xl rounded-tl-none border border-border/50 text-sm leading-relaxed whitespace-pre-line break-words">
            {comment.content}
          </div>

        </div>
      </div>

      {isReplying && (
        <div className="mt-4">
          <CommentForm
            articleId={articleId}

            parentId={rootId ?? comment.id}
            isReply
            onSuccess={() => {
              setIsReplying(false);
              onUpdate();
            }}
            onCancel={() => setIsReplying(false)}
          />
        </div>
      )}

      {/* Alt Yanıtlar (Recursive) */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              userId={userId}
              articleId={articleId}
              onUpdate={onUpdate}
              isReply
              rootId={comment.id}
            />
          ))}
        </div>
      )}
    </article>
  );
}
