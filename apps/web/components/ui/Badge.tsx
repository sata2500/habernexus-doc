import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "error" | "outline";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
  success: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
  warning: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
  error: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
  outline: "border border-border text-muted-foreground bg-transparent",
};

function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        "transition-colors duration-200",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge, type BadgeProps, type BadgeVariant };
