"use client";

import { ErrorState } from "@/components/system/ErrorState";

export default function SectionError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorState error={error} retry={retry} homeHref="/author" homeLabel="Yazar masasına dön" />;
}
