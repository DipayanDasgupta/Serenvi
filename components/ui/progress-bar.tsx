import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  color?: "accent" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  label?: string;
  className?: string;
}

const colorClasses: Record<string, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const sizeClasses: Record<string, string> = {
  sm: "h-1.5",
  md: "h-2.5",
};

export function ProgressBar({
  value,
  color = "accent",
  size = "md",
  label,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm text-muted">{label}</span>
          <span className="text-sm font-medium text-foreground">
            {Math.round(clamped)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-surface-2",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            colorClasses[color]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
