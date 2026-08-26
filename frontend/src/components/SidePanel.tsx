import { Upload, Filter, TrendingUp, Globe2, BarChart3 } from "lucide-react";
import { AggregatedCountry, formatValue, getTotalExportValue } from "@/lib/tradeData";
import { valueColorScale } from "@/lib/colors";

interface SidePanelProps {
  products: string[];
  selectedProduct: string | null;
  onProductChange: (product: string | null) => void;
  aggregatedData: AggregatedCountry[];
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  datasetName: string;
}

const SidePanel = ({
  products,
  selectedProduct,
  onProductChange,
  aggregatedData,
  onFileUpload,
  isLoading,
  datasetName,
}: SidePanelProps) => {
  const top5 = aggregatedData.slice(0, 5);
  const totalValue = getTotalExportValue(aggregatedData);

  return (
    <div className="w-80 h-full flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Logo & Title */}
      <div className="flex items-center gap-3 mb-2">
        <Globe2 className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-xl font-bold glow-text tracking-tight">GlobeXMatch</h1>
          <p className="text-xs text-muted-foreground font-mono">TRADE INTELLIGENCE</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="glass-panel p-3">
        <label className="data-label flex items-center gap-2 mb-2">
          <Upload className="w-3 h-3" /> Dataset
        </label>
        <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer hover:border-primary transition-colors text-sm text-muted-foreground hover:text-foreground">
          <Upload className="w-4 h-4" />
          <span>{isLoading ? "Parsing..." : "Upload CSV"}</span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileUpload(file);
            }}
          />
        </label>
        <p className="text-xs text-muted-foreground mt-1 font-mono">{datasetName}</p>
      </div>

      {/* Product Filter */}
      <div className="glass-panel p-3">
        <label className="data-label flex items-center gap-2 mb-2">
          <Filter className="w-3 h-3" /> Product Filter
        </label>
        <select
          value={selectedProduct || ""}
          onChange={(e) => onProductChange(e.target.value || null)}
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Total Export Value */}
      <div className="glass-panel p-3">
        <div className="data-label flex items-center gap-2 mb-1">
          <BarChart3 className="w-3 h-3" /> Total Export Value
        </div>
        <div className="text-2xl font-mono font-bold glow-text">
          {formatValue(totalValue)}
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {aggregatedData.length} countries
        </div>
      </div>

      {/* Top 5 Exporters */}
      <div className="glass-panel p-3 flex-1">
        <div className="data-label flex items-center gap-2 mb-3">
          <TrendingUp className="w-3 h-3" /> Top Exporters
        </div>
        <div className="space-y-2">
          {top5.map((item, i) => (
            <div
              key={item.country}
              className={`flex items-center gap-3 p-2 rounded-md transition-all ${
                i < 3 ? "pulse-glow" : ""
              }`}
              style={{
                backgroundColor: `${valueColorScale(item.normalizedValue)}10`,
                borderLeft: `3px solid ${valueColorScale(item.normalizedValue)}`,
              }}
            >
              <span className="text-xs font-mono font-bold text-muted-foreground w-5">
                #{item.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.country}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {item.buyerCount} buyers
                </div>
              </div>
              <div className="text-sm font-mono font-semibold" style={{ color: valueColorScale(item.normalizedValue) }}>
                {formatValue(item.exportValue)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="glass-panel p-3">
        <div className="data-label mb-2">Heat Scale</div>
        <div
          className="h-2 rounded-full"
          style={{
            background: "linear-gradient(to right, #4fc3f7, #fbbf24, #ef4444)",
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground font-mono">Low</span>
          <span className="text-xs text-muted-foreground font-mono">High</span>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
