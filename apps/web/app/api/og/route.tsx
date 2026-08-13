import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "Haber Nexus - Son Dakika & Güncel Haberler";
    const category = searchParams.get("category") || "GÜNDEM";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "space-between",
            backgroundColor: "#0f172a",
            backgroundImage: "radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%)",
            backgroundSize: "50px 50px",
            padding: "60px 80px",
            color: "white",
            fontFamily: "sans-serif",
          }}
        >
          {/* Top Logo / Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                backgroundColor: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: "24px",
              }}
            >
              N
            </div>
            <span style={{ fontSize: "28px", fontWeight: "800", color: "#f87171" }}>
              HABER NEXUS
            </span>
          </div>

          {/* Title and Category */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "900px" }}>
            <span
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#ef4444",
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              {category}
            </span>
            <div
              style={{
                fontSize: "52px",
                fontWeight: "800",
                lineHeight: 1.2,
                color: "#f8fafc",
              }}
            >
              {title.length > 90 ? `${title.slice(0, 90)}...` : title}
            </div>
          </div>

          {/* Bottom Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              borderTop: "1px solid #334155",
              paddingTop: "24px",
            }}
          >
            <span style={{ fontSize: "18px", color: "#94a3b8" }}>habernexus.com</span>
            <span style={{ fontSize: "18px", color: "#94a3b8", fontWeight: "600" }}>
              Yeni Nesil Haber Platformu
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (_e: unknown) {
    return new Response(`Failed to generate OG image`, { status: 500 });
  }
}
