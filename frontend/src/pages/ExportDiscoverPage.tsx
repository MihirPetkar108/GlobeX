import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import CountryOpportunityCard from "@/components/marketplace/CountryOpportunityCard";
import CountryDetailDrawer from "@/components/marketplace/CountryDetailDrawer";
import { LiveProductSearch } from "@/components/marketplace/LiveProductSearch";
import {
  aiService,
  MarketOpportunityResult,
  DestinationCountryInsight,
  TopCompaniesResult,
  ProfitEstimateResult,
  HSCodeSearchMatch,
  TradeAnomalyResult,
  CounterpartyMatchResult,
  PartnerGRUSignal,
} from "@/services/api/aiService";
import { Search, TrendingUp, Globe2 } from "lucide-react";

const COUNTRIES_PER_PAGE = 6;
const TOTAL_COUNTRIES_FETCHED = 20;

/**
 * "Discover Opportunity" — find the best importer countries for a product.
 * Ranking pipeline (rankMarketOpportunity, top 20 fetched / 6 shown with
 * Load More) is ported from the orphaned MarketplacePage.tsx's exporter
 * destination-radar block; the filter/search UI here is new, per spec.
 */
export const ExportDiscoverPage: React.FC = () => {
  const [product, setProduct] = useState("Basmati Rice");
  const [quantityKg, setQuantityKg] = useState<number>(1000);
  const [strategy, setStrategy] = useState<string>("balanced");

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MarketOpportunityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [visibleCount, setVisibleCount] = useState(COUNTRIES_PER_PAGE);

  const [selectedCountryInsight, setSelectedCountryInsight] = useState<DestinationCountryInsight | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [companies, setCompanies] = useState<TopCompaniesResult | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [profit, setProfit] = useState<ProfitEstimateResult | null>(null);
  const [profitLoading, setProfitLoading] = useState(false);
  const [profitError, setProfitError] = useState<string | null>(null);
  const [tradeRisk, setTradeRisk] = useState<TradeAnomalyResult | null>(null);
  const [tradeRiskLoading, setTradeRiskLoading] = useState(false);
  const [tradeRiskError, setTradeRiskError] = useState<string | null>(null);
  const [partnerMatches, setPartnerMatches] = useState<CounterpartyMatchResult[]>([]);
  const [partnerMatchesLoading, setPartnerMatchesLoading] = useState(false);
  const [partnerMatchesError, setPartnerMatchesError] = useState<string | null>(null);
  const [partnerGRUSignal, setPartnerGRUSignal] = useState<PartnerGRUSignal | null>(null);

  const runSearch = async (productToQuery?: string, qtyToQuery?: number, strategyToQuery?: string) => {
    const qProduct = productToQuery ?? product;
    const qQty = qtyToQuery ?? quantityKg;
    const qStrategy = strategyToQuery ?? strategy;

    setIsLoading(true);
    setError(null);
    setVisibleCount(COUNTRIES_PER_PAGE);
    try {
      const data = await aiService.rankMarketOpportunity(qProduct, qQty, qStrategy, TOTAL_COUNTRIES_FETCHED);
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

  // Lazy, per-country fetch — only runs when a country is actually clicked,
  // not prefetched for every ranked country up front.
  const handleSelectCountry = (data: DestinationCountryInsight) => {
    setSelectedCountryInsight(data);
    setIsDrawerOpen(true);

    setCompanies(null);
    setCompaniesError(null);
    setCompaniesLoading(true);
    aiService
      .getCompaniesBySimilarity(data.destination.iso3, product, product, 10)
      .then(setCompanies)
      .catch((err) => setCompaniesError(err instanceof Error ? err.message : "Company lookup failed."))
      .finally(() => setCompaniesLoading(false));

    setProfit(null);
    setProfitError(null);
    setProfitLoading(true);
    aiService
      .getProfitEstimate(data.forecast.expected_fob_price_usd_per_kg, quantityKg, data.destination.iso3)
      .then(setProfit)
      .catch((err) => setProfitError(err instanceof Error ? err.message : "Profit estimate failed."))
      .finally(() => setProfitLoading(false));

    const hs6 = data.product?.hs6 ?? result?.product_resolution?.hs6 ?? 100630;
    setTradeRisk(null);
    setTradeRiskError(null);
    setTradeRiskLoading(true);
    aiService
      .predictTradeAnomaly(
        "Export",
        hs6,
        data.destination.iso3,
        Math.max(0, data.forecast.estimated_shipment_revenue_usd),
        Math.max(1, data.forecast.user_shipment_quantity_kg || quantityKg),
        "kg"
      )
      .then(setTradeRisk)
      .catch((err) => setTradeRiskError(err instanceof Error ? err.message : "Trade risk model unavailable."))
      .finally(() => setTradeRiskLoading(false));

    setPartnerMatches([]);
    setPartnerGRUSignal(null);
    setPartnerMatchesError(null);
    setPartnerMatchesLoading(true);
    aiService
      .semanticMatchWithEvidence(product, undefined, quantityKg, data.destination.iso3, hs6)
      .then((evidence) => {
        setPartnerMatches(evidence.matches);
        setPartnerGRUSignal(evidence.gruAutoencoder);
      })
      .catch((err) => setPartnerMatchesError(err instanceof Error ? err.message : "Partner matching failed."))
      .finally(() => setPartnerMatchesLoading(false));
  };

  const allCountries = result?.top_recommendations || [];
  const visibleCountries = allCountries.slice(0, visibleCount);
  const hasMoreToLoad = visibleCount < allCountries.length;

  return (
    <AppShell maxWidth="full" className="space-y-6">
      {/* Top Tag + Title + Strategy Header */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-sky-600 tracking-wide uppercase">
              <Globe2 className="w-3.5 h-3.5" />
              <span>AI Country Destination Finder (XGBoost + TreeSHAP)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)] tracking-tight">
              Discover Opportunity
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans max-w-4xl leading-relaxed">
              Enter what you want to export and how much. Our ranking engine scans major global trade corridors, calculates bilateral demand momentum from historical trade data, checks tariff schedules, and ranks the highest-probability countries.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <label className="text-xs font-mono text-[var(--text-tertiary)] uppercase tracking-wider">STRATEGY:</label>
            <select
              value={strategy}
              onChange={(e) => {
                const newStrat = e.target.value;
                setStrategy(newStrat);
                runSearch(product, quantityKg, newStrat);
              }}
              className="h-9 px-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline-strong)] text-xs font-sans font-medium text-[var(--text-primary)] outline-none focus:border-emerald-500/50 cursor-pointer shadow-sm"
            >
              <option value="balanced">Balanced (Recommended)</option>
              <option value="high_demand">High Demand Volume</option>
              <option value="low_tariff">Low Tariff Barrier</option>
              <option value="growth_momentum">Growth Momentum</option>
              <option value="stable_pricing">Stable FOB Pricing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filters + search button */}
      <div className="p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] flex flex-col md:flex-row items-stretch md:items-end gap-3 shadow-sm">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-mono font-medium text-[var(--text-secondary)]">Export Commodity / HS6 Product</label>
          <LiveProductSearch
            value={product}
            onChange={(name) => setProduct(name)}
            onSelect={(match: HSCodeSearchMatch) => {
              setProduct(match.productDescription);
            }}
          />
        </div>

        <div className="w-full md:w-[160px] space-y-1.5">
          <label className="text-xs font-mono font-medium text-[var(--text-secondary)]">Quantity (kg)</label>
          <input
            type="number"
            min={1}
            value={quantityKg}
            onChange={(e) => setQuantityKg(Math.max(1, Number(e.target.value)))}
            placeholder="1000"
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
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Search className="w-4 h-4 stroke-[2.5]" />
          )}
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Ranked Destination Countries for {quantityKg.toLocaleString()} kg {product.toUpperCase()}
            </h3>
          </div>
          <span className="text-xs text-[var(--text-tertiary)] font-sans">
            Click any country to view full forecast &amp; pros/cons
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 rounded-2xl bg-[var(--surface-2)] animate-pulse border border-[var(--hairline)]" />
            ))}
          </div>
        ) : visibleCountries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCountries.map((rec, index) => (
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

        {/* Load More — reveals more of the already-fetched pool of up to 20 countries, no new network call */}
        {hasMoreToLoad && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((n) => Math.min(n + COUNTRIES_PER_PAGE, allCountries.length))}
              className="px-6 py-2.5 rounded-xl border border-[var(--hairline-strong)] text-xs font-mono font-bold text-[var(--text-secondary)] hover:text-sky-600 hover:border-sky-500/40 cursor-pointer transition-colors"
            >
              Load More ({allCountries.length - visibleCount} more available)
            </button>
          </div>
        )}
      </div>

      <CountryDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        data={selectedCountryInsight}
        userCommodity={product}
        userQuantityKg={quantityKg}
        companies={companies}
        companiesLoading={companiesLoading}
        companiesError={companiesError}
        profit={profit}
        profitLoading={profitLoading}
        profitError={profitError}
        tradeRisk={tradeRisk}
        tradeRiskLoading={tradeRiskLoading}
        tradeRiskError={tradeRiskError}
        partnerMatches={partnerMatches}
        partnerMatchesLoading={partnerMatchesLoading}
        partnerMatchesError={partnerMatchesError}
        partnerGRUSignal={partnerGRUSignal}
      />
    </AppShell>
  );
};

export default ExportDiscoverPage;
