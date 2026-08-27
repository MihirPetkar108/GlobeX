import React, { useState, useEffect, Suspense, lazy } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import SpecularButton from "@/components/ui/SpecularButton";
import { DetailDrawer } from "@/components/common/DetailDrawer";
import { tradesService, TradeRecord, BackendTradeStatus, BackendUnavailableError } from "@/services/api/tradesService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentVerificationStudio from "@/components/documents/DocumentVerificationStudio";
import PaymentEscrowFlow from "@/components/escrow/PaymentEscrowFlow";
import ShipmentRouteMap from "@/components/shipments/ShipmentRouteMap";
import DisputeCenter from "@/components/disputes/DisputeCenter";
import AuditTrailTimeline from "@/components/blockchain/AuditTrailTimeline";
import type { Message } from "@/components/agent-elements/types";
import { TrustBreakdownDrawer } from "@/components/trust/TrustBreakdownDrawer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ship,
  FileCheck2,
  Coins,
  Scale,
  Database,
  Bot,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  Radio,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  XCircle,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  Sparkles,
  Search,
  WifiOff,
} from "lucide-react";

const AgentChat = lazy(() =>
  import("@/components/agent-elements/agent-chat").then((m) => ({ default: m.AgentChat }))
);

const TABS = [
  { id: "documents", label: "Documents", icon: FileCheck2 },
  { id: "payment", label: "Payment & Escrow", icon: Coins },
  { id: "shipment", label: "Shipment", icon: Ship },
  { id: "disputes", label: "Disputes", icon: Scale },
  { id: "blockchain", label: "Audit Trail", icon: Database },
] as const;

type TabId = (typeof TABS)[number]["id"];
type TradeStatusState = "requested" | "confirmed" | "rejected" | "counter" | "settled";

/**
 * Maps the backend's trade status and export status into UI states.
 */
function toTradeStatusState(status: BackendTradeStatus | string): TradeStatusState {
  switch (status) {
    case "CREATED":
    case "OFFERED":
    case "NEW REQUEST":
      return "requested";
    case "COUNTER_OFFERED":
    case "NEGOTIATING":
      return "counter";
    case "REJECTED":
    case "CANCELLED":
      return "rejected";
    case "COMPLETED":
    case "SETTLED":
      return "settled";
    case "ACCEPTED":
    case "AGREED":
    case "IN_PROGRESS":
    case "SHIPPED":
    case "IN TRANSIT":
    case "DELIVERED":
    case "DISPUTED":
    default:
      return "confirmed";
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TradeWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, listings, exportRequests } = useWorkspace();

  const tradeId = id || "";

  const [trade, setTrade] = useState<TradeRecord | null>(null);
  const [tradeState, setTradeState] = useState<TradeStatusState>("requested");
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notConnected, setNotConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchTrade = async () => {
    setIsLoading(true);
    setNotFound(false);
    setNotConnected(false);
    setLoadError(null);

    // 1. Check if ID matches a local/context export request
    const matchedExportReq = (exportRequests || []).find((r) => r.id === tradeId);
    if (matchedExportReq) {
      const listing = listings.find((l) => l.id === matchedExportReq.listingId);
      const totalAmount =
        matchedExportReq.finalTradeValue ||
        matchedExportReq.buyerProposedTradeValue ||
        matchedExportReq.originalTradeValue ||
        (matchedExportReq.quantity * (matchedExportReq.finalAgreedPrice || matchedExportReq.buyerProposedPrice || matchedExportReq.originalPrice || 0));

      const record: TradeRecord = {
        id: matchedExportReq.id,
        listing_id: matchedExportReq.listingId || null,
        exporter_id: "exporter",
        importer_id: user.organizationId,
        status: matchedExportReq.status === "SETTLED" ? "COMPLETED" : (matchedExportReq.status as any),
        total_amount: totalAmount,
        currency: "USD",
        quantity: matchedExportReq.quantity,
        agreed_price: matchedExportReq.finalAgreedPrice || matchedExportReq.buyerProposedPrice || matchedExportReq.originalPrice,
        created_at: matchedExportReq.createdAt,
        updated_at: matchedExportReq.createdAt,
        listing: listing
          ? {
              product_name: listing.title,
              product_category: listing.category,
              hs_code: listing.hsCode,
              unit: listing.unit,
              origin_port: listing.originPort,
              price: listing.unitPriceUSD,
              incoterms: "FOB",
              currency: "USD",
            }
          : null,
      };

      setTrade(record);
      setTradeState(toTradeStatusState(matchedExportReq.status));
      setIsLoading(false);
      return;
    }

    // 2. Otherwise query backend if valid UUID
    if (!UUID_RE.test(tradeId)) {
      setIsLoading(false);
      setNotFound(true);
      return;
    }

    try {
      const record = await tradesService.getTrade(tradeId);
      setTrade(record);
      setTradeState(toTradeStatusState(record.status));
    } catch (err) {
      if (err instanceof BackendUnavailableError) {
        setNotConnected(true);
      } else {
        setLoadError(err instanceof Error ? err.message : "Could not load this trade.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId, exportRequests]);

  // Counteroffer form state
  const [isCounterFormOpen, setIsCounterFormOpen] = useState(false);
  const [revisedQty, setRevisedQty] = useState<number>(550);
  const [revisedPrice, setRevisedPrice] = useState<number>(1060);

  // Best-effort enrichment: the backend trade row has no product/country
  // fields, only raw ids — match against listings already fetched by
  // WorkspaceContext. Falls back to the flagship demo display when there's
  // no matching listing (e.g. pre-DB-setup, or before a real trade loads).
  const matchedListing = trade ? listings.find((l) => l.id === trade.listing_id) : undefined;
  const selectedListing = matchedListing
    ? {
        title: matchedListing.title,
        category: matchedListing.category,
        image: "https://cdn-icons-png.flaticon.com/512/3174/3174880.png",
        originCountry: matchedListing.exporterCountry,
        originFlag: "in",
        originPort: matchedListing.originPort || "Origin port",
        destCountry: user.country || "Destination",
        destFlag: "ae",
        destPort: "Destination port",
        supplierName: matchedListing.exporterName,
        buyerName: user.companyName || "Your organization",
        quantity: trade?.quantity ?? matchedListing.availableQuantity,
        unit: matchedListing.unit,
        agreedPrice: trade?.agreed_price ?? matchedListing.unitPriceUSD,
        totalValue: trade?.total_amount ?? (trade?.quantity ?? 0) * (trade?.agreed_price ?? 0),
        aiMatchScore: matchedListing.aiMatchScore ?? 90,
      }
    : {
        title: "1121 Steam Extra Long Grain Basmati Rice",
        category: "Agriculture",
        image: "https://pngimg.com/uploads/rice/rice_PNG13.png",
        originCountry: "India",
        originFlag: "in",
        originPort: "Cochin Port (JNPT), Mumbai",
        destCountry: "United Arab Emirates",
        destFlag: "ae",
        destPort: "Jebel Ali Port, Dubai",
        supplierName: "Acme Exports Ltd",
        buyerName: user.companyName || "Demo Exports Pvt Ltd",
        quantity: trade?.quantity ?? 600,
        unit: "tonne",
        agreedPrice: trade?.agreed_price ?? 1100,
        totalValue: trade?.total_amount ?? 681600,
        aiMatchScore: 94,
      };

  // State Tabs switcher
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const hash = window.location.hash.replace("#", "") as TabId;
    return TABS.some((t) => t.id === hash) ? hash : "documents";
  });

  const [chatOpen, setChatOpen] = useState(false);
  const [trustDrawerOpen, setTrustDrawerOpen] = useState(false);

  // AI Copilot state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Trade parameters verified for 600 MT Basmati Rice.\n\n✓ Commercial Invoice: Verified\n✓ Bill of Lading: Clean On-Board\n✓ Phytosanitary: APEDA Certified",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [status, setStatus] = useState<"idle" | "streaming">("idle");

  const handleSendMessage = (text: string) => {
    const userMsg: Message = {
      id: String(Date.now()),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStatus("streaming");

    setTimeout(() => {
      let reply = "Trade parameter verified against CEPA schedule rules with 100% consistency.";
      if (text.toLowerCase().includes("vessel") || text.toLowerCase().includes("eta")) {
        reply = "Vessel MSC ANNA (IMO 9400234) is 320 nautical miles from Jebel Ali Port. Current speed: 16.4 knots. No delays detected.";
      }
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), role: "assistant", content: reply, timestamp: new Date().toISOString() },
      ]);
      setStatus("idle");
    }, 700);
  };

  const handleTabChange = (newTab: TabId) => {
    setActiveTab(newTab);
    window.history.replaceState(null, "", `#${newTab}`);
  };

  // Handlers for state actions
  const handleCancelRequest = () => {
    toast.info("Trade request has been cancelled.");
    setTradeState("rejected");
  };

  const handleAcceptCounterOffer = () => {
    toast.success("Counter-offer accepted! Trade confirmed.", { icon: "✓" });
    setTradeState("confirmed");
  };

  const handleDeclineCounterOffer = () => {
    toast.info("Counter-offer declined.");
    setTradeState("rejected");
  };

  const handleSubmitRevisedCounter = () => {
    setIsCounterFormOpen(false);
    toast.success("Revised counter-offer submitted to supplier.");
    setTradeState("requested");
  };

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-6 select-none font-sans">
        
        {/* Page Header */}
        <PageHeader
          breadcrumbs={[{ label: "Dashboard", href: "/home" }, { label: "Trades", href: "/trades" }, { label: tradeId }]}
          title={`Trade ${tradeId}`}
          subtitle="Unified Trade Status & Lifecycle Management"
          action={
            <button
              type="button"
              onClick={() => navigate("/trades")}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Trades</span>
            </button>
          }
        />

        {isLoading ? (
          <LoadingSkeleton variant="card" count={2} />
        ) : notConnected ? (
          <EmptyState
            icon={WifiOff}
            title="Backend not connected yet"
            description="This trade will load once the backend's database connection is configured."
          />
        ) : notFound || loadError ? (
          <EmptyState
            title="Trade not found"
            description={loadError || "This trade doesn't exist or the link is out of date."}
            action={
              <Link to="/trades" className="text-xs font-medium text-emerald-600 hover:text-emerald-500">
                Back to Trades
              </Link>
            }
          />
        ) : (
          <>
        {/* ── TOP TRADE SUMMARY CARD (PROMINENT BALANCED METRICS) ───────────────── */}
        <div className="bg-gradient-to-br from-sky-50/90 via-blue-50/60 to-sky-50/90 border border-sky-200/90 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs font-sans">
          
          {/* Header Row: ID + Flags + Status Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-sky-200/80">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-sm text-slate-900 bg-white/90 px-3 py-1 rounded-xl border border-sky-200/80 shadow-2xs">
                {tradeId}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <img src={`https://flagcdn.com/w40/${selectedListing.originFlag}.png`} className="w-4.5 h-3.5 object-cover rounded-xs shadow-2xs" />
                <span>{selectedListing.originCountry}</span>
                <span className="text-sky-400 font-bold">➔</span>
                <img src={`https://flagcdn.com/w40/${selectedListing.destFlag}.png`} className="w-4.5 h-3.5 object-cover rounded-xs shadow-2xs" />
                <span>{selectedListing.destCountry}</span>
              </div>
            </div>

            {/* Dynamic Status Badge */}
            <div>
              {tradeState === "settled" && (
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-950 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  ✓ Trade Settled & Done
                </span>
              )}
              {tradeState === "requested" && (
                <span className="px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  Request Pending
                </span>
              )}
              {tradeState === "confirmed" && (
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Trade Confirmed
                </span>
              )}
              {tradeState === "counter" && (
                <span className="px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Counter Offer Received
                </span>
              )}
              {tradeState === "rejected" && (
                <span className="px-3.5 py-1.5 rounded-full bg-rose-100 border border-rose-300 text-rose-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Request Declined
                </span>
              )}
            </div>
          </div>

          {/* Product Info & Counterparty Data */}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-sky-200/80 p-2.5 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src={selectedListing.image}
                alt={selectedListing.title}
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-sans text-xs font-bold">
                  {selectedListing.aiMatchScore}% MATCH SCORE
                </span>
                <span className="text-xs font-sans text-sky-700 font-bold uppercase tracking-wider">{selectedListing.category}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold font-sans text-slate-900 leading-tight">
                {selectedListing.title}
              </h2>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 flex-wrap pt-0.5">
                <span>Supplier: <strong className="text-slate-900 font-bold">{selectedListing.supplierName}</strong></span>
                <span className="text-sky-300 font-bold">•</span>
                <span>Buyer: <strong className="text-slate-900 font-bold">{selectedListing.buyerName}</strong></span>
              </div>
            </div>
          </div>

          {/* PROMINENT BALANCED METRICS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-sky-200/80 font-sans">
            <div>
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">Quantity</span>
              <strong className="text-base sm:text-lg font-extrabold text-slate-900 block">{selectedListing.quantity} {selectedListing.unit}s</strong>
            </div>
            <div>
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">Agreed Price</span>
              <strong className="text-base sm:text-lg font-extrabold text-slate-900 block">${selectedListing.agreedPrice} / {selectedListing.unit}</strong>
            </div>
            <div>
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">Shipping Route</span>
              <strong className="text-xs sm:text-sm font-semibold text-slate-900 truncate block">{selectedListing.originPort} ➔ {selectedListing.destPort}</strong>
            </div>
            <div>
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">Total Landed Value</span>
              <strong className="text-lg sm:text-xl font-black text-emerald-800 block">${selectedListing.totalValue.toLocaleString()}</strong>
            </div>
          </div>

        </div>


        {/* ── STATE 1: PENDING / REQUESTED STATE (DIRECT YELLOW BOX) ─────────── */}
        {tradeState === "requested" && (
          <div className="p-6 rounded-3xl bg-amber-50/90 border border-amber-200/90 shadow-xs space-y-4 font-sans">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                <Clock className="w-5.5 h-5.5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-amber-950">Trade Request Pending</h3>
                <p className="text-xs sm:text-sm text-amber-800 font-medium leading-relaxed">
                  Trade request sent. Waiting for the trader to accept.
                </p>
              </div>
            </div>

            {/* Actions Bar inside Yellow Box */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-amber-200/80">
              <button
                type="button"
                onClick={handleCancelRequest}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-800 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                Cancel Request
              </button>

              <SpecularButton
                size="md"
                radius={12}
                variant="secondary"
                onClick={() => navigate("/trades")}
                className="w-full sm:w-auto px-6 py-2.5 font-bold text-xs justify-center bg-white"
                icon={<ArrowLeft className="w-4 h-4" />}
                iconPosition="left"
              >
                Back to Trades
              </SpecularButton>
            </div>
          </div>
        )}


        {/* ── STATE 2: ACCEPTED / CONFIRMED STATE (DIRECT GREEN BOX) ─────────── */}
        {tradeState === "confirmed" && (
          <div className="space-y-6 font-sans">

            {/* Tabs & Full Workspace Content */}
            <div className="space-y-5 pt-1">
              <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabId)} className="w-full space-y-5">
                <TabsList className="grid grid-cols-3 sm:grid-cols-5 h-auto p-1 rounded-2xl bg-white border border-slate-200/90 gap-1 shadow-2xs">
                  {TABS.map(({ id: tabId, label, icon: Icon }) => (
                    <TabsTrigger
                      key={tabId}
                      value={tabId}
                      className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
                  <DocumentVerificationStudio tradeId={tradeId} />
                </TabsContent>

                <TabsContent value="payment" className="mt-0 focus-visible:outline-none">
                  <PaymentEscrowFlow tradeId={tradeId} />
                </TabsContent>

                <TabsContent value="shipment" className="mt-0 focus-visible:outline-none">
                  <ShipmentRouteMap />
                </TabsContent>

                <TabsContent value="disputes" className="mt-0 focus-visible:outline-none">
                  <DisputeCenter tradeId={tradeId} />
                </TabsContent>

                <TabsContent value="blockchain" className="mt-0 focus-visible:outline-none">
                  <AuditTrailTimeline />
                </TabsContent>
              </Tabs>
            </div>

          </div>
        )}


        {/* ── STATE 3: REJECTED / DECLINED STATE (DIRECT RED BOX) ────────────── */}
        {tradeState === "rejected" && (
          <div className="p-6 rounded-3xl bg-rose-50/90 border border-rose-200/90 shadow-xs space-y-4 font-sans">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
                <XCircle className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-extrabold text-rose-950">Trade Request Declined</h3>
                <p className="text-xs sm:text-sm text-rose-800 font-medium">
                  The supplier was unable to accept this trade proposal.
                </p>
              </div>
            </div>

            {/* Trader's Reason */}
            <div className="p-4 rounded-2xl bg-white/90 border border-rose-200/80 text-xs text-slate-700 space-y-1">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">REASON FROM SUPPLIER (ACME EXPORTS LTD):</span>
              <p className="font-medium text-slate-800 leading-relaxed">
                &ldquo;Unable to fulfill the requested quantity of 600 tonnes within the requested delivery timeline due to prior export allocation commitments.&rdquo;
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-rose-200/80">
              <button
                type="button"
                onClick={() => navigate("/trades")}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Trades</span>
              </button>

              <SpecularButton
                size="md"
                radius={12}
                variant="emerald"
                onClick={() => navigate("/discover")}
                className="w-full sm:w-auto px-6 py-2.5 font-bold text-xs justify-center shadow-xs"
                icon={<Search className="w-4 h-4" />}
                iconPosition="left"
              >
                Find Similar Products →
              </SpecularButton>
            </div>
          </div>
        )}


        {/* ── STATE 4: COUNTER OFFER STATE (DIRECT AMBER BOX) ────────────────── */}
        {tradeState === "counter" && (
          <div className="p-6 rounded-3xl bg-amber-50/90 border border-amber-200/90 shadow-xs space-y-5 font-sans">
            
            {/* Header Banner */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                <Sparkles className="w-5.5 h-5.5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-extrabold text-amber-950">Counter Offer Received</h3>
                <p className="text-xs sm:text-sm text-amber-800 font-medium">
                  Acme Exports Ltd has submitted a revised trade counter-proposal.
                </p>
              </div>
            </div>

            {/* Side-by-Side Comparison Card: Your Request vs Trader's Offer */}
            <div className="border border-amber-200/90 rounded-3xl overflow-hidden bg-white shadow-2xs space-y-0">
              <div className="bg-amber-100/60 p-3.5 border-b border-amber-200/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Trade Parameter Comparison</span>
                <span className="text-[11px] text-amber-900 font-bold bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                  3 Terms Adjusted
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs font-sans">
                
                {/* Header Row */}
                <div className="grid grid-cols-3 p-3.5 bg-slate-50/60 font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                  <div>Parameter</div>
                  <div>Your Request</div>
                  <div>Trader's Counter Offer</div>
                </div>

                {/* Row 1: Quantity */}
                <div className="grid grid-cols-3 p-3.5 items-center bg-amber-50/30">
                  <span className="font-bold text-slate-900">Order Quantity</span>
                  <span className="text-slate-500 font-medium line-through">600 tonnes</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-950 text-sm">500 tonnes</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">CHANGED</span>
                  </div>
                </div>

                {/* Row 2: Price / Unit */}
                <div className="grid grid-cols-3 p-3.5 items-center bg-amber-50/30">
                  <span className="font-bold text-slate-900">Unit Price (FOB)</span>
                  <span className="text-slate-500 font-medium line-through">$1,050 / tonne</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-950 text-sm">$1,075 / tonne</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">CHANGED</span>
                  </div>
                </div>

                {/* Row 3: Total Landed Value */}
                <div className="grid grid-cols-3 p-3.5 items-center bg-amber-50/30">
                  <span className="font-bold text-slate-900">Total Value</span>
                  <span className="text-slate-500 font-medium line-through">$648,000</span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-800 text-base">$555,500</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-bold">REVISED</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Inline Revision Form (Opens when Counter Again is clicked) */}
            <AnimatePresence>
              {isCounterFormOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-5 rounded-3xl bg-white border border-amber-200/90 space-y-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Submit Your Revised Counter-Offer
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCounterFormOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Revised Quantity (Tonnes):</label>
                      <input
                        type="number"
                        value={revisedQty}
                        onChange={(e) => setRevisedQty(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm bg-white text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Revised Price ($/Tonne):</label>
                      <input
                        type="number"
                        value={revisedPrice}
                        onChange={(e) => setRevisedPrice(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCounterFormOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <SpecularButton
                      size="sm"
                      radius={10}
                      variant="emerald"
                      onClick={handleSubmitRevisedCounter}
                      className="px-5 py-2 font-bold text-xs"
                    >
                      Submit Revised Offer →
                    </SpecularButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions Bar: Accept Offer, Counter Again, Decline */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-amber-200/80">
              <button
                type="button"
                onClick={handleDeclineCounterOffer}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Decline Counter-Offer
              </button>

              <button
                type="button"
                onClick={() => setIsCounterFormOpen((prev) => !prev)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Counter Again
              </button>

              <SpecularButton
                size="md"
                radius={12}
                variant="emerald"
                onClick={handleAcceptCounterOffer}
                className="w-full sm:w-auto px-7 py-2.5 font-bold text-xs justify-center shadow-xs"
                icon={<Check className="w-4 h-4" />}
                iconPosition="left"
              >
                Accept Counter-Offer →
              </SpecularButton>
            </div>

          </div>
        )}
          </>
        )}

      </div>
    </AppShell>
  );
};

export default TradeWorkspacePage;
