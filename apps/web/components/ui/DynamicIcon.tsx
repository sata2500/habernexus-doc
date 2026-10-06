import { createElement } from "react";
import { Bookmark, type LucideIcon } from "lucide-react";
import { categoryIcon } from "./category-icons";

interface Props {
  name: string | null | undefined;
  className?: string;
  style?: React.CSSProperties;
  fallback?: LucideIcon;
}

/** Kategoriye kayıtlı simgeyi çizer; tanınmayan adlarda yedek simge kullanılır. */
export function DynamicIcon({ name, className, style, fallback = Bookmark }: Props) {
  // Simge sabit bir tablodan seçilir (render sırasında yeni bileşen oluşturulmaz)
  return createElement(categoryIcon(name) ?? fallback, { className, style, "aria-hidden": true });
}
