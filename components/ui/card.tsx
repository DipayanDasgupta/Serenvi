import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  className?: string;
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function Card({ className, children, title, subtitle }: CardProps) {
  return (
    <div className={cn("glass rounded-2xl p-6", className)}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
