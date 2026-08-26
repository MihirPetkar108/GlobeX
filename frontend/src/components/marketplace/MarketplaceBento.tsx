import React from "react";
import TopBuyersRankedList from "@/components/marketplace/TopBuyersRankedList";
import { MARKET_OPPORTUNITY_COUNTRIES } from "@/data/mockTradeData";
import { Globe2, TrendingUp, ShieldCheck, ArrowUpRight, Zap, FileText } from "lucide-react";
import { Link } from "react-router-dom";

export const MarketplaceBento: React.FC = () => {
  return (
    <div className="w-full space-y-4 font-sans select-none">
      {/* ── Main Bento Container (Restrained, CSS-only, no particles or canvas loops) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Bento Tile: Top 10 Buyers Ranked Demand List (7 cols) */}
        <div className="lg:col-span-8 p-4 sm:p-5 rounded-2xl bg-[#0C121D] border border-white/[0.07] shadow-lg flex flex-col justify-between">
          <TopBuyersRankedList />
        </div>

        {/* Right Bento Tile: High-Demand Bilateral Corridors & CEPA Tariff Incentives (4 cols) */}
        <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl bg-[#0C121D] border border-white/[0.07] shadow-lg flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Tile Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-white">
                  Active Trade Corridors
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                0% CEPA Duty Active
              </span>
            </div>

            {/* Corridor List */}
            <div className="space-y-2">
              {MARKET_OPPORTUNITY_COUNTRIES.slice(0, 3).map((item) => (
                <div
                  key={item.country}
                  className="p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.05] space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">
                      India ➔ {item.country}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold text-[11px]">
                      {item.tariffRate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Demand: <strong className="text-slate-300 font-mono">{item.demandGrowth}</strong></span>
                    <span>Score: <strong className="text-sky-400 font-mono">{item.opportunityScore}/100</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick RAG Analysis CTA */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Simulate customs duties & RAG rules</span>
            <Link
              to="/trade-analysis"
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono text-xs font-semibold transition-colors"
            >
              <span>Tariff Simulator</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceBento;
