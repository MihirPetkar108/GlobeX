import React from "react";
import { Building2, ShieldCheck, Clock, Coins, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradeSummaryProps {
  exporterName: string;
  exporterCountry?: string;
  importerName: string;
  importerCountry?: string;
  valueUSD: number | string;
  eta: string;
  paymentStatus?: string;
  quantity?: string | number;
  className?: string;
}

export const TradeSummary: React.FC<TradeSummaryProps> = ({
  exporterName,
  exporterCountry = "India",
  importerName,
  importerCountry = "UAE",
  valueUSD,
  eta,
  paymentStatus = "Escrow Protected",
  quantity,
  className,
}) => {
  const formattedValue =
    typeof valueUSD === "number" ? `$${valueUSD.toLocaleString()} USD` : valueUSD;

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-2xl bg-[#0B1019] border border-white/[0.08] shadow-sm select-none",
        className
      )}
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-sans divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
        {/* Exporter */}
        <div className="space-y-1 pr-2">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            Exporter
          </span>
          <div className="font-semibold text-white truncate">{exporterName}</div>
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{exporterCountry}</span>
          </span>
        </div>

        {/* Importer */}
        <div className="space-y-1 pt-3 md:pt-0 md:px-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            Importer
          </span>
          <div className="font-semibold text-white truncate">{importerName}</div>
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
            <span>{importerCountry}</span>
          </span>
        </div>

        {/* Trade Value */}
        <div className="space-y-1 pt-3 md:pt-0 md:px-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            Contract Value
          </span>
          <div className="font-mono text-base font-bold text-white leading-tight">
            {formattedValue}
          </div>
          {quantity && (
            <span className="text-[11px] text-slate-400 font-mono block">
              Qty: {quantity}
            </span>
          )}
        </div>

        {/* ETA */}
        <div className="space-y-1 pt-3 md:pt-0 md:px-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            Estimated Arrival
          </span>
          <div className="font-semibold text-emerald-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{eta}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono block">
            Port of Jebel Ali
          </span>
        </div>

        {/* Payment Security */}
        <div className="space-y-1 pt-3 md:pt-0 md:pl-3 col-span-2 md:col-span-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            Payment Status
          </span>
          <div className="font-semibold text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{paymentStatus}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono block">
            Multi-sig Smart Vault
          </span>
        </div>
      </div>
    </div>
  );
};

export default TradeSummary;
