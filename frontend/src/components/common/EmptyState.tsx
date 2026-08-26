import React from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center gap-3 py-12 px-6 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--surface-1)]",
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] flex items-center justify-center">
        <Icon className="w-5 h-5 text-[var(--text-tertiary)]" />
      </div>
      <div className="space-y-1 max-w-sm">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        {description && <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
};

export default EmptyState;
