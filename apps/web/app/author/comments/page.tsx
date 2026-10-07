import { getAuthorComments, deleteCommentByAuthor } from "../actions";
import { CommentTable } from "@/components/admin/CommentTable";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuthorCommentsPage() {
  const comments = await getAuthorComments();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2.5">
          <MessageSquare className="h-6 w-6 text-primary-500" /> Yorumlar
        </h1>
        <p className="text-sm text-muted-foreground">Haberlerine gelen yorumlar ({comments.length}). Uygunsuz yorumları buradan kaldırabilirsin.</p>
      </div>

      <CommentTable
        comments={comments}
        onDelete={deleteCommentByAuthor}
        isAdmin={false}
      />
    </div>
  );
}
