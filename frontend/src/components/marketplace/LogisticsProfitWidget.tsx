import React, { useEffect, useState } from "react";
import { aiService, ShippingETAResult, ProfitEstimateResult } from "@/services/api/aiService";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Ship, MapPin, Coins, ExternalLink, LocateFixed, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogisticsProfitWidgetProps {
  originPortHint?: string;
  fobUnitPriceUSD: number;
  quantityKg: number;
  /** Optional known destination — skips needing geolocation if the corridor is already fixed. */
  fallbackCountryIso3?: string;
}

const formatUSD = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const LogisticsProfitWidget: React.FC<LogisticsProfitWidgetProps> = ({
  originPortHint,
  fobUnitPriceUSD,
  quantityKg,
  fallbackCountryIso3,
}) => {
  const geo = useGeolocation();
  const [eta, setEta] = useState<ShippingETAResult | null>(null);
  const [profit, setProfit] = useState<ProfitEstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runEstimate = async (lat: number, lng: number, countryHint?: string) => {
    setLoading(true);
    setError(null);
    try {
      const etaResult = await aiService.getShippingETA(lat, lng, originPortHint, countryHint);
      setEta(etaResult);

      const resolvedCountry = etaResult.destination.countryIso3 || countryHint;
      if (resolvedCountry) {
        const profitResult = await aiService.getProfitEstimate(fobUnitPriceUSD, quantityKg, resolvedCountry);
        setProfit(profitResult);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to compute logistics/profit estimate.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (geo.status === "granted" && geo.lat !== null && geo.lng !== null) {
      runEstimate(geo.lat, geo.lng, fallbackCountryIso3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.lat, geo.lng]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] font-semibold flex items-center gap-2">
          <Ship className="w-4 h-4 text-sky-600" />
          Shipping ETA & Profit Estimate
        </h4>
        {geo.status !== "granted" && (
          <button
            onClick={geo.request}
            disabled={geo.status === "requesting"}
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-600 hover:text-sky-700 disabled:opacity-60"
          >
            {geo.status === "requesting" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5" />
            )}
            <span>Use My Live Location</span>
          </button>
        )}
      </div>

      {geo.status === "idle" && (
        <p className="text-xs text-[var(--text-secondary)] font-sans">
          Share your live location to get an evidence-backed delivery estimate and profit breakdown for this listing.
        </p>
      )}

      {(geo.status === "denied" || geo.status === "unavailable") && (
        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 font-sans flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{geo.error || "Location unavailable"} — estimate needs your coordinates; try again or check browser location permissions.</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
          <span>Computing route and cost estimate...</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-200 font-sans flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {eta && !loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Route</span>
              <strong className="text-[var(--text-primary)] text-sm flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {eta.originPort.name.split(",")[0]} → {eta.destination.portName?.split(",")[0] || "Your Location"}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Distance</span>
              <strong className="text-[var(--text-primary)] text-sm">{eta.distanceNm.toLocaleString()} nm</strong>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Est. Delivery Time</span>
              <strong className="text-sky-600 text-sm">
                {eta.estimatedTotalDaysRange[0]}–{eta.estimatedTotalDaysRange[1]} days
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Vessel Speed Assumed</span>
              <strong className="text-[var(--text-primary)] text-sm">{eta.assumedVesselSpeedKnots} kn</strong>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] font-sans leading-relaxed">{eta.methodology}</p>
          <div className="flex flex-wrap gap-2">
            {eta.sources.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono px-2 py-1 rounded bg-[var(--surface-3)] border border-[var(--hairline)] text-sky-600 hover:text-sky-700 flex items-center gap-1"
                title={s.claim}
              >
                {s.title}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
          </div>
        </div>
      )}

      {profit && !loading && (
        <div className="space-y-3 pt-3 border-t border-[var(--hairline)]">
          <h5 className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] font-semibold flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-600" />
            Estimated Profit for This Shipment
          </h5>
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Net Profit Remaining</span>
              <strong className="text-emerald-600 text-2xl font-mono">{formatUSD(profit.netProfitUSD)}</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Margin</span>
              <strong className="text-emerald-600 text-lg font-mono">{profit.netMarginPct}%</strong>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-[var(--surface-3)] border border-[var(--hairline)]">
              <span className="text-[var(--text-tertiary)] block">Revenue</span>
              <span className="text-[var(--text-primary)] font-bold">{formatUSD(profit.revenueUSD)}</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--surface-3)] border border-[var(--hairline)]">
              <span className="text-[var(--text-tertiary)] block">Ocean Freight</span>
              <span className="text-[var(--text-primary)] font-bold">-{formatUSD(profit.costs.oceanFreightUSD)}</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--surface-3)] border border-[var(--hairline)]">
              <span className="text-[var(--text-tertiary)] block">Origin Handling (est.)</span>
              <span className="text-[var(--text-primary)] font-bold">-{formatUSD(profit.costs.originHandlingUSD)}</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--surface-3)] border border-[var(--hairline)]">
              <span className="text-[var(--text-tertiary)] block">Marine Insurance (est.)</span>
              <span className="text-[var(--text-primary)] font-bold">-{formatUSD(profit.costs.marineInsuranceUSD)}</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--surface-3)] border border-[var(--hairline)]">
              <span className="text-[var(--text-tertiary)] block">GST (zero-rated export)</span>
              <span className="text-emerald-600 font-bold">$0</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--surface-3)] border border-[var(--hairline)]">
              <span className="text-[var(--text-tertiary)] block">Export Duty (default)</span>
              <span className="text-emerald-600 font-bold">$0</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-sky-950/20 border border-sky-500/20 text-[11px] font-sans text-sky-200 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-400" />
            <span>
              Not included above: RoDTEP rebate, potentially{" "}
              <strong>{formatUSD(profit.rodtepRebateRangeUSD[0])}–{formatUSD(profit.rodtepRebateRangeUSD[1])}</strong> —
              real rate is set per HS6 in DGFT Appendix 4R/4RE, confirm your product's rate before adding it.
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] font-mono">
            Origin handling and marine insurance are market-sourced estimates, not fixed rates — see docs/DATA_METHODOLOGY.md for every source.
          </p>
        </div>
      )}
    </div>
  );
};

export default LogisticsProfitWidget;
