import React from "react";
import { cn } from "@/lib/utils";

export type DataSource = "live" | "fallback" | "demo" | "stub";

interface DataSourceLabelProps {
  source: DataSource;
  className?: string;
}

const CONFIG: Record<DataSource, { text: string; fg: string; bg: string }> = {
  live: { text: "Live", fg: "var(--status-verified)", bg: "var(--status-verified-bg)" },
  fallback: { text: "Fallback Source", fg: "var(--status-stale)", bg: "var(--status-stale-bg)" },
  demo: { text: "DEMO DATA — NOT LIVE COMPLIANCE", fg: "var(--status-review)", bg: "var(--status-review-bg)" },
  stub: { text: "Not Yet Wired", fg: "var(--status-unavailable)", bg: "var(--status-unavailable-bg)" },
};

/** Renders the data source of the block it labels inline — never as a tooltip (compliance requirement). */
export const DataSourceLabel: React.FC<DataSourceLabelProps> = ({ source, className }) => {
  const { text, fg, bg } = CONFIG[source];
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-mono font-semibold uppercase tracking-wide",
        className
      )}
      style={{ color: fg, backgroundColor: bg }}
    >
      {text}
    </span>
  );
};

export default DataSourceLabel;
