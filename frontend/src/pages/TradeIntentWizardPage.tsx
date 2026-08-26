import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import SpecularButton from "@/components/ui/SpecularButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  ArrowRight,
  Info,
  X,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RequestStatus = "New" | "Under Review" | "Quoted" | "Accepted" | "Rejected" | "Expired";

interface InboundTradeRequest {
  id: string;
  buyerName: string;
  buyerCountry: string;
  buyerCity: string;
  productName: string;
  hsCode: string;
  quantityMT: number;
  targetPriceUSD: number;
  totalValueUSD: number;
  route: string;
  incoterm: string;
  status: RequestStatus;
  receivedAge: string;
  complianceCertifications: string[];
  escrowToken: string;
}

const DEMO_INBOUND_REQUESTS_DATA: InboundTradeRequest[] = [
  {
    id: "RFQ-2026-8801",
    buyerName: "Example Global Trading Ltd.",
    buyerCountry: "UAE",
    buyerCity: "Dubai",
    productName: "1121 Steam Extra Long Grain Basmati Rice",
    hsCode: "1006.30.20",
    quantityMT: 500,
    targetPriceUSD: 1100,
    totalValueUSD: 550000,
    route: "Mumbai (JNPT) ➔ Dubai (Jebel Ali)",
    incoterm: "CIF",
    status: "Under Review",
    receivedAge: "2 hours ago",
    complianceCertifications: ["APEDA", "FSSAI", "ISO 22000", "Halal"],
    escrowToken: "USDC",
  },
  {
    id: "RFQ-2026-8802",
    buyerName: "Red Sea Food Merchants Co.",
    buyerCountry: "Saudi Arabia",
    buyerCity: "Jeddah",
    productName: "Sugandha White Sella Basmati Rice",
    hsCode: "1006.30.20",
    quantityMT: 200,
    targetPriceUSD: 940,
    totalValueUSD: 188000,
    route: "Mumbai (JNPT) ➔ Jeddah Islamic Port",
    incoterm: "CIF",
    status: "New",
    receivedAge: "5 hours ago",
    complianceCertifications: ["Phytosanitary", "SASO", "Halal"],
    escrowToken: "USDC",
  },
  {
    id: "RFQ-2026-8803",
    buyerName: "Bremen Grain Processing B.V.",
    buyerCountry: "Germany",
    buyerCity: "Bremen",
    productName: "Organic Durum Wheat Grain Milling Grade",
    hsCode: "1001.19.00",
    quantityMT: 300,
    targetPriceUSD: 360,
    totalValueUSD: 108000,
    route: "Kandla (INIXY) ➔ Hamburg Port",
    incoterm: "CIF",
    status: "Quoted",
    receivedAge: "1 day ago",
    complianceCertifications: ["EU Organic", "Non-GMO", "USDA Organic"],
    escrowToken: "USDC",
  },
  {
    id: "RFQ-2026-8804",
    buyerName: "Gruppo Albini Milano SpA",
    buyerCountry: "Italy",
    buyerCity: "Milan",
    productName: "Combed Organic Cotton Yarn Ne 30s",
    hsCode: "5205.23.00",
    quantityMT: 80,
    targetPriceUSD: 4200,
    totalValueUSD: 336000,
    route: "Surat ➔ Genoa Port",
    incoterm: "FOB",
    status: "Accepted",
    receivedAge: "3 days ago",
    complianceCertifications: ["GOTS Organic", "OEKO-TEX 100"],
    escrowToken: "USDC",
  },
];

export const TradeIntentWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useWorkspace();
  const [requests, setRequests] = useState<InboundTradeRequest[]>(DEMO_INBOUND_REQUESTS_DATA);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedReviewRfq, setSelectedReviewRfq] = useState<InboundTradeRequest | null>(null);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "All") return true;
    return r.status === statusFilter;
  });

  const handleStatusChange = (id: string, newStatus: RequestStatus) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    if (selectedReviewRfq?.id === id) {
      setSelectedReviewRfq((prev) => prev ? { ...prev, status: newStatus } : null);
    }

    // NOTE: there is no RFQ persistence backend yet — this only mutates
    // local React state. Feedback below must not imply durable storage.
    const feedbackByStatus: Partial<Record<RequestStatus, string>> = {
      Accepted: "Request accepted (not yet saved — demo mode, local only)",
      Rejected: "Request declined (not yet saved — demo mode, local only)",
      Quoted: "Quotation recorded (not yet saved — demo mode, local only)",
    };
    const message = feedbackByStatus[newStatus];
    if (message) {
      toast(message);
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "New":
        return <span className="px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-400 border border-cyan-800/60 text-[10px] font-mono font-bold">New</span>;
      case "Under Review":
        return <span className="px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-400 border border-amber-800/60 text-[10px] font-mono font-bold">Under Review</span>;
      case "Quoted":
        return <span className="px-2 py-0.5 rounded-full bg-sky-950/70 text-sky-400 border border-sky-800/60 text-[10px] font-mono font-bold">Quoted</span>;
      case "Accepted":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 text-[10px] font-mono font-bold">Accepted</span>;
      case "Rejected":
        return <span className="px-2 py-0.5 rounded-full bg-rose-950/70 text-rose-400 border border-rose-800/60 text-[10px] font-mono font-bold">Rejected</span>;
      case "Expired":
        return <span className="px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700 text-[10px] font-mono">Expired</span>;
    }
  };

  return (
    <AppShell maxWidth="full" className="space-y-6">
      {/* ── Page Header: Strict Received-Only Semantics ───────────────── */}
      <PageHeader
        title="Trade Requests"
        subtitle="Review trade requests received by your organization."
        badge={
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{requests.filter((r) => r.status === "New" || r.status === "Under Review").length} Inbound Requests Pending</span>
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            <Link to="/marketplace">
              <SpecularButton
                variant="outline"
                size="sm"
                radius={10}
              >
                Explore Marketplace →
              </SpecularButton>
            </Link>
          </div>
        }
      />

      {/* ── Demo Data Notice ─────────────────────────────────────────── */}
      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center gap-2 text-amber-300 text-[11px] font-mono">
        <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50 font-bold shrink-0">
          DEMO DATA — NOT LIVE
        </span>
        <span>
          These inbound requests are illustrative sample data — not yet connected to a real RFQ backend. Accept/decline actions here only update this screen and are not persisted.
        </span>
      </div>

      {/* ── Status Filters Row (Quiet, clean horizontal control) ───────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["All", "New", "Under Review", "Quoted", "Accepted", "Rejected"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-mono transition-colors cursor-pointer",
                statusFilter === status
                  ? "bg-[var(--bg-surface-subtle)] text-[var(--text-primary)] font-semibold border border-[var(--border-default)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]"
              )}
            >
              {status}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
          Showing {filteredRequests.length} received inquiries
        </span>
      </div>

      {/* ── Minimal Level A Received Request List ───────────────────────── */}
      <div className="space-y-3">
        {filteredRequests.map((rfq) => (
          <div
            key={rfq.id}
            className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors space-y-3 font-sans select-none shadow-sm"
          >
            {/* Top Row: Buyer, Product, Value */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-xs text-[var(--text-primary)]">
                    {rfq.buyerName}
                  </h4>
                  <span className="text-[var(--text-tertiary)] text-xs">·</span>
                  <span className="text-[var(--text-secondary)] text-xs">{rfq.buyerCity}, {rfq.buyerCountry}</span>
                </div>

                <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">
                  {rfq.quantityMT.toLocaleString()} MT · {rfq.productName}
                </h3>

                <div className="text-xs text-[var(--text-secondary)] font-mono">
                  {rfq.route}
                </div>
              </div>

              {/* Right: Value */}
              <div className="text-left sm:text-right shrink-0">
                <div className="text-base font-mono font-bold text-[var(--brand-teal)]">
                  ${rfq.totalValueUSD.toLocaleString()} USD
                </div>
                <div className="text-[11px] font-mono text-[var(--text-tertiary)]">
                  ${rfq.targetPriceUSD.toLocaleString()} / MT
                </div>
              </div>
            </div>

            {/* Bottom Row: Status, Info Popover (Level B), Review Action (Level A) */}
            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                {getStatusBadge(rfq.status)}

                {/* Level B Info Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 cursor-pointer"
                      aria-label="Request details summary"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    className="w-64 p-3 bg-[#0C121D] border border-white/[0.1] text-xs space-y-1.5 text-slate-300 shadow-xl rounded-xl"
                  >
                    <div className="font-display font-semibold text-white text-xs border-b border-white/[0.06] pb-1">
                      {rfq.id} · {rfq.incoterm}
                    </div>
                    <div className="text-[11px] font-mono space-y-1 text-slate-300">
                      <div>Received: <span className="text-white">{rfq.receivedAge}</span></div>
                      <div>Escrow Token: <span className="text-emerald-400">{rfq.escrowToken}</span></div>
                      <div>HS Code: <span className="text-sky-300">{rfq.hsCode}</span></div>
                      <div>Certifications: <span className="text-slate-300">{rfq.complianceCertifications.join(", ")}</span></div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReviewRfq(rfq)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <span>Review Request</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Slide-Over Review Request Drawer (Level C Information Escape Valve) ── */}
      {selectedReviewRfq && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none font-sans">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedReviewRfq(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#0C121D] border-l border-white/[0.08] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between space-y-6">
              
              {/* Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">{selectedReviewRfq.id}</span>
                      {getStatusBadge(selectedReviewRfq.status)}
                    </div>
                    <h3 className="font-display font-bold text-base text-white mt-1">
                      {selectedReviewRfq.buyerName}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedReviewRfq(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    aria-label="Close drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sourced Product Summary */}
                <div className="p-4 rounded-xl bg-[#070A0E] border border-white/[0.06] space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Requested Commodity
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {selectedReviewRfq.productName}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                    <div>Quantity: <strong className="text-white font-mono">{selectedReviewRfq.quantityMT.toLocaleString()} MT</strong></div>
                    <div>Target Price: <strong className="text-emerald-400 font-mono">${selectedReviewRfq.targetPriceUSD.toLocaleString()} / MT</strong></div>
                    <div>Total Value: <strong className="text-white font-mono">${selectedReviewRfq.totalValueUSD.toLocaleString()}</strong></div>
                    <div>Incoterm: <strong className="text-sky-300 font-mono">{selectedReviewRfq.incoterm}</strong></div>
                  </div>
                </div>

                {/* Logistics Route */}
                <div className="p-3.5 rounded-xl bg-[#070A0E] border border-white/[0.06] space-y-1.5 text-xs">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Corridor</div>
                  <div className="text-white font-mono">{selectedReviewRfq.route}</div>
                  <div className="text-slate-500 text-[11px]">Received {selectedReviewRfq.receivedAge}</div>
                </div>

                {/* Compliance & Escrow */}
                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Required Certifications
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedReviewRfq.complianceCertifications.map((cert) => (
                      <span
                        key={cert}
                        className="px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-mono flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{cert}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/[0.06] space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedReviewRfq.id, "Accepted")}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors cursor-pointer"
                  >
                    Accept Request (Demo)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedReviewRfq.id, "Quoted")}
                    className="py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Submit Quotation
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedReviewRfq.id, "Rejected")}
                  className="w-full py-2 text-center text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Decline Inquiry
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default TradeIntentWizardPage;
