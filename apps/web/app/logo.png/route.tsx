import { ImageResponse } from "next/og";

export const dynamic = "force-static";

const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Haber Nexus";

/**
 * Yayıncı logosu (600×60). Haberlerin yapılandırılmış verisinde (NewsArticle.publisher.logo)
 * ve kuruluş bilgisinde kullanılır; Google bu adresin geçerli bir görsel olmasını bekler.
 */
export function GET() {
  const [first, ...rest] = SITE_NAME.split(" ");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 14, padding: "0 8px", background: "#ffffff" }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: "#dc2626", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800 }}>
          {(rest[0] ?? first).charAt(0)}
        </div>
        <div style={{ display: "flex", fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>
          <span style={{ color: "#dc2626" }}>{first}</span>
          {rest.length > 0 && <span style={{ color: "#111827", marginLeft: 10 }}>{rest.join(" ")}</span>}
        </div>
      </div>
    ),
    { width: 600, height: 60, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
