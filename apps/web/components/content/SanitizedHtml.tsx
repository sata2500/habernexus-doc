import { sanitizeHtml } from "@/lib/server/sanitize-html";

interface SanitizedHtmlProps {
  html: unknown;
  className?: string;
}

export function SanitizedHtml({ html, className }: SanitizedHtmlProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
