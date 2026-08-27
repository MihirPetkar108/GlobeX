import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import CountryOpportunityCard from "@/components/marketplace/CountryOpportunityCard";
import CountryDetailDrawer from "@/components/marketplace/CountryDetailDrawer";
import { CommoditySearchDropdown, CommodityOption } from "@/components/marketplace/CommoditySearchDropdown";
import { aiService, MarketOpportunityResult, DestinationCountryInsight } from "@/services/api/aiService";
import { Search, TrendingUp } from "lucide-react";

/**
 * Export flow's "Discover" tab — find the best importer countries for a
 * product. Ranking pipeline (rankMarketOpportunity, capped to the top 6) is
 * ported from the orphaned MarketplacePage.tsx's exporter destination-radar
 * block; the filter/search UI here is new, per spec.
 */
export const ExportDiscoverPage: React.FC = () => {
  const [product, setProduct] = useState("Basmati Rice");
  const [quantityKg, setQuantityKg] = useState<number>(1000);
  // The ranking API takes product + quantity only, no price. Collected here
  // as a filter per spec, but not sent to the ranking call — out of scope
  // to change the ranking model's inputs.
  const [targetPrice, setTargetPrice] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MarketOpportunityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedCountryInsight, setSelectedCountryInsight] = useState<DestinationCountryInsight | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const runSearch = async (productToQuery?: string, qtyToQuery?: number) => {
    const qProduct = productToQuery ?? product;
    const qQty = qtyToQuery ?? quantityKg;

    setIsLoading(true);
    setError(null);
    try {
      const data = await aiService.rankMarketOpportunity(qProduct, qQty, "balanced", 6);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Country ranking failed — backend unreachable.");
      setResult(null);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  };

  // Run once on mount so the tab isn't empty on first visit.
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectCountry = (data: DestinationCountryInsight) => {
    setSelectedCountryInsight(data);
    setIsDrawerOpen(true);
  };

  const topSix = (result?.top_recommendations || []).slice(0, 6);

  return (
    <AppShell maxWidth="full" className="space-y-6">
      <PageHeader
        title="Discover"
        subtitle="Find the best importer countries for a product — ranked by demand, tariff schedules, and trade risk."
      />

      {/* Filters + circular dark-green search button */}
      <div className="p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] flex flex-col md:flex-row items-stretch md:items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Product</label>
          <CommoditySearchDropdown
            value={product}
            onChange={(name) => setProduct(name)}
            onSelect={(opt: CommodityOption) => {
              setProduct(opt.name);
              setQuantityKg(opt.typicalQty);
            }}
          />
        </div>

        <div className="w-full md:w-[160px] space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Quantity (kg)</label>
          <input
            type="number"
            min={1}
            value={quantityKg}
            onChange={(e) => setQuantityKg(Math.max(1, Number(e.target.value)))}
            placeholder="1000"
            className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-sm font-mono text-[var(--text-primary)] outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="w-full md:w-[160px] space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Target Price ($)</label>
          <input
            type="number"
            min={0}
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="Optional"
            className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-sm font-mono text-[var(--text-primary)] outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Circular, dark-green search button */}
        <button
          type="button"
          onClick={() => runSearch()}
          title="Search"
          disabled={isLoading}
          className="w-11 h-11 shrink-0 rounded-full bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 disabled:opacity-60 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer self-center md:self-end"
        >
          <Search className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => runSearch()}
            className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-600 font-mono font-bold text-xs cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top 6 results */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Top 6 Importer Countries for {quantityKg.toLocaleString()} kg {product}
          </h3>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 rounded-2xl bg-[var(--surface-2)] animate-pulse border border-[var(--hairline)]" />
            ))}
          </div>
        ) : topSix.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topSix.map((rec, index) => (
              <CountryOpportunityCard
                key={rec.destination.iso3}
                rank={index + 1}
                data={rec}
                onSelect={handleSelectCountry}
                userCommodity={product}
                userQuantityKg={quantityKg}
              />
            ))}
          </div>
        ) : hasSearched && !error ? (
          <div className="p-8 text-center rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-tertiary)] text-sm">
            No matching countries found for "{product}". Try another product.
          </div>
        ) : null}

        {/* Discover More — bordered, inert per spec, no load-more behavior yet */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            disabled
            className="px-6 py-2.5 rounded-xl border border-[var(--hairline-strong)] text-xs font-mono font-bold text-[var(--text-tertiary)] cursor-not-allowed opacity-70"
            title="Coming soon"
          >
            Discover More
          </button>
        </div>
      </div>

      <CountryDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        data={selectedCountryInsight}
        userCommodity={product}
        userQuantityKg={quantityKg}
      />
    </AppShell>
  );
};

export default ExportDiscoverPage;
