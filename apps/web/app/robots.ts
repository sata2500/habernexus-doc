import { getAppUrl } from "@/lib/utils";
import type { MetadataRoute } from "next";

const BASE_URL = getAppUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/author",
          "/author/",
          "/dashboard",
          "/dashboard/",
          "/api/auth",
          "/api/auth/",
          "/api/upload",
          "/api/media",
          "/api/media/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/admin/",
          "/author/",
          "/dashboard/",
          "/api/",
        ],
      },
    ],
    sitemap: [
      `${BASE_URL}/sitemap.xml`,
      `${BASE_URL}/news-sitemap.xml`,
    ],
  };
}
