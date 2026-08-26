import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TradeStep {
  id: string;
  name: string;
  shortName?: string;
  description?: string;
}

export const DEFAULT_TRADE_STEPS: TradeStep[] = [
  { id: "identify", name: "1 Identify", shortName: "Identify", description: "Match counterparties & price" },
  { id: "verify", name: "2 Verify", shortName: "Verify", description: "APEDA, KYC & origin inspection" },
  { id: "contract", name: "3 Contract", shortName: "Contract", description: "CEPA & terms signed" },
  { id: "escrow", name: "4 Escrow", shortName: "Escrow", description: "USDC deposit locked in vault" },
  { id: "ship", name: "5 Ship", shortName: "Ship", description: "Vessel dispatched & in transit" },
  { id: "deliver", name: "6 Deliver", shortName: "Deliver", description: "Port customs & release" },
];

interface TradeProgressProps {
  currentStepIndex: number; // 0-indexed (e.g. 4 for Ship)
  steps?: TradeStep[];
  className?: string;
  onStepClick?: (stepIndex: number) => void;
}

export const TradeProgress: React.FC<TradeProgressProps> = ({
  currentStepIndex = 4,
  steps = DEFAULT_TRADE_STEPS,
  className,
  onStepClick,
}) => {
  return (
    <div
      className={cn(
        "p-3.5 sm:p-4 rounded-2xl bg-[#0B1019] border border-white/[0.08] shadow-sm select-none",
        className
      )}
    >
      <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1 sm:pb-0 scrollbar-none">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isUpcoming = idx > currentStepIndex;

          return (
            <React.Fragment key={step.id}>
              <div
                onClick={() => onStepClick && onStepClick(idx)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0",
                  onStepClick && "cursor-pointer hover:bg-white/[0.04]",
                  isCurrent &&
                    "bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold shadow-[0_0_15px_rgba(52,199,149,0.15)]",
                  isCompleted &&
                    "text-slate-400 bg-white/[0.02] border border-white/[0.04]",
                  isUpcoming &&
                    "text-slate-600 bg-transparent opacity-60"
                )}
              >
                {/* Indicator icon / number */}
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold",
                    isCurrent && "bg-emerald-400 text-black animate-pulse",
                    isCompleted && "bg-emerald-950 text-emerald-400 border border-emerald-800/60",
                    isUpcoming && "border border-slate-700 text-slate-600"
                  )}
                >
                  {isCompleted ? "✓" : isCurrent ? "●" : idx + 1}
                </span>

                <div className="flex flex-col">
                  <span
                    className={cn(
                      "leading-tight",
                      isCurrent && "text-emerald-300 font-bold",
                      isCompleted && "text-slate-300",
                      isUpcoming && "text-slate-500"
                    )}
                  >
                    {step.shortName || step.name}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono tracking-wider text-emerald-400 font-extrabold uppercase">
                      YOU ARE HERE
                    </span>
                  )}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <span
                  className={cn(
                    "text-xs px-1 shrink-0",
                    idx < currentStepIndex ? "text-emerald-500/40" : "text-slate-700"
                  )}
                >
                  ➔
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default TradeProgress;
