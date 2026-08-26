import React from "react";
import { cn } from "@/lib/utils";
import { AlertOctagon, RotateCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center gap-3 py-12 px-6 rounded-[var(--radius-lg)] border",
        className
      )}
      style={{ backgroundColor: "var(--status-blocked-bg)", borderColor: "var(--hairline-strong)" }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--status-blocked-bg)" }}>
        <AlertOctagon className="w-5 h-5" style={{ color: "var(--status-blocked)" }} />
      </div>
      <div className="space-y-1 max-w-sm">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--hairline-strong)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-xs font-medium text-[var(--text-secondary)] transition-colors cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;
