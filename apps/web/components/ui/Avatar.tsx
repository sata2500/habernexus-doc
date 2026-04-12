import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  fallback?: string;
  className?: string;
}

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const imageSizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

function Avatar({ src, alt = "Avatar", size = "md", fallback, className }: AvatarProps) {
  const initials = fallback
    ? fallback
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : null;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        "rounded-full overflow-hidden",
        "bg-primary-100 text-primary-700",
        "ring-2 ring-background",
        sizeMap[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={imageSizeMap[size]}
          height={imageSizeMap[size]}
          className="object-cover w-full h-full"
        />
      ) : initials ? (
        <span className="font-semibold font-(family-name:--font-outfit) select-none">
          {initials}
        </span>
      ) : (
        <User className="h-1/2 w-1/2 text-primary-400" />
      )}
    </div>
  );
}

export { Avatar, type AvatarProps };
