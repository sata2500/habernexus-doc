import * as LucideIcons from "lucide-react";
import { LucideIcon, Bookmark } from "lucide-react";

interface Props {
  name: string | null | undefined;
  className?: string;
  style?: React.CSSProperties;
  fallback?: LucideIcon;
}

export function DynamicIcon({ name, className, style, fallback: Fallback = Bookmark }: Props) {
  if (!name) return <Fallback className={className} style={style} />;
  
  // @ts-expect-error — LucideIcons is a dynamic import, key access is intentional
  const Icon = LucideIcons[name] || LucideIcons[name.charAt(0).toUpperCase() + name.slice(1)];
  
  if (!Icon) return <Fallback className={className} style={style} />;
  
  return <Icon className={className} style={style} />;
}
