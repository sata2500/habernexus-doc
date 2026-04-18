"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { toggleBookmark, checkIsBookmarked } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

interface Props {
  articleId: string;
}

export function BookmarkButton({ articleId }: Props) {
  const { data: session } = authClient.useSession();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Sayfa yüklendiğinde ve session değiştiğinde bookmark durumunu kontrol et
  useEffect(() => {
    async function getStatus() {
      if (session?.user) {
        setIsChecking(true);
        try {
          const status = await checkIsBookmarked(articleId);
          setIsBookmarked(status);
        } catch (err) {
          console.error("Bookmark status check failed:", err);
        } finally {
          setIsChecking(false);
        }
      } else {
        setIsBookmarked(false);
      }
    }
    getStatus();
  }, [articleId, session]);

  const handleToggle = async () => {
    if (!session?.user) {
      alert("Haberleri kaydetmek için lütfen giriş yapın.");
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    try {
      const res = await toggleBookmark(articleId);
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

  if (isChecking) {
    return (
      <div className="p-2 rounded-full bg-muted animate-pulse">
        <Bookmark className="h-5 w-5 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "p-2 rounded-full transition-all duration-200 cursor-pointer shadow-none flex items-center justify-center",
        isBookmarked
          ? "bg-primary-500 text-white hover:bg-primary-600 scale-110 shadow-lg shadow-primary-500/30"
          : "bg-muted text-muted-foreground hover:text-primary-50"
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
