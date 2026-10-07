import { rssResponse } from "@/lib/rss-utils";

/** Genel akış (Türkçe) */
export function GET() {
  return rssResponse({ lang: "tr", selfPath: "/rss.xml" });
}
