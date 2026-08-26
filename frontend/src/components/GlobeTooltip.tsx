import { AggregatedCountry, formatValue } from "@/lib/tradeData";
import { valueColorScale } from "@/lib/colors";

interface GlobeTooltipProps {
  data: AggregatedCountry | null;
  position: { x: number; y: number };
}

const GlobeTooltip = ({ data, position }: GlobeTooltipProps) => {
  if (!data) return null;

  // Demo: Calculate imports (~65% of exports) and profit
  const imports = Math.floor(data.exportValue * 0.65);
  const profit = data.exportValue - imports;
  const profitMargin = ((profit / data.exportValue) * 100).toFixed(1);

  return (
    <div
      className="fixed z-50 pointer-events-none backdrop-blur-sm bg-white border border-gray-300 rounded-lg px-4 py-3 min-w-[280px] animate-fade-in-up shadow-lg"
      style={{
        left: position.x + 15,
        top: position.y - 10,
      }}
    >
      {/* Country Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: valueColorScale(data.normalizedValue) }}
        />
        <span className="font-semibold text-sm text-gray-900">{data.country}</span>
        <span className="ml-auto text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Rank #{data.rank}
        </span>
      </div>

      {/* Trade Data */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-700">
            Imports
          </span>
          <span className="font-mono text-sm font-bold text-emerald-700">
            {formatValue(imports)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono uppercase tracking-widest text-blue-700">
            Exports
          </span>
          <span className="font-mono text-sm font-bold text-blue-700">
            {formatValue(data.exportValue)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono uppercase tracking-widest text-gray-600">
            Profit
          </span>
          <span className="font-mono text-sm font-bold text-gray-900">
            {formatValue(profit)} ({profitMargin}%)
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono uppercase tracking-widest text-gray-600">
            Buyers
          </span>
          <span className="font-mono text-sm font-semibold text-gray-800">
            {data.buyerCount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GlobeTooltip;
