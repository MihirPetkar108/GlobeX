import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "line" | "card" | "row" | "circle";
  count?: number;
  className?: string;
}

const pulse = "animate-pulse bg-[var(--surface-3)] rounded-[var(--radius-md)]";

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = "line",
  count = 1,
  className,
}) => {
  const items = Array.from({ length: count });

  if (variant === "circle") {
    return (
      <div className={cn("flex gap-2", className)}>
        {items.map((_, i) => (
          <div key={i} className={cn(pulse, "w-10 h-10 rounded-full")} />
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("grid gap-3", className)}>
        {items.map((_, i) => (
          <div key={i} className={cn(pulse, "h-28 w-full")} />
        ))}
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div className={cn("space-y-2", className)}>
        {items.map((_, i) => (
          <div key={i} className={cn(pulse, "h-12 w-full")} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((_, i) => (
        <div key={i} className={cn(pulse, "h-3", i % 3 === 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
