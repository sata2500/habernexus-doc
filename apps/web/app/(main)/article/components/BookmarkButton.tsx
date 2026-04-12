"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { toggleBookmark } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

interface Props {
  articleId: string;
  userId?: string | null;
  initialIsBookmarked: boolean;
}

export function BookmarkButton({ articleId, userId, initialIsBookmarked }: Props) {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!userId) {
      alert("Haberleri kaydetmek için lütfen giriş yapın.");
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    try {
      const res = await toggleBookmark(userId, articleId);
      if (res.success) {
        setIsBookmarked(res.isBookmarked!);
      } else {
        alert(res.error || "Bir hata oluştu.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "p-2 rounded-full transition-all duration-200 cursor-pointer shadow-none flex items-center justify-center",
        isBookmarked
          ? "bg-primary-500 text-white hover:bg-primary-600 scale-110 shadow-lg shadow-primary-500/30"
          : "bg-muted text-muted-foreground hover:text-primary-500 hover:bg-primary-50"
      )}
      aria-label="Kaydet"
      title="Daha sonra okumak için kaydet"
    >
      <Bookmark
        className={cn("h-5 w-5 transition-all", isBookmarked && "fill-current")}
      />
    </button>
  );
}
