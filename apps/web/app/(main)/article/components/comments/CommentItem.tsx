"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { MessageSquare, Trash2, Reply, MoreHorizontal } from "lucide-react";
import { CommentForm } from "./CommentForm";
import { deleteComment } from "../../actions";

interface Props {
  comment: any;
  userId?: string | null;
  articleId: string;
  onUpdate: () => void;
  isReply?: boolean;
}

export function CommentItem({ comment, userId, articleId, onUpdate, isReply }: Props) {
  const [isReplying, setIsReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = userId === comment.userId;
  const createdAt = new Date(comment.createdAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleDelete = async () => {
    if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
    
    setIsDeleting(true);
    const result = await deleteComment(comment.id, userId!);
    if (result.success) {
      onUpdate();
    } else {
      alert(result.error);
      setIsDeleting(false);
    }
  };

  return (
    <div className={`group animate-in fade-in slide-in-from-left-2 duration-300 ${isReply ? "ml-8 sm:ml-12 border-l-2 border-border pl-6 py-2" : ""}`}>
      <div className="flex gap-4">
        <Avatar 
          src={comment.user.image || undefined} 
          fallback={comment.user.name} 
          size="sm" 
          className="shrink-0 ring-2 ring-background shadow-sm"
        />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-(family-name:--font-outfit) hover:text-primary-600 transition-colors cursor-pointer">{comment.user.name}</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded leading-none">{createdAt}</span>
            </div>
            
            {(canDelete || userId) && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {userId && !isReplying && (
                  <button 
                    onClick={() => setIsReplying(true)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary-500 transition-colors"
                    title="Yanıtla"
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-muted/20 dark:bg-muted/10 p-3.5 rounded-2xl rounded-tl-none border border-border/50 text-sm leading-relaxed">
            {comment.content}
          </div>

          {/* Aksiyon Butonları (Mobil ve Normal Görünüm İçin Alternatif) */}
          {!isReplying && userId && !isReply && (
             <button 
               onClick={() => setIsReplying(true)}
               className="text-[11px] font-bold text-muted-foreground hover:text-primary-600 flex items-center gap-1 mt-1 transition-colors"
             >
               <Reply className="h-3 w-3" /> YANITLA
             </button>
          )}
        </div>
      </div>

      {isReplying && (
        <div className="mt-4">
          <CommentForm 
            articleId={articleId} 
            userId={userId!} 
            parentId={comment.id}
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
          {comment.replies.map((reply: any) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              userId={userId} 
              articleId={articleId} 
              onUpdate={onUpdate}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
