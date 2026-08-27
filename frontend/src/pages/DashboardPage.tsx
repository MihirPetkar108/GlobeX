import React, { useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { FLAGSHIP_DEMO_TRADE } from "@/data/mockTradeData";
import { AppShell } from "@/components/layout/AppShell";
import TradeGlobe from "@/components/TradeGlobe";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Compass,
  Gauge,
  ShieldCheck,
  Handshake,
  Landmark,
  Settings,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Building2,
  ChevronUp,
  Globe as GlobeIcon,
  TrendingUp,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SelectedMode = "import" | "export";

export const DashboardPage: React.FC = () => {
  const { user, activeDirection, setActiveDirection } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const isDemo = useMemo(() => new URLSearchParams(location.search).get("demo") === "true", [location.search]);

  const displayName = user?.companyName || (isDemo ? "Demo Trading Account" : "Globex Trading");

  const [activeMode, setActiveMode] = useState<SelectedMode>(
    activeDirection === "Import" ? "import" : "export"
  );
  // Detailed section expands when user clicks IMPORT or EXPORT
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const handleSelectMode = (mode: SelectedMode) => {
    setActiveMode(mode);
    setActiveDirection(mode === "import" ? "Import" : "Export");
    setShowDetails(true);
    setTimeout(() => {
      const el = document.getElementById("trade-details-panel");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  // Inbound / Import Trades (Visual Minimalist Format)
  const importTrades = [
    {
      id: "TRD-LTC-CL-992",
      title: "Lithium Carbonate 99.5%",
      originIso2: "cl",
      originCountry: "Chile",
      destIso2: "in",
      destCountry: "India",
      route: "Chile → India",
      valueText: "$3.20M",
      statusText: "Awaiting Clearance",
      statusColor: "bg-amber-500",
      actionHref: "/documents",
    },
    {
      id: "TRD-WHT-CA-501",
      title: "Organic Red Wheat",
      originIso2: "ca",
      originCountry: "Canada",
      destIso2: "in",
      destCountry: "India",
      route: "Canada → India",
      valueText: "$920K",
      statusText: "In Transit",
      statusColor: "bg-sky-400",
      actionHref: "/shipments",
    },
    {
      id: "TRD-SOL-TW-331",
      title: "Solar Inverter Modules",
      originIso2: "tw",
      originCountry: "Taiwan",
      destIso2: "in",
      destCountry: "India",
      route: "Taiwan → India",
      valueText: "$1.45M",
      statusText: "Ready to Receive",
      statusColor: "bg-emerald-500",
      actionHref: "/escrow",
    },
  ];

  // Outbound / Export Trades (Visual Minimalist Format)
  const exportTrades = [
    {
      id: FLAGSHIP_DEMO_TRADE.id,
      title: "1121 Basmati Rice",
      originIso2: "in",
      originCountry: "India",
      destIso2: "ae",
      destCountry: "UAE",
      route: "India → UAE",
      valueText: "$550K",
      statusText: "Sailing (MSC ANNA)",
      statusColor: "bg-emerald-500",
      actionHref: "/trades/TRD-IND-UAE-550K",
    },
    {
      id: "TRD-PEP-IN-442",
      title: "Tellicherry Pepper",
      originIso2: "in",
      originCountry: "India",
      destIso2: "nl",
      destCountry: "Netherlands",
      route: "India → Netherlands",
      valueText: "$410K",
      statusText: "Cleared for Export",
      statusColor: "bg-emerald-500",
      actionHref: "/documents",
    },
    {
      id: "TRD-YRN-IN-780",
      title: "Combed Cotton Yarn",
      originIso2: "in",
      originCountry: "India",
      destIso2: "it",
      destCountry: "Italy",
      route: "India → Italy",
      valueText: "$880K",
      statusText: "Ready to Ship",
      statusColor: "bg-amber-500",
      actionHref: "/catalog",
    },
  ];

  const currentTrades = activeMode === "import" ? importTrades : exportTrades;

  // Dashboard specific constants can go here if needed.

  return (
    <AppShell maxWidth="full" hideRail={true}>
      {isDemo && (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 text-center text-sm font-mono text-amber-900">
          <span className="font-bold">DEMO MODE</span> • Preview of dashboard UI • <Link to="/home" className="underline hover:text-amber-700">Live version</Link>
        </div>
      )}
      <div className="w-full min-h-screen bg-white text-slate-900 flex flex-col font-sans antialiased p-4 sm:p-6 gap-4 sm:gap-6 selection:bg-emerald-100 selection:text-emerald-900 relative">
        
        <main className="flex-1 min-w-0 flex flex-col gap-8 w-full max-w-7xl mx-auto">
          {/* Top Actions Bar (Import/Export) */}
          <section aria-label="Primary Actions" className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ── IMPORT BUTTON ──────────────────────────────────────────────── */}
            <button
              type="button"
              onClick={() => {
                setActiveDirection("Import");
                navigate("/discover");
              }}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-200 flex items-center justify-between text-left group cursor-pointer relative overflow-hidden",
                activeMode === "import"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xl"
                  : "bg-white border-slate-200/80 text-slate-900 hover:border-slate-400 hover:bg-slate-50/50 shadow-sm"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0",
                  activeMode === "import"
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-100 text-slate-900 group-hover:bg-slate-200"
                )}>
                  <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xl font-extrabold tracking-tight uppercase block">
                    IMPORT
                  </span>
                  <span className={cn(
                    "text-xs font-medium block mt-0.5",
                    activeMode === "import" ? "text-white/90" : "text-slate-500"
                  )}>
                    Shipments you're receiving
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-mono font-bold px-3 py-1 rounded-full uppercase",
                  activeMode === "import" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                )}>
                  {activeMode === "import" ? "Active" : "Select"}
                </span>
                <ArrowRight className={cn(
                  "w-5 h-5 transition-transform group-hover:translate-x-1",
                  activeMode === "import" ? "text-emerald-400" : "text-slate-400"
                )} />
              </div>
            </button>

            {/* ── EXPORT BUTTON ──────────────────────────────────────────────── */}
            <button
              type="button"
              onClick={() => {
                setActiveDirection("Export");
                navigate("/export-trades");
              }}
              className={cn(
                "p-6 rounded-3xl border transition-all duration-200 flex items-center justify-between text-left group cursor-pointer relative overflow-hidden",
                activeMode === "export"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xl"
                  : "bg-white border-slate-200/80 text-slate-900 hover:border-slate-400 hover:bg-slate-50/50 shadow-sm"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0",
                  activeMode === "export"
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-100 text-slate-900 group-hover:bg-slate-200"
                )}>
                  <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xl font-extrabold tracking-tight uppercase block">
                    EXPORT
                  </span>
                  <span className={cn(
                    "text-xs font-medium block mt-0.5",
                    activeMode === "export" ? "text-white/90" : "text-slate-500"
                  )}>
                    Shipments you're sending
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-mono font-bold px-3 py-1 rounded-full uppercase",
                  activeMode === "export" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                )}>
                  {activeMode === "export" ? "Active" : "Select"}
                </span>
                <ArrowRight className={cn(
                  "w-5 h-5 transition-transform group-hover:translate-x-1",
                  activeMode === "export" ? "text-emerald-400" : "text-slate-400"
                )} />
              </div>
            </button>
          </section>

          {/* ── 4. MIDDLE SECTION: LIGHTWEIGHT SUMMARY STATS & CENTRAL 3D GLOBE ── */}
          <section aria-label="Trade Overview" className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-4 sm:gap-6 items-start lg:items-center pt-2">
            {/* ── LEFT: IMPORT SUMMARY AREA (MINIMALIST VISUAL SUMMARY) ───────── */}
            <div
              onClick={() => handleSelectMode("import")}
              className={cn(
                "md:col-span-1 lg:col-span-3 p-4 sm:p-6 rounded-2xl sm:rounded-3xl transition-all cursor-pointer space-y-4 sm:space-y-6 select-none",
                activeMode === "import"
                  ? "bg-slate-50/80 border border-slate-200 shadow-sm"
                  : "hover:bg-slate-50/40"
              )}
            >
              <div className="space-y-1">
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                  INCOMING SHIPMENTS
                </span>
                <h2 className="text-xs sm:text-sm font-bold text-slate-600 uppercase">
                  What's arriving
                </h2>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* 1. Total Imports */}
                <div>
                  <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-400 block">Total Imports</span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                    $8.40M
                  </div>
                </div>

                {/* 2. Profit & Loss */}
                <div className="pt-2 sm:pt-3 border-t border-slate-200/60">
                  <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-400 block">Profit & Loss</span>
                  <div className="text-base sm:text-lg font-bold text-emerald-600 font-mono flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>+$1.24M (+14.8%)</span>
                  </div>
                </div>

                {/* 3. Active Orders */}
                <div className="pt-2 sm:pt-3 border-t border-slate-200/60">
                  <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-400 block">Active Orders</span>
                  <div className="text-base sm:text-lg font-bold text-slate-800 font-mono mt-0.5">
                    14 Active Orders
                  </div>
                </div>
              </div>

              <div className="pt-2 sm:pt-3 flex items-center gap-1 text-xs font-mono font-bold text-slate-600 group">
                <span className="hidden sm:inline">View Summary</span>
                <span className="sm:hidden">Summary</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* ── CENTER: LARGE 3D GLOBE (NATURAL ON WHITE PAGE, NO HEAVY CONTAINER) ── */}
            <div aria-label="Central 3D Globe" className="md:col-span-1 lg:col-span-6 relative flex items-center justify-center min-h-[320px] sm:min-h-[400px] md:min-h-[480px] lg:min-h-[540px] order-2 md:order-2">
              {/* Large Central 3D Globe matching reference asset media_1787681176665.png */}
              <div className="w-full h-[320px] sm:h-[400px] md:h-[480px] lg:h-[540px] flex items-center justify-center">
                <TradeGlobe
                  selectedCountry={activeMode === "export" ? "Italy" : "India"}
                  showArcs={true}
                  autoRotate={true}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* ── RIGHT: EXPORT SUMMARY AREA (MINIMALIST VISUAL SUMMARY) ──────── */}
            <div
              onClick={() => handleSelectMode("export")}
              className={cn(
                "md:col-span-1 lg:col-span-3 p-4 sm:p-6 rounded-2xl sm:rounded-3xl transition-all cursor-pointer space-y-4 sm:space-y-6 select-none order-3 md:order-3",
                activeMode === "export"
                  ? "bg-slate-50/80 border border-slate-200 shadow-sm"
                  : "hover:bg-slate-50/40"
              )}
            >
              <div className="space-y-1">
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                  OUTGOING SHIPMENTS
                </span>
                <h2 className="text-xs sm:text-sm font-bold text-slate-600 uppercase">
                  What you're selling
                </h2>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* 1. Total Exports */}
                <div>
                  <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-400 block">Total Exports</span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                    $14.20M
                  </div>
                </div>

                {/* 2. Profit & Loss */}
                <div className="pt-2 sm:pt-3 border-t border-slate-200/60">
                  <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-400 block">Profit & Loss</span>
                  <div className="text-base sm:text-lg font-bold text-emerald-600 font-mono flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>+$3.85M (+27.1%)</span>
                  </div>
                </div>

                {/* 3. Active Shipments */}
                <div className="pt-2 sm:pt-3 border-t border-slate-200/60">
                  <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-400 block">Active Shipments</span>
                  <div className="text-base sm:text-lg font-bold text-slate-800 font-mono mt-0.5">
                    18 Active Shipments
                  </div>
                </div>
              </div>

              <div className="pt-2 sm:pt-3 flex items-center gap-1 text-xs font-mono font-bold text-slate-600 group">
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </section>

          {/* ── 5. DETAILED TRADE SECTION BELOW (COLLAPSIBLE, SHOWN ON SELECTION) ── */}
          {showDetails && (
            <section
              id="trade-details-panel"
              aria-label="Recent Trade Details"
              className="pt-6 border-t border-slate-100 space-y-4 animate-fade-in-up"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight font-mono">
                    Recent {activeMode.toUpperCase()} Trade Operations
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="text-xs font-mono text-slate-400 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Hide Details</span>
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>

              {/* Lightweight Trade Cards (3 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {currentTrades.slice(0, 3).map((trade) => (
                  <Link
                    key={trade.id}
                    to={trade.actionHref}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between gap-4 group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap text-xs font-bold text-slate-700">
                        <img
                          src={`https://flagcdn.com/w40/${trade.originIso2}.png`}
                          alt={trade.originCountry}
                          className="w-5 h-3.5 object-cover rounded-xs border border-slate-200/70 shadow-2xs shrink-0"
                        />
                        <span className="truncate">{trade.originCountry}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                        <img
                          src={`https://flagcdn.com/w40/${trade.destIso2}.png`}
                          alt={trade.destCountry}
                          className="w-5 h-3.5 object-cover rounded-xs border border-slate-200/70 shadow-2xs shrink-0"
                        />
                        <span className="truncate">{trade.destCountry}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors text-slate-400 shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 truncate mb-1">{trade.title}</h4>
                      <span className="text-lg font-black font-mono text-slate-800">{trade.valueText}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </AppShell>
  );
};

export default DashboardPage;
