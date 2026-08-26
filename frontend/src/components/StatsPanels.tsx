import { TrendingUp, TrendingDown } from "lucide-react";
import { AggregatedCountry, formatValue } from "@/lib/tradeData";

interface StatsPanelsProps {
  aggregatedData: AggregatedCountry[];
  onImportClick: () => void;
  onExportClick: () => void;
}

const StatsPanels = ({ aggregatedData, onImportClick, onExportClick }: StatsPanelsProps) => {
  // Calculate aggregate stats
  const totalExports = aggregatedData.reduce((sum, c) => sum + c.exportValue, 0);
  const totalImports = Math.floor(totalExports * 0.65); // Demo: imports are ~65% of exports
  const totalProfit = totalExports - totalImports;
  const avgProfitMargin = ((totalProfit / totalExports) * 100).toFixed(1);

  const topExportCountry = aggregatedData[0];
  const topImportCountry = aggregatedData[Math.floor(aggregatedData.length * 0.3)];

  return (
    <>
      {/* Left Stats - Imports */}
      <div
        onClick={onImportClick}
        className="absolute left-6 top-1/3 transform -translate-y-1/2 z-20 w-64 cursor-pointer group"
      >
        <div className="glass-panel p-6 transition-all duration-300 hover:border-emerald-500/60 hover:shadow-2xl hover:shadow-emerald-500/20">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-400/70">Imports</p>
              <p className="text-xs text-slate-400">Total inbound</p>
            </div>
          </div>

          {/* Main Value */}
          <div className="mb-4">
            <div className="text-3xl font-bold text-emerald-100 mb-1 font-mono">
              {formatValue(totalImports)}
            </div>
            <p className="text-xs text-slate-400">From {aggregatedData.length} countries</p>
          </div>

          {/* Stats Row */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Top Partner</span>
              <span className="text-slate-300 font-mono">{topImportCountry?.country}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Buyer Count</span>
              <span className="text-slate-300 font-mono">
                {aggregatedData.reduce((sum, c) => sum + c.buyerCount, 0)}
              </span>
            </div>
          </div>

          {/* Hover indicator */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-2 text-xs text-slate-400 group-hover:text-emerald-400 transition-colors">
            <div className="w-1 h-1 rounded-full bg-current"></div>
            <span>Click to view details</span>
          </div>
        </div>
      </div>

      {/* Right Stats - Exports */}
      <div
        onClick={onExportClick}
        className="absolute right-6 top-1/3 transform -translate-y-1/2 z-20 w-64 cursor-pointer group"
      >
        <div className="glass-panel p-6 transition-all duration-300 hover:border-amber-500/60 hover:shadow-2xl hover:shadow-amber-500/20">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-amber-400/70">Exports</p>
              <p className="text-xs text-slate-400">Total outbound</p>
            </div>
          </div>

          {/* Main Value */}
          <div className="mb-4">
            <div className="text-3xl font-bold text-amber-100 mb-1 font-mono">
              {formatValue(totalExports)}
            </div>
            <p className="text-xs text-slate-400">From {aggregatedData.length} countries</p>
          </div>

          {/* Stats Row */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Top Exporter</span>
              <span className="text-slate-300 font-mono">{topExportCountry?.country}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Profit Margin</span>
              <span className="text-slate-300 font-mono text-emerald-400">{avgProfitMargin}%</span>
            </div>
          </div>

          {/* Hover indicator */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-2 text-xs text-slate-400 group-hover:text-amber-400 transition-colors">
            <div className="w-1 h-1 rounded-full bg-current"></div>
            <span>Click to view details</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default StatsPanels;
