import React from "react";
import { cn } from "@/lib/utils";

interface MetricDialProps {
  label: string;
  /** 0-100. Pass null/undefined for a not-yet-scored dimension — renders as unavailable, never a fake 0. */
  value: number | null | undefined;
  tone?: "verified" | "review" | "blocked" | "neutral";
  className?: string;
}

const TONE_VAR: Record<NonNullable<MetricDialProps["tone"]>, string> = {
  verified: "var(--status-verified)",
  review: "var(--status-review)",
  blocked: "var(--status-blocked)",
  neutral: "var(--brand)",
};

const SIZE = 72;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** One of six independent result dimensions — never collapsed into a single composite score. */
export const MetricDial: React.FC<MetricDialProps> = ({ label, value, tone = "neutral", className }) => {
  const hasValue = typeof value === "number";
  const color = hasValue ? TONE_VAR[tone] : "var(--status-unavailable)";
  const offset = hasValue ? CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, value!)) / 100) : 0;

  return (
    <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={STROKE}
        />
        {hasValue && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        )}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="text-sm font-mono font-semibold"
          fill={hasValue ? "var(--text-primary)" : "var(--text-muted)"}
        >
          {hasValue ? Math.round(value!) : "—"}
        </text>
      </svg>
      <span className="text-[11px] font-medium text-[var(--text-secondary)] max-w-[90px] leading-tight">
        {label}
      </span>
    </div>
  );
};

export default MetricDial;
