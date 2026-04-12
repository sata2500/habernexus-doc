import { getAllCommentsAdmin, deleteCommentAdmin } from "../actions";
import { CommentTable } from "@/components/admin/CommentTable";
import { MessageSquare } from "lucide-react";

export default async function AdminCommentsPage() {
  const comments = await getAllCommentsAdmin();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Yorum Yönetimi</h1>
          <p className="text-muted-foreground text-sm">Tüm platformdaki yorumları buradan denetleyebilirsiniz.</p>
        </div>
      </div>

      <CommentTable 
        comments={comments} 
        onDelete={deleteCommentAdmin} 
        isAdmin={true} 
      />
    </div>
  );
}
