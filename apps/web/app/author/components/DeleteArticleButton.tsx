"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteArticle } from "../actions";

interface Props {
  articleId: string;
  articleTitle: string;
}

export function DeleteArticleButton({ articleId, articleTitle }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${articleTitle}" başlıklı haberi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteArticle(articleId);
    
    if (!result.success) {
      alert(result.error || "Haber silinirken bir hata oluştu.");
      setIsDeleting(false);
    }
    // Başarılı olursa revalidatePath sunucu tarafında sayfayı yenileyecektir.
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-500 cursor-pointer disabled:opacity-50"
      title="Haberi Sil"
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
