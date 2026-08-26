import { X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatValue } from "@/lib/tradeData";

interface TradeItem {
  id: string;
  country: string;
  product: string;
  value: number;
  buyers: number;
  type: "import" | "export";
  date: string;
  profit: number;
}

interface RecentTradesSectionProps {
  type: "import" | "export";
  isOpen: boolean;
  onClose: () => void;
  trades: TradeItem[];
}

const RecentTradesSection = ({ type, isOpen, onClose, trades }: RecentTradesSectionProps) => {
  if (!isOpen) return null;

  const isImport = type === "import";
  const bgGradient = isImport
    ? "from-emerald-950/40 to-slate-950/60"
    : "from-amber-950/40 to-slate-950/60";
  const borderColor = isImport ? "border-emerald-500/30" : "border-amber-500/30";
  const textColor = isImport ? "text-emerald-100" : "text-amber-100";
  const accentColor = isImport ? "text-emerald-400" : "text-amber-400";
  const Icon = isImport ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto max-h-[60vh] overflow-y-auto">
        <div className={`bg-gradient-to-t ${bgGradient} border-t ${borderColor} rounded-t-2xl`}>
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-b from-slate-900/95 to-slate-900/80 backdrop-blur-md border-b border-slate-700/50 px-8 py-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Recent</p>
              <h3 className={`text-2xl font-bold ${textColor}`}>
                {isImport ? "Recent Imports" : "Recent Exports"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg hover:bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Trades List */}
          <div className="px-8 py-6 space-y-4">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className={`group p-5 rounded-xl border ${borderColor} bg-slate-900/30 hover:bg-slate-900/60 transition-all duration-300 cursor-pointer`}
              >
                {/* Trade Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg ${isImport ? "bg-emerald-500/20" : "bg-amber-500/20"} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${isImport ? "text-emerald-400" : "text-amber-400"}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-100">{trade.country}</p>
                      <p className="text-xs text-slate-400 font-mono">{trade.product}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-bold text-lg ${textColor}`}>
                      {formatValue(trade.value)}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">{trade.date}</p>
                  </div>
                </div>

                {/* Trade Details */}
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-700/30">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Buyers</p>
                    <p className="text-sm font-mono font-semibold text-slate-200">{trade.buyers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Profit</p>
                    <p className="text-sm font-mono font-semibold text-emerald-400">
                      {formatValue(trade.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Margin</p>
                    <p className={`text-sm font-mono font-semibold ${accentColor}`}>
                      {((trade.profit / trade.value) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-700/50 text-center text-sm text-slate-400">
            Showing latest 3 trades • Scroll for more →
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentTradesSection;
