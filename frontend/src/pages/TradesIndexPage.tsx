import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import SpecularButton from "@/components/ui/SpecularButton";
import { tradesService, TradeRecord, BackendUnavailableError } from "@/services/api/tradesService";
import { motion } from "framer-motion";
import { ChevronRight, Heart, WifiOff } from "lucide-react";
import { toast } from "sonner";

/** UI status bucket this page groups the real 12-value backend status into. */
type UiStatus = "Requested" | "Confirmed" | "In Progress" | "Done" | "Rejected";

function toUiStatus(status: TradeRecord["status"]): UiStatus {
  switch (status) {
    case "CREATED":
    case "OFFERED":
    case "COUNTER_OFFERED":
      return "Requested";
    case "ACCEPTED":
    case "AGREED":
      return "Confirmed";
    case "IN_PROGRESS":
    case "SHIPPED":
    case "DELIVERED":
      return "In Progress";
    case "COMPLETED":
      return "Done";
    case "REJECTED":
    case "CANCELLED":
    case "DISPUTED":
      return "Rejected";
    default:
      return "Requested";
  }
}

const STATUS_STYLE: Record<UiStatus, string> = {
  Requested: "bg-amber-50 text-amber-800 border-amber-200/90",
  Confirmed: "bg-sky-50 text-sky-800 border-sky-200/90",
  "In Progress": "bg-indigo-50 text-indigo-800 border-indigo-200/90",
  Done: "bg-emerald-50 text-emerald-800 border-emerald-200/90",
  Rejected: "bg-rose-50 text-rose-800 border-rose-200/90",
};

const STATUS_CTA: Record<UiStatus, string> = {
  Requested: "View Request",
  Confirmed: "View Trade",
  "In Progress": "Track Trade",
  Done: "View Trade",
  Rejected: "View Trade",
};

const WISHLIST_KEY = "globex_trade_wishlist_ids";

function loadWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWishlist(ids: string[]) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
}

type FilterTab = "All" | "Wishlist" | UiStatus;

const TABS: FilterTab[] = ["All", "Wishlist", "Requested", "Confirmed", "In Progress", "Done", "Rejected"];

export const TradesIndexPage: React.FC = () => {
  const { user, listings, hasUnreadTradeUpdates } = useWorkspace();

  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [wishlist, setWishlist] = useState<string[]>(loadWishlist);

  const fetchTrades = async () => {
    setLoading(true);
    setError(null);
    setNotConnected(false);
    try {
      const all = await tradesService.getTrades();
      // No server-side org scoping exists — filter to trades where this org is the importer.
      setTrades(all.filter((t) => t.importer_id === user.organizationId));
    } catch (err) {
      if (err instanceof BackendUnavailableError) {
        setNotConnected(true);
      } else {
        setError(err instanceof Error ? err.message : "Could not load trades.");
      }
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.organizationId) fetchTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.organizationId]);

  const toggleWishlist = (id: string, e: React.MouseEvent, title: string) => {
    e.stopPropagation();
    e.preventDefault();
    setWishlist((prev) => {
      const isIn = prev.includes(id);
      const next = isIn ? prev.filter((x) => x !== id) : [...prev, id];
      saveWishlist(next);
      if (!isIn) {
        toast.success(`Saved "${title}" to Wishlist`, { icon: "❤️" });
      } else {
        toast.info(`Removed "${title}" from Wishlist`);
      }
      return next;
    });
  };

  // Best-effort enrichment: the backend has no product title/image/country
  // fields on a trade, only raw ids — match against listings already
  // fetched by WorkspaceContext, falling back to a generic display.
  const enriched = useMemo(() => {
    return trades.map((t) => {
      const listing = listings.find((l) => l.id === t.listing_id);
      const uiStatus = toUiStatus(t.status);
      const totalAmount =
        t.total_amount ?? (t.quantity != null && t.agreed_price != null ? t.quantity * t.agreed_price : 0);
      return {
        record: t,
        listing,
        uiStatus,
        title: listing?.title || `Trade #${t.id.slice(0, 8)}`,
        image: listing ? undefined : undefined,
        originCountry: listing?.exporterCountry || "Unknown origin",
        supplierName: listing?.exporterName || "Unverified supplier",
        quantityLabel: t.quantity != null ? `${t.quantity.toLocaleString()} ${listing?.unit || "units"}` : "—",
        totalAmount,
        isWishlisted: wishlist.includes(t.id),
      };
    });
  }, [trades, listings, wishlist]);

  const filtered = enriched.filter((t) => {
    if (activeTab === "All") return true;
    if (activeTab === "Wishlist") return t.isWishlisted;
    return t.uiStatus === activeTab;
  });

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-6 select-none font-sans">
        <PageHeader
          breadcrumbs={[{ label: "Dashboard", href: "/home" }, { label: "Trades" }]}
          title="All Trades"
          subtitle="View all your requested, confirmed, in-progress, completed, and rejected trades."
        />

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
          {TABS.map((tab) => {
            const count = enriched.filter((t) => {
              if (tab === "All") return true;
              if (tab === "Wishlist") return t.isWishlisted;
              return t.uiStatus === tab;
            }).length;

            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  isActive ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100/80 hover:bg-slate-200/80 text-slate-600"
                }`}
              >
                {tab === "Wishlist" ? (
                  <span className="flex items-center gap-1">
                    <Heart className={`w-3.5 h-3.5 ${isActive ? "fill-rose-400 text-rose-400" : "fill-rose-500 text-rose-500"}`} />
                    <span>Wishlist</span>
                  </span>
                ) : tab === "In Progress" ? (
                  <span className="flex items-center gap-1.5">
                    <span>In Progress</span>
                    {hasUnreadTradeUpdates && (
                      <span className="flex h-2 w-2 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                  </span>
                ) : (
                  <span>{tab === "All" ? "All Trades" : tab}</span>
                )}

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSkeleton variant="card" count={3} />
        ) : notConnected ? (
          <EmptyState
            icon={WifiOff}
            title="Backend not connected yet"
            description="Trade data will appear here once the backend's database connection is configured."
          />
        ) : error ? (
          <EmptyState title="Could not load trades" description={error} action={<button type="button" onClick={fetchTrades} className="text-xs font-medium text-emerald-600 hover:text-emerald-500 cursor-pointer">Retry</button>} />
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200/80 rounded-3xl space-y-3">
                <Heart className="w-10 h-10 text-rose-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">
                  {activeTab === "Wishlist" ? "No Wishlisted Trades Found" : "No Trades Yet"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {activeTab === "Wishlist"
                    ? "Click the heart icon on any trade card to save it to your Wishlist."
                    : "Trades you make as an importer will show up here."}
                </p>
              </div>
            ) : (
              filtered.map((t) => (
                <motion.div
                  key={t.record.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-200/80 p-2 flex items-center justify-center shrink-0 relative text-slate-300 text-2xl font-black">
                      {t.title.charAt(0)}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${STATUS_STYLE[t.uiStatus]}`}>
                          {t.uiStatus}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">{t.record.status}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900 truncate">{t.title}</h3>
                        <button
                          type="button"
                          onClick={(e) => toggleWishlist(t.record.id, e, t.title)}
                          className={`p-1.5 rounded-full border transition-all cursor-pointer shrink-0 ${
                            t.isWishlisted
                              ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                          }`}
                          title={t.isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Heart className={`w-4 h-4 ${t.isWishlisted ? "fill-rose-600" : ""}`} />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                        <span className="text-slate-800 font-semibold">{t.originCountry}</span>
                        <span>•</span>
                        <span className="text-slate-700">{t.supplierName}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-800">{t.quantityLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL VALUE</div>
                      <div className="text-lg font-black text-slate-900 font-sans">
                        ${t.totalAmount.toLocaleString()}
                      </div>
                    </div>

                    <Link to={`/trades/${t.record.id}`}>
                      <SpecularButton
                        size="sm"
                        radius={12}
                        variant={t.uiStatus === "Requested" ? "secondary" : "emerald"}
                        className="px-4 py-2 font-bold text-xs font-sans group-hover:shadow-md"
                        icon={<ChevronRight className="w-4 h-4" />}
                        iconPosition="right"
                      >
                        {STATUS_CTA[t.uiStatus]}
                      </SpecularButton>
                    </Link>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default TradesIndexPage;
