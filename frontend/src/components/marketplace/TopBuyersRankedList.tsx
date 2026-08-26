import React, { useState } from "react";
import { TOP_BUYERS_DATA, TopBuyer } from "@/data/mockTradeData";
import { Building2, MapPin, FileCheck2, ShieldCheck, TrendingUp, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBuyersRankedListProps {
  onSelectBuyer?: (buyer: TopBuyer) => void;
  className?: string;
}

export const TopBuyersRankedList: React.FC<TopBuyersRankedListProps> = ({
  onSelectBuyer,
  className = "",
}) => {
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);

  const handleBuyerClick = (buyer: TopBuyer) => {
    setSelectedBuyerId(buyer.id);
    if (onSelectBuyer) {
      onSelectBuyer(buyer);
    }
  };

  return (
    <div className={cn("space-y-3 font-sans select-none", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-white">
            Top 10 Global Importers & Verified Demand
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Ranked by Active Inbound RFQs
        </span>
      </div>

      {/* Scannable Ranked List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {TOP_BUYERS_DATA.map((buyer) => {
          const isSelected = selectedBuyerId === buyer.id;

          return (
            <div
              key={buyer.id}
              onClick={() => handleBuyerClick(buyer)}
              className={cn(
                "p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer group",
                isSelected
                  ? "bg-white/[0.08] border-emerald-500/50 shadow-md"
                  : "bg-[#0A0F18]/80 border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.12]"
              )}
            >
              {/* Left: Rank & Buyer Profile */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-mono font-bold text-emerald-400/90 w-5 text-center shrink-0">
                  {buyer.rank}
                </span>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
                      {buyer.name}
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 shrink-0">
                      {buyer.verificationBadge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{buyer.country} · {buyer.city}</span>
                    </span>
                    <span>·</span>
                    <span className="text-slate-400 truncate">{buyer.primaryCategory}</span>
                  </div>
                </div>
              </div>

              {/* Right: RFQ Count & Demand Signal */}
              <div className="text-right shrink-0 space-y-0.5">
                <div className="text-xs font-mono font-bold text-white">
                  ${(buyer.demandValueUSD / 1000000).toFixed(1)}M
                </div>
                <div className="text-[10px] font-mono text-emerald-400">
                  {buyer.activeRFQs} active RFQs
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopBuyersRankedList;
