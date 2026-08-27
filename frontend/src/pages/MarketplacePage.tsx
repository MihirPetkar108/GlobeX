import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Listing } from "@/types/trade";
import { 
  aiService, 
  MarketOpportunityResult, 
  DestinationCountryInsight 
} from "@/services/api/aiService";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterBar } from "@/components/common/FilterBar";
import SpecularButton from "@/components/ui/SpecularButton";
import ListingCard from "@/components/marketplace/ListingCard";
import ListingDetailDrawer from "@/components/marketplace/ListingDetailDrawer";
import CreateTradeRequestDrawer from "@/components/marketplace/CreateTradeRequestDrawer";
import CountryOpportunityCard from "@/components/marketplace/CountryOpportunityCard";
import CountryDetailDrawer from "@/components/marketplace/CountryDetailDrawer";
import { CommoditySearchDropdown, CommodityOption } from "@/components/marketplace/CommoditySearchDropdown";
import { notifyN8nWorkflow } from "@/utils/jingle";
import { n8nWorkflowService } from "@/services/n8n/workflowService";
import { 
  Globe2, 
  TrendingUp, 
  Search, 
  Sparkles, 
  Package, 
  ShieldCheck, 
  Layers, 
  SlidersHorizontal,
  ChevronRight,
  Info,
  Cpu,
  AlertTriangle,
  Zap,
  Building2,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All Commodities",
  "Agriculture",
  "Spices",
  "Textiles",
  "Pharmaceuticals",
  "Metals",
  "Chemicals",
] as const;

export const MarketplacePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { listings, listingsLoading, listingsError, refreshListings, isExporterView, isImporterView, activeDirection } = useWorkspace();

  // ── n8n Live Status Probe ──────────────────────────────────────────────
  const [n8nOnline, setN8nOnline] = useState<boolean | null>(null);
  const [n8nUrl, setN8nUrl] = useState<string>("http://localhost:5678/webhook");

  // ── Country Destination Discovery State (Exporter) ─────────────────────
  const [commodity, setCommodity] = useState<string>(
    searchParams.get("commodity") || "Basmati Rice"
  );
  const [quantityKg, setQuantityKg] = useState<number>(
    Number(searchParams.get("qty")) || 1000
  );
  const [regime, setRegime] = useState<string>("balanced");
  const [isRankLoading, setIsRankLoading] = useState<boolean>(false);
  const [marketResult, setMarketResult] = useState<MarketOpportunityResult | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [selectedCountryInsight, setSelectedCountryInsight] = useState<DestinationCountryInsight | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // ── Importer Supplier Discovery State ──────────────────────────────────
  const [matchingSuppliers, setMatchingSuppliers] = useState<any[]>([]);
  const [isSupplierLoading, setIsSupplierLoading] = useState<boolean>(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  // ── Product Listings State ─────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string>("All Commodities");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inspectListing, setInspectListing] = useState<Listing | null>(null);
  const [requestListing, setRequestListing] = useState<Listing | null>(null);
  const [isRequestDrawerOpen, setIsRequestDrawerOpen] = useState<boolean>(false);

  // Probe n8n health on mount
  useEffect(() => {
    refreshListings();
  }, [refreshListings]);

  useEffect(() => {
    n8nWorkflowService.checkHealth().then((res) => {
      setN8nOnline(res.isOnline);
      setN8nUrl(res.url);
    });
  }, []);

  // Execute Country Opportunity Ranking Pipeline for Exporters
  const handleDiscoverDestinations = async (productToQuery?: string, qtyToQuery?: number) => {
    const qProduct = productToQuery || commodity;
    const qQty = qtyToQuery !== undefined ? qtyToQuery : quantityKg;

    setIsRankLoading(true);
    setRankingError(null);
    const t0 = performance.now();
    try {
      const result = await aiService.rankMarketOpportunity(qProduct, qQty, regime, 6);
      setMarketResult(result);
      const elapsed = Math.round(performance.now() - t0);

      const topDest = result.top_recommendations?.[0]?.destination.country_name || "United States";
      const topScore = result.top_recommendations?.[0]?.scores.final_score || 85.0;

      notifyN8nWorkflow({
        workflowName: "Global Destination Ranking Engine",
        latencyMs: elapsed,
        summary: `Evaluated ${result.total_candidates_evaluated || 52} countries for ${qProduct} (${qQty.toLocaleString()} kg) · Top: ${topDest} (${topScore.toFixed(1)}/100)`,
        modelsTriggered: [
          "XGBoost Residual Demand Forecaster (Q10/50/90)",
          "TreeSHAP Attribution Engine",
          "Rule-Based Trade Risk Penalty Engine",
          "Multi-Criteria Opportunity Engine"
        ],
      });
    } catch (err: any) {
      setRankingError(err?.message || "Market opportunity ranking failed — backend unreachable.");
      setMarketResult(null);
    } finally {
      setIsRankLoading(false);
    }
  };

  const [sourcingCountry, setSourcingCountry] = useState<string>("IND");

  // Execute Supplier Sourcing for Importers
  const handleDiscoverSuppliers = async (productToQuery?: string, qtyToQuery?: number, originCountryToQuery?: string) => {
    const qProduct = productToQuery || commodity;
    const qQty = qtyToQuery !== undefined ? qtyToQuery : quantityKg;
    const qCountry = originCountryToQuery || sourcingCountry;

    setIsSupplierLoading(true);
    setSupplierError(null);
    try {
      const suppliers = await aiService.semanticMatch(qProduct, undefined, qQty, qCountry, 100630);
      setMatchingSuppliers(suppliers);
    } catch (err: any) {
      setSupplierError(err?.message || "Supplier matching failed — ML service unreachable.");
      setMatchingSuppliers([]);
    } finally {
      setIsSupplierLoading(false);
    }
  };

  // Run appropriate discovery on mount / change
  useEffect(() => {
    if (isExporterView) {
      handleDiscoverDestinations();
    } else {
      handleDiscoverSuppliers(commodity, quantityKg, sourcingCountry);
    }
  }, [isExporterView, commodity, quantityKg, sourcingCountry]);

  const handleSelectCountry = (data: DestinationCountryInsight) => {
    setSelectedCountryInsight(data);
    setIsDrawerOpen(true);
  };

  // Filter listings
  const filteredListings = useMemo<Listing[]>(() => {
    return listings.filter((item) => {
      const matchesCategory =
        selectedCategory === "All Commodities" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === "" ||
        item.title.toLowerCase().includes(q) ||
        item.exporterName.toLowerCase().includes(q) ||
        item.hsCode.includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [listings, selectedCategory, searchQuery]);

  return (
    <AppShell maxWidth="full" className="space-y-8">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <PageHeader
        title={
          isExporterView
            ? "Global Trade Destination Discovery & Marketplace"
            : "Supplier Discovery & Marketplace"
        }
        subtitle={
          isExporterView
            ? "Rank all global destination countries for Indian exports using 3-year moving-average demand forecasts, CEPA/RTA tariff schedules, and trade risk models."
            : "Browse verified supplier listings for inbound purchases. Source-country ranking is not yet modelled — see the note below."
        }
        badge={
          isExporterView ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Country Opportunity Engine Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Import View · {activeDirection}</span>
            </div>
          )
        }
        action={
          <div className="flex items-center gap-2">
            <Link to="/trade-analysis">
              <SpecularButton variant="outline" size="sm" radius={10}>
                ⚡ Open Trade Analysis →
              </SpecularButton>
            </Link>
          </div>
        }
      />

      {/* ── n8n Automation Engine Telemetry Alert ─────────────────── */}
      {n8nOnline === false && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3 text-xs shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-amber-200 block font-semibold text-sm">
              n8n Automation Engine Offline / Webhook Unreachable
            </strong>
            <p className="text-slate-300 font-sans leading-relaxed">
              Could not establish connection to the n8n webhook listener at <code className="font-mono text-amber-300 font-bold">{n8nUrl}</code>. 
              Background automation (automated buyer RFQ matching, OCR compliance verification, and scheduled trade events) is currently paused.
            </p>
            <p className="text-slate-400 font-mono text-[11px] pt-0.5">
              To activate full n8n automation, start n8n locally (<code className="text-white bg-black/40 px-1 py-0.5 rounded">n8n start</code> at port 5678) and activate the <code className="text-white bg-black/40 px-1 py-0.5 rounded">GlobeX Trade Automation</code> workflow.
            </p>
          </div>
        </div>
      )}

      {n8nOnline === true && (
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="font-mono font-bold">n8n Workflow Engine Active</span>
            <span className="text-slate-400">· Webhook listener connected at {n8nUrl}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-mono font-bold">
            5 WORKFLOWS LIVE
          </span>
        </div>
      )}

      {/* ── SECTION 1: ROLE-SPECIFIC DISCOVERY ─────────────────────── */}
      {isExporterView ? (
        /* ── EXPORTER: GLOBAL DESTINATION RADAR ────────────────────── */
        <div className="space-y-5 p-6 sm:p-7 rounded-3xl bg-[#080C14] border border-sky-500/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-sky-400 font-bold uppercase tracking-wider">
                <Globe2 className="w-4 h-4 text-sky-400" />
                <span>AI Country Destination Finder (XGBoost + TreeSHAP)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
                Where Should I Export My Product?
              </h2>
              <p className="text-xs text-slate-400 font-sans max-w-2xl">
                Enter what you want to export and how much. Our ranking engine scans 18+ major global trade corridors, calculates bilateral demand momentum from 26-year trade history, checks tariff schedules, and ranks the highest-probability countries.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Strategy:</span>
              <select
                value={regime}
                onChange={(e) => {
                  setRegime(e.target.value);
                  handleDiscoverDestinations(commodity, quantityKg);
                }}
                className="bg-[#0C121D] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500/50"
              >
                <option value="balanced">Balanced (Recommended)</option>
                <option value="aggressive">Aggressive (High Growth)</option>
                <option value="conservative">Conservative (Established Ports)</option>
                <option value="risk_averse">Risk-Averse (Zero Sanctions)</option>
              </select>
            </div>
          </div>

          {/* Input Bar with Prefix/Typeahead Dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            <div className="md:col-span-6 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-400">
                  Export Commodity / HS6 Product
                </label>
                <span className="text-[11px] font-mono text-sky-400">
                  Type prefix (e.g. &ldquo;b&rdquo; &rarr; Basmati, Pepper...)
                </span>
              </div>
              <CommoditySearchDropdown
                value={commodity}
                onChange={(name) => setCommodity(name)}
                onSelect={(opt: CommodityOption) => {
                  setCommodity(opt.name);
                  setQuantityKg(opt.typicalQty);
                  handleDiscoverDestinations(opt.name, opt.typicalQty);
                }}
              />
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-mono text-slate-400">
                Quantity (kg)
              </label>
              <input
                type="number"
                value={quantityKg}
                onChange={(e) => setQuantityKg(Math.max(1, Number(e.target.value)))}
                placeholder="1000"
                className="w-full bg-[#0C121D] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="md:col-span-3">
              <SpecularButton
                size="md"
                onClick={() => handleDiscoverDestinations()}
                isLoading={isRankLoading}
                className="w-full justify-center text-sm py-2.5"
              >
                <Search className="w-4 h-4 mr-1.5" />
                Rank Global Markets
              </SpecularButton>
            </div>
          </div>

          {/* Resolution Info Banner */}
          {marketResult?.product_resolution && (
            <div className="p-3.5 rounded-2xl bg-[#0C121D] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-mono font-bold">
                  HS {marketResult.product_resolution.hs6}
                </span>
                <span className="font-sans font-medium text-slate-200">
                  {marketResult.product_resolution.product_description}
                </span>
              </div>

              <span className="text-slate-400 font-mono text-[11px]">
                {marketResult.total_candidates_evaluated || 18} destination countries evaluated · Ranked by Net Opportunity Score
              </span>
            </div>
          )}

          {/* Ranking Error Message if Backend Fails */}
          {rankingError && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <span>{rankingError}</span>
              <button 
                onClick={() => handleDiscoverDestinations()}
                className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800/80 rounded-lg text-rose-200 font-mono font-bold text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {/* Ranked Country Cards Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Ranked Destination Countries for {quantityKg.toLocaleString()} kg {commodity}</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Click any country to view full forecast & pros/cons
              </span>
            </div>

            {isRankLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-56 rounded-2xl bg-[#0C121D] animate-pulse border border-white/[0.05]" />
                ))}
              </div>
            ) : marketResult?.top_recommendations && marketResult.top_recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketResult.top_recommendations.map((rec, index) => (
                  <CountryOpportunityCard
                    key={rec.destination.iso3}
                    rank={index + 1}
                    data={rec}
                    onSelect={handleSelectCountry}
                    userCommodity={commodity}
                    userQuantityKg={quantityKg}
                  />
                ))}
              </div>
            ) : !rankingError ? (
              <div className="p-8 text-center rounded-2xl bg-[#0C121D] border border-white/[0.06] text-slate-400 text-sm">
                No matching destination countries found for "{commodity}". Enter another commodity or select from the dropdown above.
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* ── IMPORTER: VERIFIED SUPPLIER SOURCING ─────────────────── */
        <div className="space-y-5 p-6 sm:p-7 rounded-3xl bg-[#080C14] border border-amber-500/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Verified Supplier Discovery &amp; Counterparty Matching</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
                Find &amp; Match Verified Global Suppliers
              </h2>

              {/* Sourcing Input Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5 space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">
                    Commodity to Procure
                  </label>
                  <CommoditySearchDropdown
                    value={commodity}
                    onChange={(name) => setCommodity(name)}
                    onSelect={(opt: CommodityOption) => {
                      setCommodity(opt.name);
                      setQuantityKg(opt.typicalQty);
                      handleDiscoverSuppliers(opt.name, opt.typicalQty, sourcingCountry);
                    }}
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">
                    Quantity (kg)
                  </label>
                  <input
                    type="number"
                    value={quantityKg}
                    onChange={(e) => setQuantityKg(Math.max(1, Number(e.target.value)))}
                    placeholder="1000"
                    className="w-full bg-[#0C121D] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">
                    Sourcing Origin Country
                  </label>
                  <select
                    value={sourcingCountry}
                    onChange={(e) => {
                      setSourcingCountry(e.target.value);
                      handleDiscoverSuppliers(commodity, quantityKg, e.target.value);
                    }}
                    className="w-full bg-[#0C121D] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="IND">🇮🇳 India (IND) — Domestic Mills</option>
                    <option value="ARE">🇦🇪 United Arab Emirates (ARE)</option>
                    <option value="SAU">🇸🇦 Saudi Arabia (SAU)</option>
                    <option value="VNM">🇻🇳 Vietnam (VNM)</option>
                    <option value="THA">🇹🇭 Thailand (THA)</option>
                    <option value="USA">🇺🇸 United States (USA)</option>
                    <option value="DEU">🇩🇪 Germany (DEU)</option>
                    <option value="NLD">🇳🇱 Netherlands (NLD)</option>
                    <option value="SGP">🇸🇬 Singapore (SGP)</option>
                    <option value="AUS">🇦🇺 Australia (AUS)</option>
                    <option value="CAN">🇨🇦 Canada (CAN)</option>
                    <option value="BRA">🇧🇷 Brazil (BRA)</option>
                    <option value="EGY">🇪🇬 Egypt (EGY)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <SpecularButton
                    size="md"
                    onClick={() => handleDiscoverSuppliers(commodity, quantityKg, sourcingCountry)}
                    isLoading={isSupplierLoading}
                    className="w-full justify-center text-xs py-2.5 bg-amber-600 hover:bg-amber-500 font-bold"
                  >
                    <Search className="w-3.5 h-3.5 mr-1" />
                    Find Exporters
                  </SpecularButton>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Error Alert */}
          {supplierError && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <span>{supplierError}</span>
              <button 
                onClick={() => handleDiscoverSuppliers(commodity, quantityKg, sourcingCountry)}
                className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800/80 rounded-lg text-rose-200 font-mono font-bold text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {/* Matching Suppliers List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Exporters in {sourcingCountry} Matching {commodity} ({quantityKg.toLocaleString()} kg)</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Ranked by ML Trust Score &amp; OFAC Sanctions Clearance
              </span>
            </div>

            {isSupplierLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-48 rounded-2xl bg-[#0C121D] animate-pulse border border-white/[0.05]" />
                ))}
              </div>
            ) : matchingSuppliers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchingSuppliers.map((sup, idx) => (
                  <div 
                    key={sup.exporterId || idx}
                    className="p-5 rounded-2xl bg-[#0C121D] border border-white/[0.08] hover:border-amber-500/40 transition-all space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold">
                            {sup.matchScore ? `${sup.matchScore}% MATCH` : "ACCREDITED"}
                          </span>
                          {sup.creditRating && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/60">
                              {sup.creditRating}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-display font-bold text-white mt-1.5">
                          {sup.companyName}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {sup.originCountry} · {sup.port}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-amber-400">
                          Trust: {sup.trustScore}/100
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 block mt-0.5">
                          OFAC Cleared
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sup.certifications?.slice(0, 3).map((cert: string) => (
                        <span 
                          key={cert}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-300"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">
                        Available for {quantityKg.toLocaleString()} kg CIF
                      </span>
                      <Link 
                        to={`/trade-requests?commodity=${encodeURIComponent(commodity)}&qty=${quantityKg}&supplier=${encodeURIComponent(sup.companyName)}&origin=${encodeURIComponent(sup.originCountry)}&port=${encodeURIComponent(sup.port)}`}
                      >
                        <button className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-lg text-xs font-mono font-bold transition-all">
                          Issue RFQ →
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : !supplierError ? (
              <div className="p-8 text-center rounded-2xl bg-[#0C121D] border border-white/[0.06] text-slate-400 text-sm">
                No matching suppliers found for &lsquo;{commodity}&rsquo;. Search for another commodity above.
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── SECTION 2: PRODUCT MARKETPLACE CATALOG ─────────────────── */}
      <div className="space-y-5 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-display font-bold text-white">
              {isExporterView
                ? "Export Commodities Inventory Catalog"
                : "Verified Supplier Listings"}
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              {isExporterView
                ? "Browse pre-verified warehouse lots and export listings available across Indian trade hubs."
                : "Browse pre-verified lots you can purchase. Listing data is direction-agnostic and shared with the export flow."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              {filteredListings.length} Active Listings
            </span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all",
                selectedCategory === cat
                  ? "bg-white text-black font-bold shadow-lg shadow-white/10"
                  : "bg-[#0C121D] text-slate-400 border border-white/[0.07] hover:text-white hover:border-white/[0.15]"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        {listingsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-[#0C121D] animate-pulse border border-white/[0.05]" />
            ))}
          </div>
        ) : listingsError ? (
          <div className="p-8 text-center rounded-2xl bg-[#0C121D] border border-rose-500/20 text-rose-300 text-sm">
            Could not load marketplace listings — backend unreachable. ({listingsError})
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#0C121D] border border-white/[0.06] text-slate-400 text-sm">
            No active listings yet. Be the first to publish one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onInspect={(l) => {
                  setInspectListing(l);
                  setCommodity(l.title);
                  handleDiscoverDestinations(l.title, 1000);
                }}
                onRequest={(l) => {
                  setRequestListing(l);
                  setIsRequestDrawerOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Country Opportunity Detail Drawer ─────────────────────── */}
      <CountryDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        data={selectedCountryInsight}
        userCommodity={commodity}
        userQuantityKg={quantityKg}
      />

      {/* ── Listing Detail Drawer ─────────────────────────────────── */}
      <ListingDetailDrawer
        isOpen={!!inspectListing}
        onClose={() => setInspectListing(null)}
        listing={inspectListing}
        onRequestTrade={(l) => {
          setInspectListing(null);
          setRequestListing(l);
          setIsRequestDrawerOpen(true);
        }}
      />

      {/* ── Create Trade Request Drawer ───────────────────────────── */}
      <CreateTradeRequestDrawer
        isOpen={isRequestDrawerOpen}
        onClose={() => setIsRequestDrawerOpen(false)}
        listing={requestListing}
      />
    </AppShell>
  );
};

export default MarketplacePage;
