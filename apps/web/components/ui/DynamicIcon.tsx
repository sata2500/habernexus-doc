import * as LucideIcons from "lucide-react";
import { LucideIcon, Bookmark } from "lucide-react";

interface Props {
  name: string | null | undefined;
  className?: string;
  fallback?: LucideIcon;
}

export function DynamicIcon({ name, className, fallback: Fallback = Bookmark }: Props) {
  if (!name) return <Fallback className={className} />;
  
  // @ts-ignore
  const Icon = LucideIcons[name] || LucideIcons[name.charAt(0).toUpperCase() + name.slice(1)];
  
  if (!Icon) return <Fallback className={className} />;
  
  return <Icon className={className} />;
}
