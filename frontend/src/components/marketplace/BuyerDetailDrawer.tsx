import React from "react";
import { TopBuyer } from "@/data/mockTradeData";
import {
  X,
  Building2,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Coins,
  TrendingUp,
  Mail,
  User,
  Package,
  Calendar,
} from "lucide-react";
import SpecularButton from "@/components/ui/SpecularButton";

interface BuyerDetailDrawerProps {
  buyer: TopBuyer | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateTradeRequest: (buyer: TopBuyer) => void;
}

export const BuyerDetailDrawer: React.FC<BuyerDetailDrawerProps> = ({
  buyer,
  isOpen,
  onClose,
  onCreateTradeRequest,
}) => {
  if (!isOpen || !buyer) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0C121D] border-l border-white/[0.08] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between space-y-6">
          
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
                  {buyer.rank}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    {buyer.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{buyer.country} · {buyer.city}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score & Verification Pill */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-[#070A0E] border border-white/[0.06] space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Trust Score</div>
                <div className="text-xl font-display font-bold text-emerald-400">
                  {buyer.trustScore}/100
                </div>
                <div className="text-[10px] text-slate-500 font-mono">0 Trade Defaults</div>
              </div>

              <div className="p-3 rounded-xl bg-[#070A0E] border border-white/[0.06] space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Verification</div>
                <div className="text-sm font-semibold text-sky-300">
                  {buyer.verificationBadge}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">EVM Audited</div>
              </div>
            </div>

            {/* Procurement Demand Metrics */}
            <div className="p-4 rounded-xl bg-[#070A0E] border border-white/[0.06] space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Procurement Demand</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px] block">Active RFQs</span>
                  <span className="font-bold text-white font-mono">{buyer.activeRFQs} verified inquiries</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Annual Volume</span>
                  <span className="font-bold text-white font-mono">${(buyer.demandValueUSD / 1000000).toFixed(1)}M USD</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Min Order Size</span>
                  <span className="text-slate-300 font-mono">{buyer.minOrderQuantity || "50 MT"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Price Target</span>
                  <span className="text-emerald-400 font-mono">{buyer.targetPriceRange || "Market FOB"}</span>
                </div>
              </div>
            </div>

            {/* Accepted Commodities */}
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                <span>Primary Sourcing Categories</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {buyer.acceptedCommodities?.map((item) => (
                  <span
                    key={item}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-300"
                  >
                    {item}
                  </span>
                )) || (
                  <span className="text-xs text-slate-400">{buyer.primaryCategory}</span>
                )}
              </div>
            </div>

            {/* Certifications */}
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Compliance & Certifications</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {buyer.certifications?.map((cert) => (
                  <span
                    key={cert}
                    className="px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] font-mono flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{cert}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Contact / Desk details */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5 text-xs">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold">Authorized Desk</div>
              <div className="text-slate-300 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{buyer.contactPerson || "John Doe (Procurement Lead)"}</span>
              </div>
              <div className="text-slate-400 text-[11px] flex items-center gap-2 font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>{buyer.contactEmail || `desk@${buyer.name.toLowerCase().replace(/[^a-z]/g, "")}.com`}</span>
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="pt-4 border-t border-white/[0.06] space-y-2">
            <SpecularButton
              variant="emerald"
              size="md"
              radius={12}
              className="w-full justify-center"
              onClick={() => {
                onClose();
                onCreateTradeRequest(buyer);
              }}
            >
              Create Trade Request for {buyer.name} →
            </SpecularButton>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-center text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Back to Marketplace
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BuyerDetailDrawer;
