import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  ExportRequest,
  ExportTradeStatus,
  ExportNegotiationOffer,
} from "@/data/exportRequests";
import { tradesService, mapTradeToExportRequest } from "@/services/api/tradesService";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DetailDrawer } from "@/components/common/DetailDrawer";
import { SpecularButton } from "@/components/ui/SpecularButton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Workflow,
  Search,
  Filter,
  X,
  Check,
  MessageSquare,
  Ship,
  Clock,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ExternalLink,
  Package,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
} from "lucide-react";

type TradeFilter =
  | "NEW REQUEST"
  | "NEGOTIATING"
  | "PAYMENT PENDING"
  | "READY TO SHIP"
  | "IN TRANSIT"
  | "DELIVERED"
  | "DISPUTED"
  | "SETTLED"
  | "REJECTED"
  | "ALL";

const FILTER_LABELS: Record<TradeFilter, string> = {
  "NEW REQUEST": "New Requests",
  "NEGOTIATING": "Negotiating",
  "PAYMENT PENDING": "Payment Pending",
  "READY TO SHIP": "Ready to Ship",
  "IN TRANSIT": "In Transit",
  "DELIVERED": "Delivered",
  "DISPUTED": "Disputed",
  "SETTLED": "Settled",
  "REJECTED": "Rejected",
  "ALL": "All Requests",
};

interface TradeDetailDrawerProps {
  trade: ExportRequest;
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<ExportRequest>) => void;
}

const ExportTradeDetailDrawer: React.FC<TradeDetailDrawerProps> = ({
  trade,
  onClose,
  onUpdate,
}) => {
  const [isCountering, setIsCountering] = useState(false);
  const [counterPrice, setCounterPrice] = useState(
    trade.exporterCounterPrice?.toString() ||
      trade.buyerProposedPrice?.toString() ||
      trade.originalPrice.toString()
  );
  const [counterQty, setCounterQty] = useState(trade.quantity.toString());

  // Dispatch form state
  const [isDispatching, setIsDispatching] = useState(false);
  const [carrier, setCarrier] = useState("Maersk Line");
  const [billOfLading, setBillOfLading] = useState("MEDUIND" + Math.floor(100000 + Math.random() * 900000));
  const [etd, setEtd] = useState(new Date().toISOString().split("T")[0]);
  const [eta, setEta] = useState(
    new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  // Dispute form state
  const [isRaisingDispute, setIsRaisingDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("Quality / Specification Mismatch");
  const [disputeDetails, setDisputeDetails] = useState("");

  const originalTotal = trade.quantity * trade.originalPrice;
  const buyerTotal = trade.buyerProposedPrice
    ? trade.quantity * trade.buyerProposedPrice
    : undefined;
  const counterTotal = trade.exporterCounterPrice
    ? trade.quantity * trade.exporterCounterPrice
    : undefined;
  const finalPrice =
    trade.finalAgreedPrice ||
    trade.exporterCounterPrice ||
    trade.buyerProposedPrice ||
    trade.originalPrice;
  const finalTotal = trade.quantity * finalPrice;

  // Commercial Accept
  const handleAcceptCommercial = (agreedPrice: number) => {
    const agreedTotalVal = trade.quantity * agreedPrice;
    const nowStr = `Today, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const acceptOffer: ExportNegotiationOffer = {
      role: "Exporter",
      price: agreedPrice,
      quantity: trade.quantity,
      time: nowStr,
      note: "Commercial Agreement Accepted by Exporter",
    };

    onUpdate(trade.id, {
      status: "PAYMENT PENDING",
      finalAgreedPrice: agreedPrice,
      finalTradeValue: agreedTotalVal,
      negotiationHistory: [...trade.negotiationHistory, acceptOffer],
    });

    toast.success(`Commercial terms accepted at $${agreedPrice.toLocaleString()}/${trade.unit}. Awaiting buyer payment confirmation.`);
  };

  // Submit Counter Offer
  const handleSubmitCounter = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(counterPrice);
    const q = parseFloat(counterQty);
    if (isNaN(p) || p <= 0 || isNaN(q) || q <= 0) {
      toast.error("Please enter a valid price and quantity.");
      return;
    }

    const nowStr = `Today, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const newOffer: ExportNegotiationOffer = {
      role: "Exporter",
      price: p,
      quantity: q,
      time: nowStr,
      note: "Exporter Counter Offer submitted",
    };

    onUpdate(trade.id, {
      status: "NEGOTIATING",
      exporterCounterPrice: p,
      exporterCounterTradeValue: p * q,
      quantity: q,
      negotiationHistory: [...trade.negotiationHistory, newOffer],
    });

    setIsCountering(false);
    toast.success(`Counter offer of $${p.toLocaleString()} sent to buyer.`);
  };

  // Reject Trade
  const handleReject = () => {
    onUpdate(trade.id, {
      status: "REJECTED",
    });
    toast.error(`Trade ${trade.id} has been rejected.`);
    onClose();
  };

  // Confirm Payment
  const handleConfirmPayment = () => {
    onUpdate(trade.id, {
      status: "READY TO SHIP",
      paymentStatus: "Confirmed",
    });
    toast.success("Payment confirmed & deposited into protected escrow. Trade is now Ready to Ship!");
  };

  // Dispatch Shipment
  const handleDispatchShipment = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(trade.id, {
      status: "IN TRANSIT",
      carrier,
      billOfLading,
      etd,
      eta,
      shipmentId: `SHP-${Math.floor(1000 + Math.random() * 9000)}`,
      currentLocation: `${trade.origin} (Vessel Dispatched)`,
    });
    setIsDispatching(false);
    toast.success(`Shipment dispatched on ${carrier}. Container tracking is live!`);
  };

  // Mark as Delivered
  const handleMarkDelivered = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    onUpdate(trade.id, {
      status: "DELIVERED",
      deliveryDate: todayStr,
      deliveryStatus: "Pending",
    });
    toast.success(`Shipment arrived at ${trade.destinationPort}. Awaiting importer delivery confirmation.`);
  };

  // Importer Confirms Delivery -> Settled
  const handleConfirmDelivery = () => {
    onUpdate(trade.id, {
      status: "SETTLED",
      deliveryStatus: "Confirmed",
      paymentStatus: "Released",
    });
    toast.success("Delivery confirmed without dispute! Escrow funds released. Trade settled.");
  };

  // Raise Dispute
  const handleRaiseDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeDetails.trim()) {
      toast.error("Please provide dispute details.");
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    const newTimeline = [
      ...(trade.disputeTimeline || []),
      {
        date: todayStr,
        author: `Buyer (${trade.buyer})`,
        note: `Dispute raised: ${disputeReason}. ${disputeDetails}`,
      },
    ];

    onUpdate(trade.id, {
      status: "DISPUTED",
      disputeReason,
      disputeDetails,
      deliveryStatus: "Disputed",
      disputeTimeline: newTimeline,
    });
    setIsRaisingDispute(false);
    toast.warning("Dispute recorded. Trade moved to DISPUTED status for arbitration / resolution.");
  };

  // Resolve Dispute -> Settled
  const handleResolveDispute = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newTimeline = [
      ...(trade.disputeTimeline || []),
      {
        date: todayStr,
        author: "Arbitrator / Agreement",
        note: "Dispute resolved amicably. Settlement finalized.",
      },
    ];

    onUpdate(trade.id, {
      status: "SETTLED",
      deliveryStatus: "Confirmed",
      paymentStatus: "Released",
      disputeTimeline: newTimeline,
    });
    toast.success("Dispute resolved & settled! Trade finalized.");
  };

  return (
    <DetailDrawer
      isOpen={true}
      onClose={onClose}
      title={trade.product}
      subtitle={`Trade ${trade.id} • ${trade.buyer} (${trade.country})`}
      badge={<StatusBadge status={trade.status} />}
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {/* NEW REQUEST actions */}
            {trade.status === "NEW REQUEST" && (
              <>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-sm transition-colors flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCountering(true)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 font-semibold text-sm transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{trade.buyerProposedPrice ? "Counter Offer" : "Negotiate"}</span>
                </button>

                <SpecularButton
                  variant="emerald"
                  size="sm"
                  onClick={() =>
                    handleAcceptCommercial(
                      trade.buyerProposedPrice || trade.originalPrice
                    )
                  }
                  icon={<Check className="w-4 h-4 stroke-[2.5]" />}
                  iconPosition="left"
                >
                  {trade.buyerProposedPrice
                    ? `Accept Buyer's Price ($${trade.buyerProposedPrice.toLocaleString()})`
                    : "Accept Request"}
                </SpecularButton>
              </>
            )}

            {/* NEGOTIATING actions */}
            {trade.status === "NEGOTIATING" && (
              <>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-sm transition-colors flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCountering((prev) => !prev)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 font-semibold text-sm transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{isCountering ? "Cancel Counter" : "Counter Offer"}</span>
                </button>

                <SpecularButton
                  variant="emerald"
                  size="sm"
                  onClick={() =>
                    handleAcceptCommercial(
                      trade.buyerProposedPrice ||
                        trade.exporterCounterPrice ||
                        trade.originalPrice
                    )
                  }
                  icon={<Check className="w-4 h-4 stroke-[2.5]" />}
                  iconPosition="left"
                >
                  Accept Current Offer
                </SpecularButton>
              </>
            )}

            {/* PAYMENT PENDING actions */}
            {trade.status === "PAYMENT PENDING" && (
              <SpecularButton
                variant="emerald"
                size="sm"
                onClick={handleConfirmPayment}
                icon={<CreditCard className="w-4 h-4" />}
                iconPosition="left"
              >
                Confirm Buyer Payment ($
                {(trade.finalTradeValue || finalTotal).toLocaleString()})
              </SpecularButton>
            )}

            {/* READY TO SHIP actions */}
            {trade.status === "READY TO SHIP" && (
              <SpecularButton
                variant="emerald"
                size="sm"
                onClick={() => setIsDispatching(true)}
                icon={<Ship className="w-4 h-4" />}
                iconPosition="left"
              >
                Dispatch Shipment
              </SpecularButton>
            )}

            {/* IN TRANSIT actions */}
            {trade.status === "IN TRANSIT" && (
              <SpecularButton
                variant="primary"
                size="sm"
                onClick={handleMarkDelivered}
                icon={<CheckCircle2 className="w-4 h-4" />}
                iconPosition="left"
              >
                Mark as Delivered at Port
              </SpecularButton>
            )}

            {/* DELIVERED actions */}
            {trade.status === "DELIVERED" && (
              <>
                <button
                  type="button"
                  onClick={() => setIsRaisingDispute(true)}
                  className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-sm transition-colors flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Raise Dispute</span>
                </button>

                <SpecularButton
                  variant="emerald"
                  size="sm"
                  onClick={handleConfirmDelivery}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  iconPosition="left"
                >
                  Confirm Delivery &amp; Settle
                </SpecularButton>
              </>
            )}

            {/* DISPUTED actions */}
            {trade.status === "DISPUTED" && (
              <SpecularButton
                variant="emerald"
                size="sm"
                onClick={handleResolveDispute}
                icon={<CheckCircle2 className="w-4 h-4" />}
                iconPosition="left"
              >
                Resolve Dispute &amp; Settle Trade
              </SpecularButton>
            )}

            {/* SETTLED / REJECTED */}
            {(trade.status === "SETTLED" || trade.status === "REJECTED") && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Close Trade Record
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-slate-800">
        {/* Buyer Overview Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{trade.flag}</span>
              <div>
                <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  {trade.buyer}
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Buyer
                  </span>
                </h4>
                <p className="text-xs text-slate-500">{trade.country} • Trade Request ID: {trade.id}</p>
              </div>
            </div>
            <Link
              to={`/trades/${trade.id}`}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm"
            >
              <span>Full Workspace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-xs">
            <div>
              <span className="text-slate-400 block">Risk Rating</span>
              <span className="font-medium text-slate-700">{trade.buyerRisk}</span>
            </div>
            <div>
              <span className="text-slate-400 block">HS Code</span>
              <span className="font-mono font-medium text-slate-700">{trade.hsCode}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Category</span>
              <span className="font-medium text-slate-700">{trade.category}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Linked Listing</span>
              <span className="font-mono font-medium text-emerald-700">{trade.listingId}</span>
            </div>
          </div>
        </div>

        {/* Commercial Status Highlight for PAYMENT PENDING & Later */}
        {trade.status === "PAYMENT PENDING" && (
          <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                Commercial Agreement: Accepted
              </span>
              <span className="text-xs font-bold bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full">
                Payment: ⏳ Pending Buyer Deposit
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-purple-950 font-medium pt-1">
              <span>Final Agreed Unit Price: <strong>${(trade.finalAgreedPrice || finalPrice).toLocaleString()} / {trade.unit}</strong></span>
              <span>Final Trade Valuation: <strong>${(trade.finalTradeValue || finalTotal).toLocaleString()}</strong></span>
            </div>
          </div>
        )}

        {/* Dispatch Form Modal/Block */}
        {isDispatching && (
          <form
            onSubmit={handleDispatchShipment}
            className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-3 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-sky-950 flex items-center gap-1.5">
                <Ship className="w-4 h-4 text-sky-600" />
                Dispatch &amp; Carrier Bill of Lading Details
              </h4>
              <button
                type="button"
                onClick={() => setIsDispatching(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Carrier Line / Vessel</label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Bill of Lading (B/L) #</label>
                <input
                  type="text"
                  value={billOfLading}
                  onChange={(e) => setBillOfLading(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Estimated Departure (ETD)</label>
                <input
                  type="date"
                  value={etd}
                  onChange={(e) => setEtd(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Estimated Arrival (ETA)</label>
                <input
                  type="date"
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <SpecularButton variant="emerald" size="xs" type="submit">
                Confirm Shipment Departure
              </SpecularButton>
            </div>
          </form>
        )}

        {/* Raise Dispute Form */}
        {isRaisingDispute && (
          <form
            onSubmit={handleRaiseDispute}
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Raise Import Exception / Dispute
              </h4>
              <button
                type="button"
                onClick={() => setIsRaisingDispute(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Dispute Reason</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-sm font-medium cursor-pointer"
                >
                  <option value="Quantity Mismatch">Quantity Mismatch</option>
                  <option value="Quality / Specification Mismatch">Quality / Specification Mismatch</option>
                  <option value="Damaged Goods / Packaging Failure">Damaged Goods / Packaging Failure</option>
                  <option value="Late Delivery / Transit Delay">Late Delivery / Transit Delay</option>
                  <option value="Documentation / Certificate Discrepancy">Documentation / Certificate Discrepancy</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Evidence &amp; Description</label>
                <textarea
                  rows={3}
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  placeholder="Detail laboratory test results, inspection findings, or commercial adjustment proposed..."
                  className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-sm font-medium"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Submit Official Dispute
              </button>
            </div>
          </form>
        )}

        {/* Counter Form */}
        {isCountering && (
          <form
            onSubmit={handleSubmitCounter}
            className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Submit Exporter Counter Offer
              </h4>
              <button
                type="button"
                onClick={() => setIsCountering(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Counter Price ($ / {trade.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Quantity ({trade.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={counterQty}
                  onChange={(e) => setCounterQty(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-medium"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-emerald-950 font-medium">
                New Proposed Total: $
                {((parseFloat(counterPrice) || 0) * (parseFloat(counterQty) || 0)).toLocaleString()}
              </span>
              <SpecularButton variant="emerald" size="xs" type="submit">
                Send Counter to Buyer
              </SpecularButton>
            </div>
          </form>
        )}

        {/* Pricing Valuation Breakdown */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Valuation &amp; Negotiation Metrics
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] text-slate-400 block font-medium">Original List Price</span>
              <span className="text-sm font-bold text-slate-800">
                ${trade.originalPrice.toLocaleString()} / {trade.unit}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Total: ${originalTotal.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] text-slate-400 block font-medium">Requested Volume</span>
              <span className="text-sm font-bold text-slate-800">
                {trade.quantity.toLocaleString()} {trade.unit}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {trade.incoterm} Terms
              </span>
            </div>

            {trade.buyerProposedPrice ? (
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <span className="text-[11px] text-amber-700 block font-medium">
                  Buyer Proposed
                </span>
                <span className="text-sm font-bold text-amber-900">
                  ${trade.buyerProposedPrice.toLocaleString()} / {trade.unit}
                </span>
                <span className="text-[10px] text-amber-700 block mt-0.5">
                  Total: ${buyerTotal?.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[11px] text-slate-400 block font-medium">Buyer Proposal</span>
                <span className="text-sm font-medium text-slate-400">List Price Accepted</span>
              </div>
            )}

            {trade.finalAgreedPrice ? (
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
                <span className="text-[11px] text-emerald-700 block font-medium">Agreed Final</span>
                <span className="text-sm font-bold text-emerald-900">
                  ${trade.finalAgreedPrice.toLocaleString()} / {trade.unit}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5 font-bold">
                  Valuation: ${(trade.finalTradeValue || finalTotal).toLocaleString()}
                </span>
              </div>
            ) : trade.exporterCounterPrice ? (
              <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200">
                <span className="text-[11px] text-sky-700 block font-medium">Your Counter</span>
                <span className="text-sm font-bold text-sky-900">
                  ${trade.exporterCounterPrice.toLocaleString()}
                </span>
                <span className="text-[10px] text-sky-700 block mt-0.5">
                  Total: ${counterTotal?.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[11px] text-slate-400 block font-medium">Agreed Final</span>
                <span className="text-sm font-medium text-slate-400">In Discussion</span>
              </div>
            )}
          </div>
        </div>

        {/* Shipping & Delivery Track */}
        {(trade.status === "IN TRANSIT" || trade.status === "DELIVERED" || trade.status === "DISPUTED" || trade.status === "SETTLED") && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Shipment Telemetry &amp; Bill of Lading
            </h4>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Carrier</span>
                <span className="font-bold text-slate-800">{trade.carrier || "Maersk Line"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Bill of Lading</span>
                <span className="font-mono font-bold text-slate-800">{trade.billOfLading || "HLCUCO993821"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">ETD / ETA</span>
                <span className="font-medium text-slate-700">{trade.etd || "2026-08-22"} → {trade.eta || "2026-08-28"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Current Location</span>
                <span className="font-medium text-emerald-700">{trade.currentLocation || "Arrived Port"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Details & Timeline (if Disputed) */}
        {trade.status === "DISPUTED" && (
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-3">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Active Trade Dispute: {trade.disputeReason}</span>
            </div>
            <p className="text-xs text-rose-950 leading-relaxed bg-white/80 p-3 rounded-xl border border-rose-200/60">
              {trade.disputeDetails}
            </p>

            {trade.disputeTimeline && trade.disputeTimeline.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block">
                  Dispute Timeline &amp; Submissions
                </span>
                {trade.disputeTimeline.map((item, idx) => (
                  <div key={idx} className="text-xs flex items-start gap-2 bg-white/60 p-2 rounded-lg">
                    <span className="text-slate-400 font-mono text-[10px] shrink-0 mt-0.5">{item.date}</span>
                    <span className="font-semibold text-rose-900 shrink-0">{item.author}:</span>
                    <span className="text-slate-700">{item.note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settled Confirmation Summary */}
        {trade.status === "SETTLED" && (
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Trade Settlement Completed</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-emerald-900 pt-1">
              <div>Settlement: <strong>✓ Complete</strong></div>
              <div>Payment: <strong>✓ Released</strong></div>
              <div>Shipment: <strong>✓ Delivered</strong></div>
              <div>Dispute: <strong>✓ None / Resolved</strong></div>
            </div>
          </div>
        )}

        {/* Complete Negotiation History Timeline */}
        {trade.negotiationHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Complete Negotiation History
              </h4>
              {trade.status === "NEGOTIATING" && (
                <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Awaiting buyer response
                </span>
              )}
            </div>

            <div className="space-y-2">
              {trade.negotiationHistory.map((offer, idx) => {
                const isBuyer = offer.role === "Buyer";
                const offerTotal = offer.quantity * offer.price;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-3 rounded-xl border flex items-center justify-between text-xs transition-colors",
                      isBuyer
                        ? "bg-amber-50/40 border-amber-200/80"
                        : "bg-emerald-50/40 border-emerald-200/80"
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            isBuyer
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          )}
                        >
                          {offer.role}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          ${offer.price.toLocaleString()}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          / {trade.unit} • {offer.quantity.toLocaleString()} {trade.unit}
                        </span>
                      </div>
                      {offer.note && (
                        <p className="text-[11px] text-slate-600 italic pl-1">{offer.note}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-800 block">
                        ${offerTotal.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">{offer.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DetailDrawer>
  );
};

export const ExportTradesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedListingId = searchParams.get("listingId");

  const { listings, updateExportRequest } = useWorkspace();
  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<TradeFilter>("NEW REQUEST");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrade, setSelectedTrade] = useState<ExportRequest | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const trades = await tradesService.listOrgTrades({
          role: "exporter",
          listingId: linkedListingId || undefined,
        });
        if (!cancelled) setExportRequests(trades.map(mapTradeToExportRequest));
      } catch (err) {
        if (!cancelled) {
          setExportRequests([]);
          toast.error(err instanceof Error ? err.message : "Could not load export trade requests.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [linkedListingId]);

  const handleUpdateRequest = (id: string, changes: Partial<ExportRequest>) => {
    setExportRequests((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
    updateExportRequest(id, changes);
  };

  const filterTabs: TradeFilter[] = [
    "NEW REQUEST",
    "NEGOTIATING",
    "PAYMENT PENDING",
    "READY TO SHIP",
    "IN TRANSIT",
    "DELIVERED",
    "DISPUTED",
    "SETTLED",
    "REJECTED",
    "ALL",
  ];

  const getFilterCount = (f: TradeFilter): number => {
    let list = exportRequests;
    if (linkedListingId) {
      list = list.filter((r) => r.listingId === linkedListingId);
    }
    if (f === "ALL") return list.length;
    return list.filter((r) => r.status === f).length;
  };

  const filteredTrades = useMemo(() => {
    return exportRequests.filter((req) => {
      if (linkedListingId && req.listingId !== linkedListingId) return false;
      if (filter !== "ALL" && req.status !== filter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBuyer = req.buyer.toLowerCase().includes(q);
        const matchProduct = req.product.toLowerCase().includes(q);
        const matchId = req.id.toLowerCase().includes(q);
        const matchCountry = req.country.toLowerCase().includes(q);
        if (!matchBuyer && !matchProduct && !matchId && !matchCountry) return false;
      }

      return true;
    });
  }, [exportRequests, filter, linkedListingId, searchQuery]);

  const activeListing = linkedListingId
    ? listings.find((l) => l.id === linkedListingId)
    : null;

  return (
    <AppShell maxWidth="full" hideRail={true}>
      <div className="w-full min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 selection:bg-emerald-100">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-widest text-emerald-700">
                <Workflow className="w-4 h-4 text-emerald-600" />
                <span>Exporter Lifecycle Management</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight mt-1">
                Export Trades
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Who wants to buy your products and full end-to-end commercial &amp; shipment lifecycle management.
              </p>
            </div>

            <Link
              to="/discover"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 font-semibold text-xs transition-colors shadow-sm"
            >
              <span>Back to Marketplace (My Listings)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Active Listing Filter Banner (if redirected from Marketplace "View Buyer Interest") */}
          {activeListing && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Filtering requests for listing:{" "}
                  <strong className="text-emerald-950 font-bold">{activeListing.title}</strong>{" "}
                  <span className="font-mono text-emerald-800">({activeListing.id})</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs transition-colors"
              >
                Clear Filter (Show All)
              </button>
            </div>
          )}

          {/* Search and Filter Tabs */}
          <div className="space-y-3">
            {/* Filter Tabs Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {filterTabs.map((f) => {
                const count = getFilterCount(f);
                const isActive = filter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer",
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
                    )}
                  >
                    <span>{FILTER_LABELS[f]}</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono",
                        isActive
                          ? "bg-white/20 text-white"
                          : count > 0
                          ? "bg-slate-100 text-slate-700"
                          : "text-slate-400"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input Bar */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search requests by buyer, product name, country, or request ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
              />
            </div>
          </div>

          {/* Vertical Stacked Cards (One by One) */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-200 border-dashed">
                Loading trade requests…
              </div>
            ) : filteredTrades.length > 0 ? (
              filteredTrades.map((trade) => {
                const originalTotal = trade.quantity * trade.originalPrice;
                const buyerTotal = trade.buyerProposedPrice
                  ? trade.quantity * trade.buyerProposedPrice
                  : undefined;
                const finalPrice =
                  trade.finalAgreedPrice ||
                  trade.exporterCounterPrice ||
                  trade.buyerProposedPrice ||
                  trade.originalPrice;
                const finalTotal = trade.quantity * finalPrice;

                return (
                  <div
                    key={trade.id}
                    onClick={() => setSelectedTrade(trade)}
                    className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-5 cursor-pointer group"
                  >
                    {/* Left: Buyer, Flag, Product & Route */}
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl shrink-0">{trade.flag}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors truncate">
                              {trade.buyer}
                            </h3>
                            <span className="text-[11px] font-mono text-slate-400">
                              {trade.id}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {trade.country} • Request Date: {trade.createdAt}
                          </p>
                        </div>
                      </div>

                      {/* Product & Terms Pill */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span className="truncate">{trade.product}</span>
                          <span className="font-mono text-emerald-700 shrink-0 ml-2">
                            {trade.quantity.toLocaleString()} {trade.unit}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-1">
                          <span>Route: {trade.origin} → {trade.destinationPort}</span>
                          <span className="font-semibold text-slate-700 font-mono">
                            {trade.incoterm} • {trade.paymentTerms}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Financials & Pricing Breakdown */}
                    <div className="md:w-72 shrink-0 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Original Listing:</span>
                        <span className="font-medium text-slate-700 font-mono">
                          ${trade.originalPrice.toLocaleString()} (${originalTotal.toLocaleString()})
                        </span>
                      </div>

                      {trade.buyerProposedPrice && (
                        <div className="flex items-center justify-between text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg">
                          <span className="font-medium">Buyer Proposed:</span>
                          <span className="font-bold font-mono">
                            ${trade.buyerProposedPrice.toLocaleString()} (${buyerTotal?.toLocaleString()})
                          </span>
                        </div>
                      )}

                      {trade.finalAgreedPrice && (
                        <div className="flex items-center justify-between text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded-lg">
                          <span className="font-bold">Agreed Trade Total:</span>
                          <span className="font-extrabold font-mono text-emerald-800 text-sm">
                            ${(trade.finalTradeValue || finalTotal).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Status Badge & Primary Action CTA */}
                    <div className="md:w-56 shrink-0 flex flex-col items-start md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <StatusBadge status={trade.status} />

                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        {(trade.status === "NEW REQUEST" || trade.status === "NEGOTIATING") && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateRequest(trade.id, { status: "REJECTED" });
                              toast.error(`Request ${trade.id} rejected.`);
                            }}
                            title="Reject Request"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200/80 transition-colors"
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        )}

                        <SpecularButton
                          variant={
                            trade.status === "PAYMENT PENDING"
                              ? "amber"
                              : trade.status === "DISPUTED"
                              ? "primary"
                              : "emerald"
                          }
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrade(trade);
                          }}
                          icon={<ChevronRight className="w-3.5 h-3.5" />}
                          iconPosition="right"
                        >
                          {trade.status === "NEW REQUEST"
                            ? "Review Request"
                            : trade.status === "NEGOTIATING"
                            ? "View Negotiation"
                            : trade.status === "PAYMENT PENDING"
                            ? "Confirm Payment"
                            : trade.status === "READY TO SHIP"
                            ? "Prepare Shipment"
                            : trade.status === "IN TRANSIT"
                            ? "Track Shipment"
                            : trade.status === "DELIVERED"
                            ? "Review Delivery"
                            : trade.status === "DISPUTED"
                            ? "Manage Dispute"
                            : "View Trade Record"}
                        </SpecularButton>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-200 border-dashed space-y-2">
                <p className="text-sm text-slate-600 font-semibold">
                  No export trades found for {FILTER_LABELS[filter]}.
                </p>
                <p className="text-xs text-slate-400">
                  {linkedListingId
                    ? "Try clearing the listing filter above to view all trades."
                    : "When buyers request quotes or buy from your marketplace listings, they will appear here."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Full Detail Drawer */}
        {selectedTrade && (
          <ExportTradeDetailDrawer
            trade={
              exportRequests.find((r) => r.id === selectedTrade.id) || selectedTrade
            }
            onClose={() => setSelectedTrade(null)}
            onUpdate={handleUpdateRequest}
          />
        )}
      </div>
    </AppShell>
  );
};

export default ExportTradesPage;
