import { NextResponse } from "next/server";
import { getActiveSponsors } from "@/lib/server/monetization";

/**
 * Yayındaki sponsor reklamları. Sayfalar uzun süre önbellekte kaldığı için reklamlar ayrıca ve kısa
 * önbellekle sunulur: başlangıç/bitiş zamanları dakikasında işler, her sayfa açılışında sıra döner.
 */
export async function GET() {
  const sponsors = await getActiveSponsors();
  return NextResponse.json(
    { sponsors },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } },
  );
}
