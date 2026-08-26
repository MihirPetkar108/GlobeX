import React from "react";
import { cn } from "@/lib/utils";

export interface MetricItem {
  label: string;
  value: React.ReactNode;
  subtext?: string | React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  accentColor?: "emerald" | "sky" | "amber" | "slate";
}

interface MetricStripProps {
  metrics: MetricItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export const MetricStrip: React.FC<MetricStripProps> = ({
  metrics,
  columns = 4,
  className,
}) => {
  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div
      className={cn(
        "grid gap-3 p-3.5 rounded-2xl bg-[#0C121D] border border-white/[0.07]",
        colClass,
        className
      )}
    >
      {metrics.map((metric, idx) => {
        const Icon = metric.icon;
        const colorClasses = {
          emerald: "text-emerald-400",
          sky: "text-sky-400",
          amber: "text-amber-400",
          slate: "text-slate-200",
        }[metric.accentColor || "slate"];

        return (
          <div
            key={idx}
            className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1"
          >
            <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
              <span className="truncate">{metric.label}</span>
              {Icon && <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
            </div>
            <div className={cn("text-xl font-bold font-mono tracking-tight", colorClasses)}>
              {metric.value}
            </div>
            {metric.subtext && (
              <div className="text-[11px] text-slate-400 truncate">
                {metric.subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MetricStrip;
