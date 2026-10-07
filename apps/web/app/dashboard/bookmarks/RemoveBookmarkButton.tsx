"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkX, Loader2 } from "lucide-react";
import { toggleBookmark } from "../actions";

/** Kaydedilenler listesinden çıkarma (kartın sağ üst köşesinde) */
export function RemoveBookmarkButton({ articleId, title }: { articleId: string; title: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => start(async () => {
        const res = await toggleBookmark(articleId);
        if (res.success) router.refresh();
        else alert(res.error);
      })}
      disabled={pending}
      aria-label={`${title} kaydedilenlerden çıkar`}
      title="Kaydedilenlerden çıkar"
      className="absolute top-2 right-2 z-10 h-9 w-9 inline-flex items-center justify-center rounded-full bg-black/55 backdrop-blur-md text-white hover:bg-error disabled:opacity-60 cursor-pointer focus-ring"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BookmarkX className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
