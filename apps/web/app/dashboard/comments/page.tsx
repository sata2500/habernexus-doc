import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserComments, deleteUserComment } from "../actions";
import { CommentTable } from "@/components/admin/CommentTable";
import { MessageSquare } from "lucide-react";
import { redirect } from "next/navigation";

export default async function UserCommentsPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user) {
    redirect("/login");
  }

  const comments = await getUserComments();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary-500" />
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Yorumlarım</h1>
          <p className="text-muted-foreground text-sm">Platform üzerinde yaptığınız tüm yorumlar ve geçmişiniz.</p>
        </div>
      </div>

      <CommentTable 
        comments={comments} 
        onDelete={deleteUserComment} 
        isAdmin={false} 
      />
    </div>
  );
}
