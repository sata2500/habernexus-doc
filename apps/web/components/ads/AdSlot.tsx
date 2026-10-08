import { getPublicMonetization } from "@/lib/server/monetization";
import { PLACEMENTS, type PlacementKey } from "@/lib/monetization";
import { AdSlotClient } from "./AdSlotClient";

/**
 * Sayfadaki bir reklam alanı. Yönetim panelinde kapalıysa (ya da kaynağı hazır değilse) hiçbir şey
 * çizmez; açıksa sponsor ya da AdSense reklamını tarayıcıda seçer.
 */
export async function AdSlot({ placement, className }: { placement: PlacementKey; className?: string }) {
  const m = await getPublicMonetization();
  const cfg = m.placements[placement];
  if (cfg.mode === "off") return null;
  const adsenseSlot = m.adsensePublisherId && cfg.adsenseSlot ? cfg.adsenseSlot : null;
  if (cfg.mode === "adsense" && !adsenseSlot) return null;
  return (
    <AdSlotClient
      placement={placement}
      format={PLACEMENTS[placement].format}
      mode={cfg.mode}
      adsenseClient={m.adsensePublisherId}
      adsenseSlot={adsenseSlot}
      className={className}
    />
  );
}
