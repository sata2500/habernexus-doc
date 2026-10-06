import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated" | "interactive";
  noPadding?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", noPadding, children, ...props }, ref) => {
    const variants = {
      default: "bg-card card-360-border shadow-card transition-all duration-300",
      glass: "glass-premium card-360-border transition-all duration-300",
      elevated: "bg-card card-360-border shadow-card-hover transition-all duration-300",
      interactive:
        "bg-card card-360-border shadow-card hover-lift transition-all duration-300",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl",
          !noPadding && "p-6",
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card, type CardProps };
