import React from "react";
import { TopBuyer } from "@/data/mockTradeData";
import { BuyerMatchResponse } from "@/services/api/aiService";
import {
  MapPin,
  CheckCircle2,
  Info,
  Eye,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AnimatedList from "@/components/reactbits/AnimatedList";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BuyerMatchingResultsProps {
  matchResponse: BuyerMatchResponse | null;
  onInspectBuyer: (buyer: TopBuyer) => void;
  onCreateTradeRequest: (buyer: TopBuyer) => void;
  className?: string;
}

export const BuyerMatchingResults: React.FC<BuyerMatchingResultsProps> = ({
  matchResponse,
  onInspectBuyer,
  onCreateTradeRequest,
  className = "",
}) => {
  if (!matchResponse) return null;

  const { query, candidateCount, strongMatchCount, recommendations } = matchResponse;

  return (
    <div className={cn("w-full space-y-4 font-sans select-none", className)}>
      {/* ── 1. Candidate Pool Summary Metric Strip (Level A Funnel) ───── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-mono shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--brand-teal)] animate-pulse" />
          <span className="text-[var(--text-primary)] font-bold tracking-wide">
            ML MATCHING FUNNEL
          </span>
        </div>

        <div className="flex items-center gap-4 text-[var(--text-secondary)]">
          <div>
            <strong className="text-[var(--text-primary)] font-mono">{candidateCount.toLocaleString()}</strong>{" "}
            <span>eligible</span>
          </div>
          <span>•</span>
          <div>
            <strong className="text-[var(--brand-teal)] font-mono">{strongMatchCount}</strong>{" "}
            <span>strong matches</span>
          </div>
          <span>•</span>
          <div>
            <strong className="text-[var(--brand-cyan)] font-mono">{recommendations.length}</strong>{" "}
            <span>recommended</span>
          </div>
        </div>
      </div>

      {/* ── 2. Contextual Recommendations Ranked Surface ──────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-lg space-y-4">
        {/* Contextual Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div className="space-y-0.5">
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">
              Recommended Buyers for{" "}
              <span className="text-[var(--brand-teal)] font-semibold">
                {query.quantity ? `${query.quantity.toLocaleString()} ${query.unit}` : ""}{" "}
                {query.commodity}
              </span>{" "}
              ➔{" "}
              <span className="text-[var(--brand-cyan)] font-semibold">
                {query.destinationCountry || "Global Corridor"}
              </span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Ranked by verified demand, corridor compatibility, and procurement capacity.
            </p>
          </div>

          <span className="text-[11px] font-mono text-[var(--text-tertiary)] shrink-0">
            Top {recommendations.length} Ranked
          </span>
        </div>

        {/* Minimal Ranked Recommendations List (Level A Visible / Level B Popover) */}
        {recommendations.length > 0 ? (
          <AnimatedList
            items={recommendations}
            maxHeight="520px"
            displayScrollbar={true}
            showGradients={true}
            enableArrowNavigation={true}
            onItemSelect={(buyer) => onInspectBuyer(buyer)}
            renderItem={(buyer: TopBuyer, index: number, state: { selected: boolean }) => {
              const matchPercent = buyer.matchScore || 90;

              return (
                <div
                  className={cn(
                    "p-3 sm:p-3.5 rounded-xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group",
                    state.selected
                      ? "bg-[var(--bg-surface-subtle)] border-[var(--brand-teal)] shadow-md ring-1 ring-[var(--brand-teal)]/20"
                      : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] hover:border-[var(--brand-teal)]/40 hover:bg-[var(--bg-surface)]"
                  )}
                >
                  {/* Left: Rank, Name, Location */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={cn(
                        "w-6 h-6 rounded-lg border flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors",
                        state.selected
                          ? "bg-[var(--success-bg)] border-[var(--brand-teal)]/40 text-[var(--brand-teal-dark)]"
                          : "bg-[var(--success-bg)] border-[var(--brand-teal)]/30 text-[var(--brand-teal-dark)]"
                      )}
                    >
                      {buyer.rank}
                    </span>

                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-semibold text-xs text-[var(--text-primary)] group-hover:text-[var(--brand-teal-dark)] transition-colors truncate">
                        {buyer.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                        <MapPin className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                        <span>{buyer.country} · {buyer.city}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle & Right: Match Score (with Why This Match? Popover) + 2 Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {/* Level B: Match Score with Popover for detailed signals */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--success-bg)] border border-[var(--brand-teal)]/30 text-[var(--brand-teal-dark)] hover:opacity-90 text-xs font-mono font-bold transition-colors cursor-pointer"
                          aria-label="Why this match?"
                        >
                          <span>{matchPercent}% Match</span>
                          <Info className="w-3 h-3 text-[var(--brand-teal-dark)]" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="end"
                        className="w-64 p-3 bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs space-y-2 text-[var(--text-secondary)] shadow-xl rounded-xl"
                      >
                        <div className="font-display font-semibold text-[var(--text-primary)] text-xs border-b border-[var(--border-subtle)] pb-1.5 flex items-center justify-between">
                          <span>Why this match?</span>
                          <span className="font-mono text-[var(--brand-teal)] font-bold">{matchPercent}% Score</span>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          {buyer.matchSignals?.map((sig, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[var(--text-secondary)]">
                              <CheckCircle2 className="w-3 h-3 text-[var(--brand-teal)] shrink-0 mt-0.5" />
                              <span className="leading-tight">{sig}</span>
                            </div>
                          )) || (
                            <div className="text-[var(--text-tertiary)]">High compatibility across corridor and capacity.</div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Level A Actions (At most 2) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectBuyer(buyer);
                        }}
                        className="h-7 px-2.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-muted)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <Eye className="w-3 h-3 text-[var(--text-tertiary)]" />
                        <span>Inspect</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateTradeRequest(buyer);
                        }}
                        className="h-7 px-3 rounded-lg bg-[var(--brand-teal-dark)] hover:bg-[var(--brand-teal)] text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer active:scale-[0.98] shadow-sm"
                      >
                        <PlusCircle className="w-3 h-3 text-white" />
                        <span>Create Request</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        ) : (
          <div className="p-8 text-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] space-y-2">
            <p className="text-xs text-[var(--text-primary)] font-semibold">No strong matches found.</p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Try adjusting the commodity name, target volume, destination market, or optional specifications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerMatchingResults;
