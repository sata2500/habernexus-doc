/**
 * SEO JSON-LD Structured Data Bileşenleri
 *
 * Google Rich Results, Google News ve Top Stories için
 * schema.org uyumlu yapılandırılmış veri bileşenleri.
 *
 * @see https://developers.google.com/search/docs/appearance/structured-data/article
 * @see https://schema.org/NewsArticle
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Haber Nexus";

// XSS koruması: JSON-LD içinde < karakterini escape et
function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/* ─────────────────────────────────────────────
   WebSite JSON-LD — Root Layout için
   Google Sitelinks Search Box desteği
   ───────────────────────────────────────────── */
export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: BASE_URL,
    inLanguage: "tr-TR",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

/* ─────────────────────────────────────────────
   Organization JSON-LD — Root Layout için
   ───────────────────────────────────────────── */
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE_NAME,
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/logo.png`,
      width: 600,
      height: 60,
    },
    sameAs: [
      "https://twitter.com/habernexus",
      "https://instagram.com/habernexus",
      "https://youtube.com/habernexus",
      "https://github.com/habernexus",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

/* ─────────────────────────────────────────────
   NewsArticle JSON-LD — Makale Detay Sayfası
   ───────────────────────────────────────────── */
interface NewsArticleJsonLdProps {
  title: string;
  description: string;
  slug: string;
  coverImage?: string | null;
  datePublished?: Date | null;
  dateModified?: Date | null;
  authorName: string;
  authorImage?: string | null;
  categoryName?: string | null;
  tags?: string[];
  wordCount?: number;
}

export function NewsArticleJsonLd({
  title,
  description,
  slug,
  coverImage,
  datePublished,
  dateModified,
  authorName,
  authorImage,
  categoryName,
  tags = [],
  wordCount,
}: NewsArticleJsonLdProps) {
  const articleUrl = `${BASE_URL}/article/${slug}`;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    headline: title.length > 110 ? title.substring(0, 110) : title,
    description,
    url: articleUrl,
    inLanguage: "tr-TR",
    author: {
      "@type": "Person",
      name: authorName,
      ...(authorImage ? { image: authorImage } : {}),
    },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: SITE_NAME,
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
        width: 600,
        height: 60,
      },
      sameAs: [
        "https://twitter.com/habernexus",
        "https://instagram.com/habernexus"
      ]
    },
    isAccessibleForFree: "True",
    hasPart: {
      "@type": "WebPageElement",
      "isAccessibleForFree": "True",
      "cssSelector": ".prose"
    }
  };

  if (coverImage) {
    data.image = {
      "@type": "ImageObject",
      url: coverImage,
    };
    data.thumbnailUrl = coverImage;
  }

  if (datePublished) {
    data.datePublished = datePublished.toISOString();
  }

  if (dateModified) {
    data.dateModified = dateModified.toISOString();
  } else if (datePublished) {
    data.dateModified = datePublished.toISOString();
  }

  if (categoryName) {
    data.articleSection = categoryName;
  }

  if (tags.length > 0) {
    data.keywords = tags.join(", ");
  }

  if (wordCount) {
    data.wordCount = wordCount;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

/* ─────────────────────────────────────────────
   BreadcrumbList JSON-LD — Navigasyon yapısı
   ───────────────────────────────────────────── */
interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Anasayfa",
        item: BASE_URL,
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.name,
        item: `${BASE_URL}${item.href}`,
      })),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
