"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { toggleBookmark, checkIsBookmarked } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

interface Props {
  articleId: string;
}

export function BookmarkButton({ articleId }: Props) {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id;
  const router = useRouter();
  const pathname = usePathname();

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Oturum açıksa kayıt durumu okunur
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    checkIsBookmarked(articleId)
      .then((status) => { if (!cancelled) setIsBookmarked(status); })
      .catch((err) => console.error("Bookmark status check failed:", err));
    return () => { cancelled = true; };
  }, [articleId, userId]);

  const handleToggle = async () => {
    if (!userId) {
      // Girişten sonra aynı habere dönülür
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await toggleBookmark(articleId);
      if (res.success) setIsBookmarked(!!res.isBookmarked);
      else setError(res.error || "Kaydedilemedi.");
    } catch {
      setError("Kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  };

  const saved = !!userId && isBookmarked;
  const label = !userId ? "Kaydetmek için giriş yapın" : saved ? "Kaydedilenlerden çıkar" : "Daha sonra okumak için kaydet";

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading || isPending}
      aria-pressed={saved}
      aria-label={label}
      title={error ?? label}
      className={cn(
        "h-10 w-10 rounded-full transition-colors duration-200 cursor-pointer flex items-center justify-center focus-ring disabled:opacity-60",
        saved
          ? "bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/30"
          : "bg-muted text-muted-foreground hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20",
        error && "ring-2 ring-error",
      )}
    >
      <Bookmark className={cn("h-5 w-5", saved && "fill-current")} aria-hidden="true" />
    </button>
  );
}
