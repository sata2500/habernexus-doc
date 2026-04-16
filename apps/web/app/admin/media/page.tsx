"use server";

import { getAdminMedia } from "@/app/actions/admin-media";
import { MediaManagerClient, type MediaItem } from "./MediaManagerClient";
import { Card } from "@/components/ui/Card";
import { ImageIcon } from "lucide-react";

export default async function AdminMediaPage() {
  const media = await getAdminMedia();
  type AdminMedia = Awaited<ReturnType<typeof getAdminMedia>>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Medya Kütüphanesi</h1>
          <p className="text-muted-foreground text-sm">Yüklenen tüm görselleri yönetin ve optimize edin.</p>
        </div>
        <div className="px-4 py-2 bg-primary-500/10 text-primary-500 rounded-xl border border-primary-500/20 text-sm font-medium flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          {media.length} Toplam Medya
        </div>
      </div>

      <MediaManagerClient initialMedia={media as unknown as MediaItem[]} />
    </div>
  );
}
