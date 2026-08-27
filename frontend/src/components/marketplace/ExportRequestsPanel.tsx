import React, { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  ExportRequest,
  ExportRequestStatus,
  ExportNegotiationOffer,
} from "@/data/exportRequests";
import { DetailDrawer } from "@/components/common/DetailDrawer";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SpecularButton } from "@/components/ui/SpecularButton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Eye,
  MessageSquare,
  Ship,
  X,
  Check,
  Building2,
  DollarSign,
  Package,
  Calendar,
  ShieldCheck,
  FileText,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type Filter =
  | "NEW REQUEST"
  | "UNDER REVIEW"
  | "NEGOTIATING"
  | "ACCEPTED"
  | "REJECTED"
  | "DOCUMENTS REQUIRED"
  | "READY TO SHIP"
  | "ALL";

const FILTER_LABELS: Record<Filter, string> = {
  "NEW REQUEST": "New Requests",
  "UNDER REVIEW": "Under Review",
  "NEGOTIATING": "Negotiating",
  "ACCEPTED": "Accepted",
  "REJECTED": "Rejected",
  "DOCUMENTS REQUIRED": "Documents Required",
  "READY TO SHIP": "Ready to Ship",
  "ALL": "All Requests",
};

const total = (request: ExportRequest, price?: number): number => {
  if (price === undefined || isNaN(price)) return 0;
  return request.quantity * price;
};

const cardActionLabel = (status: ExportRequestStatus): string => {
  switch (status) {
    case "NEW REQUEST":
      return "Review Request";
    case "NEGOTIATING":
      return "View Negotiation";
    case "ACCEPTED":
      return "View Trade";
    case "COMPLIANCE REVIEW":
      return "View Compliance";
    case "DOCUMENTS REQUIRED":
      return "Complete Documents";
    case "READY TO SHIP":
      return "Prepare Shipment";
    case "IN TRANSIT":
      return "Track Shipment";
    case "DELIVERED":
      return "View Delivery";
    case "SETTLED":
      return "View Settlement";
    case "REJECTED":
      return "View History";
    default:
      return "View Details";
  }
};

const getStatusIcon = (status: ExportRequestStatus) => {
  switch (status) {
    case "NEGOTIATING":
      return <MessageSquare className="w-4 h-4" />;
    case "READY TO SHIP":
    case "IN TRANSIT":
      return <Ship className="w-4 h-4" />;
    default:
      return <Eye className="w-4 h-4" />;
  }
};

interface ExportRequestDetailProps {
  request: ExportRequest;
  onClose: () => void;
  onUpdate: (requestId: string, changes: Partial<ExportRequest>) => void;
}

const ExportRequestDetail: React.FC<ExportRequestDetailProps> = ({
  request,
  onClose,
  onUpdate,
}) => {
  const [isCountering, setIsCountering] = useState(false);
  const [counterPrice, setCounterPrice] = useState<string>(
    request.exporterCounterPrice?.toString() ||
      request.buyerProposedPrice?.toString() ||
      request.originalPrice.toString()
  );
  const [counterQty, setCounterQty] = useState<string>(
    request.quantity.toString()
  );

  const originalTotal = total(request, request.originalPrice);
  const buyerTotal = request.buyerProposedPrice
    ? total(request, request.buyerProposedPrice)
    : undefined;
  const counterTotal = request.exporterCounterPrice
    ? total(request, request.exporterCounterPrice)
    : undefined;
  const agreedTotal = request.finalAgreedPrice
    ? total(request, request.finalAgreedPrice)
    : undefined;

  // History offers list
  const history: ExportNegotiationOffer[] = request.negotiationHistory || [
    ...(request.buyerProposedPrice
      ? [
          {
            role: "Buyer" as const,
            price: request.buyerProposedPrice,
            quantity: request.quantity,
            time: "Initial Proposal",
          },
        ]
      : []),
    ...(request.exporterCounterPrice
      ? [
          {
            role: "Exporter" as const,
            price: request.exporterCounterPrice,
            quantity: request.quantity,
            time: "Latest Counter",
          },
        ]
      : []),
  ];

  const handleAccept = (agreedPrice: number) => {
    onUpdate(request.id, {
      status: "ACCEPTED",
      finalAgreedPrice: agreedPrice,
    });
    toast.success(`Trade request accepted at $${agreedPrice.toLocaleString()}/${request.unit}!`);
    onClose();
  };

  const handleReject = () => {
    onUpdate(request.id, {
      status: "REJECTED",
    });
    toast.error("Buyer request rejected.");
    onClose();
  };

  const handleSubmitCounter = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(counterPrice);
    const qtyNum = parseFloat(counterQty);
    if (isNaN(priceNum) || priceNum <= 0 || isNaN(qtyNum) || qtyNum <= 0) {
      toast.error("Please enter a valid price and quantity.");
      return;
    }

    const nowStr = `Today, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const newOffer: ExportNegotiationOffer = {
      role: "Exporter",
      price: priceNum,
      quantity: qtyNum,
      time: nowStr,
    };

    const updatedHistory = [...(request.negotiationHistory || history), newOffer];

    onUpdate(request.id, {
      status: "NEGOTIATING",
      exporterCounterPrice: priceNum,
      quantity: qtyNum,
      negotiationHistory: updatedHistory,
    });

    setIsCountering(false);
    toast.success(`Counter offer of $${priceNum.toLocaleString()} submitted to buyer.`);
  };

  return (
    <DetailDrawer
      isOpen={true}
      onClose={onClose}
      title={request.product}
      subtitle={`Request ${request.id} • ${request.buyer} (${request.country})`}
      badge={<StatusBadge status={request.status} />}
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
            {/* Contextual actions based on status */}
            {request.status === "NEW REQUEST" && (
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
                  <span>{request.buyerProposedPrice ? "Counter Offer" : "Negotiate"}</span>
                </button>

                <SpecularButton
                  variant="emerald"
                  size="sm"
                  onClick={() =>
                    handleAccept(request.buyerProposedPrice || request.originalPrice)
                  }
                  icon={<Check className="w-4 h-4 stroke-[2.5]" />}
                  iconPosition="left"
                >
                  {request.buyerProposedPrice
                    ? `Accept Buyer's Price ($${request.buyerProposedPrice.toLocaleString()})`
                    : "Accept Request"}
                </SpecularButton>
              </>
            )}

            {request.status === "NEGOTIATING" && (
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
                    handleAccept(
                      request.buyerProposedPrice ||
                        request.exporterCounterPrice ||
                        request.originalPrice
                    )
                  }
                  icon={<Check className="w-4 h-4 stroke-[2.5]" />}
                  iconPosition="left"
                >
                  Accept Current Offer
                </SpecularButton>
              </>
            )}

            {request.status === "ACCEPTED" && (
              <SpecularButton
                variant="primary"
                size="sm"
                onClick={() => {
                  toast.info("Navigating to trade compliance & contract generation.");
                  onClose();
                }}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Start Compliance
              </SpecularButton>
            )}

            {request.status === "COMPLIANCE REVIEW" && (
              <SpecularButton
                variant="primary"
                size="sm"
                onClick={() => toast.info("Opening compliance documentation workspace.")}
              >
                View Compliance
              </SpecularButton>
            )}

            {request.status === "DOCUMENTS REQUIRED" && (
              <SpecularButton
                variant="primary"
                size="sm"
                onClick={() => toast.info("Opening export document upload workspace.")}
              >
                Complete Documents
              </SpecularButton>
            )}

            {request.status === "READY TO SHIP" && (
              <SpecularButton
                variant="primary"
                size="sm"
                onClick={() => toast.info("Opening shipment booking & customs clearance dispatch.")}
              >
                Prepare Shipment
              </SpecularButton>
            )}

            {request.status === "IN TRANSIT" && (
              <SpecularButton
                variant="primary"
                size="sm"
                onClick={() => toast.info("Tracking container telemetry & bill of lading status.")}
              >
                Track Shipment
              </SpecularButton>
            )}

            {request.status === "DELIVERED" && (
              <SpecularButton
                variant="primary"
                size="sm"
                onClick={() => toast.info("Viewing delivery receipt & port inspection sign-off.")}
              >
                View Delivery
              </SpecularButton>
            )}

            {request.status === "SETTLED" && (
              <SpecularButton
                variant="emerald"
                size="sm"
                onClick={() => toast.info("Viewing escrow release & banking settlement proof.")}
              >
                View Settlement
              </SpecularButton>
            )}

            {request.status === "REJECTED" && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Close History
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-slate-800">
        {/* Buyer Overview Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{request.flag}</span>
              <div>
                <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  {request.buyer}
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    KYB Verified
                  </span>
                </h4>
                <p className="text-xs text-slate-500">{request.country} • Buyer trade request</p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400">{request.id}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-xs">
            <div>
              <span className="text-slate-400 block">Counterparty Risk</span>
              <span className="font-medium text-slate-700">{request.buyerRisk}</span>
            </div>
            <div>
              <span className="text-slate-400 block">HS Code</span>
              <span className="font-mono font-medium text-slate-700">{request.hsCode}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Category</span>
              <span className="font-medium text-slate-700">{request.category}</span>
            </div>
          </div>
        </div>

        {/* Counter Form (if active) */}
        {isCountering && (
          <form
            onSubmit={handleSubmitCounter}
            className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
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
                  Counter Unit Price ($ / {request.unit})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">$</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Enter counter unit price"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Quantity ({request.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={counterQty}
                  onChange={(e) => setCounterQty(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Enter quantity"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-emerald-900 font-medium">
                New Total Value: $
                {((parseFloat(counterPrice) || 0) * (parseFloat(counterQty) || 0)).toLocaleString()}
              </span>
              <SpecularButton variant="emerald" size="xs" type="submit">
                Send Counter to Buyer
              </SpecularButton>
            </div>
          </form>
        )}

        {/* Pricing Breakdown Grid */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Export Pricing Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] text-slate-400 block font-medium">Original Price</span>
              <span className="text-sm font-bold text-slate-800">
                ${request.originalPrice.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Total: ${originalTotal.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] text-slate-400 block font-medium">Requested Qty</span>
              <span className="text-sm font-bold text-slate-800">
                {request.quantity.toLocaleString()} {request.unit}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                HS {request.hsCode}
              </span>
            </div>

            {request.buyerProposedPrice ? (
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <span className="text-[11px] text-amber-700 block font-medium">
                  Buyer Proposal
                </span>
                <span className="text-sm font-bold text-amber-900">
                  ${request.buyerProposedPrice.toLocaleString()}
                </span>
                <span className="text-[10px] text-amber-700 block mt-0.5">
                  Total: ${buyerTotal?.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[11px] text-slate-400 block font-medium">Buyer Proposal</span>
                <span className="text-sm font-medium text-slate-400">None (At List)</span>
              </div>
            )}

            {request.finalAgreedPrice ? (
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[11px] text-emerald-700 block font-medium">Agreed Price</span>
                <span className="text-sm font-bold text-emerald-900">
                  ${request.finalAgreedPrice.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  Total: ${agreedTotal?.toLocaleString()}
                </span>
              </div>
            ) : request.exporterCounterPrice ? (
              <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200">
                <span className="text-[11px] text-sky-700 block font-medium">Your Counter</span>
                <span className="text-sm font-bold text-sky-900">
                  ${request.exporterCounterPrice.toLocaleString()}
                </span>
                <span className="text-[10px] text-sky-700 block mt-0.5">
                  Total: ${counterTotal?.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[11px] text-slate-400 block font-medium">Counter Price</span>
                <span className="text-sm font-medium text-slate-400">None</span>
              </div>
            )}
          </div>
        </div>

        {/* Trade Logistics & Terms */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Logistics &amp; Settlement Terms
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Origin Port:</span>
                <span className="font-medium text-slate-800">{request.origin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Destination:</span>
                <span className="font-medium text-slate-800">{request.destinationPort}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Transit:</span>
                <span className="font-medium text-slate-800">{request.transit}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Incoterm:</span>
                <span className="font-bold text-slate-800">{request.incoterm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Terms:</span>
                <span className="font-medium text-slate-800">{request.paymentTerms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Escrow Security:</span>
                <span className="font-medium text-emerald-700">{request.escrowStatus}</span>
              </div>
            </div>
          </div>
          {request.requiredLicenses && (
            <div className="p-2.5 rounded-xl bg-slate-100/70 text-slate-600 text-[11px] flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Required Licenses &amp; Certificates: {request.requiredLicenses}</span>
            </div>
          )}
        </div>

        {/* Negotiation History Thread */}
        {history.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Negotiation History
              </h4>
              {request.status === "NEGOTIATING" && (
                <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Awaiting buyer response
                </span>
              )}
            </div>

            <div className="space-y-2">
              {history.map((offer, idx) => {
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
                    <div className="flex items-center gap-2.5">
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
                      <div>
                        <span className="font-bold text-slate-900 text-sm">
                          ${offer.price.toLocaleString()}
                        </span>
                        <span className="text-slate-500 text-[11px] ml-1">
                          / {request.unit} • {offer.quantity.toLocaleString()} {request.unit}
                        </span>
                      </div>
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

export const ExportRequestsPanel: React.FC = () => {
  const { exportRequests, updateExportRequest } = useWorkspace();
  const [filter, setFilter] = useState<Filter>("NEW REQUEST");
  const [selectedRequest, setSelectedRequest] = useState<ExportRequest | null>(null);

  const filterTabs: Filter[] = [
    "NEW REQUEST",
    "UNDER REVIEW",
    "NEGOTIATING",
    "ACCEPTED",
    "REJECTED",
    "DOCUMENTS REQUIRED",
    "READY TO SHIP",
    "ALL",
  ];

  const getFilterCount = (f: Filter): number => {
    if (f === "ALL") return exportRequests.length;
    return exportRequests.filter((r) => r.status === f).length;
  };

  const filteredRequests = exportRequests.filter(
    (request) => filter === "ALL" || request.status === filter
  );

  const handleQuickReject = (e: React.MouseEvent, req: ExportRequest) => {
    e.stopPropagation();
    updateExportRequest(req.id, { status: "REJECTED" });
    toast.error(`Request ${req.id} rejected.`);
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
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

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => {
            const originalTradeTotal = total(request, request.originalPrice);
            const buyerTradeTotal = request.buyerProposedPrice
              ? total(request, request.buyerProposedPrice)
              : undefined;
            const counterTradeTotal = request.exporterCounterPrice
              ? total(request, request.exporterCounterPrice)
              : undefined;

            return (
              <div
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group"
              >
                <div className="space-y-4">
                  {/* Top: Buyer & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{request.flag}</span>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                          {request.buyer}
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">
                          {request.country} • Buyer trade request
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>

                  {/* Product & Qty */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span className="truncate">{request.product}</span>
                      <span className="font-mono text-slate-500 shrink-0">
                        {request.quantity.toLocaleString()} {request.unit}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>HS {request.hsCode}</span>
                      <span>{request.incoterm} • {request.origin}</span>
                    </div>
                  </div>

                  {/* Pricing Overview */}
                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Original Listing:</span>
                      <span className="font-medium text-slate-700 font-mono">
                        ${request.originalPrice.toLocaleString()} ($
                        {originalTradeTotal.toLocaleString()})
                      </span>
                    </div>

                    {request.buyerProposedPrice && (
                      <div className="flex items-center justify-between text-amber-800 bg-amber-50/70 px-2 py-1 rounded-lg">
                        <span className="font-medium">Buyer Proposed:</span>
                        <span className="font-bold font-mono">
                          ${request.buyerProposedPrice.toLocaleString()} ($
                          {buyerTradeTotal?.toLocaleString()})
                        </span>
                      </div>
                    )}

                    {request.exporterCounterPrice && (
                      <div className="flex items-center justify-between text-sky-800 bg-sky-50/70 px-2 py-1 rounded-lg">
                        <span className="font-medium">Your Counter:</span>
                        <span className="font-bold font-mono">
                          ${request.exporterCounterPrice.toLocaleString()} ($
                          {counterTradeTotal?.toLocaleString()})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400 truncate">
                    {request.id}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {(request.status === "NEW REQUEST" ||
                      request.status === "NEGOTIATING") && (
                      <button
                        type="button"
                        onClick={(e) => handleQuickReject(e, request)}
                        title="Reject Request"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200/80 transition-colors"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    )}

                    <SpecularButton
                      variant={request.status === "NEGOTIATING" ? "amber" : "emerald"}
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRequest(request);
                      }}
                      icon={getStatusIcon(request.status)}
                      iconPosition="left"
                    >
                      {cardActionLabel(request.status)}
                    </SpecularButton>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-100 border-dashed">
            No export requests found for {FILTER_LABELS[filter]}.
          </div>
        )}
      </div>

      {/* Selected Request Detail Drawer */}
      {selectedRequest && (
        <ExportRequestDetail
          request={
            exportRequests.find((r) => r.id === selectedRequest.id) || selectedRequest
          }
          onClose={() => setSelectedRequest(null)}
          onUpdate={updateExportRequest}
        />
      )}
    </div>
  );
};

export default ExportRequestsPanel;
