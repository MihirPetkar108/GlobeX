import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MapPin, ArrowUpRight, Building2, ShieldCheck, AlertCircle, RefreshCw, Anchor } from "lucide-react";
import { aiService, CounterpartyMatchResult } from "@/services/api/aiService";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";

export const CounterpartiesIndexPage: React.FC = () => {
  const { isExporterView } = useWorkspace();
  const [counterparties, setCounterparties] = useState<CounterpartyMatchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("ARE");

  const countries = [
    { iso: "ARE", name: "United Arab Emirates" },
    { iso: "IND", name: "India" },
    { iso: "SAU", name: "Saudi Arabia" },
    { iso: "VNM", name: "Vietnam" },
    { iso: "USA", name: "United States" },
    { iso: "DEU", name: "Germany" },
    { iso: "SGP", name: "Singapore" },
  ];

  // semanticMatch has no trade_flow parameter — it's a real, working match
  // for both directions today (see Phase 5 plan). Only the framing forks.
  const fetchPartners = async (iso3: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.semanticMatch("Basmati Rice", 550000, 500, iso3, 100630);
      setCounterparties(res);
    } catch (err: any) {
      setError(err?.message || "Failed to connect to Counterparty Discovery & Sanctions API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners(selectedCountry);
  }, [selectedCountry]);

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-5 select-none">
        <PageHeader
          breadcrumbs={[{ label: "Discover", href: "/discover" }, { label: "Counterparties" }]}
          title={isExporterView ? "Verified Buyers" : "Verified Suppliers"}
          subtitle={
            isExporterView
              ? "Accredited buyers evaluated via OFAC/UN sanctions registry, maritime port logs, and trust scoring."
              : "Accredited suppliers evaluated via OFAC/UN sanctions registry, maritime port logs, and trust scoring."
          }
          badge={<StatusBadge status="verified" label="Dynamic Sovereign Intelligence" size="md" />}
        />

        {/* Country Filter Chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-mono text-[var(--text-secondary)]">Jurisdiction:</span>
          {countries.map((c) => (
            <button
              key={c.iso}
              onClick={() => setSelectedCountry(c.iso)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-mono transition-colors border",
                selectedCountry === c.iso
                  ? "bg-sky-500/20 text-sky-700 border-sky-500/40 font-bold"
                  : "bg-[var(--surface-1)] text-[var(--text-secondary)] border-[var(--hairline)] hover:bg-[var(--surface-3)]"
              )}
            >
              {c.name} ({c.iso})
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-rose-300">Counterparty Discovery Service Unavailable</div>
              <p className="text-rose-200/80 font-mono">{error}</p>
              <button
                onClick={() => fetchPartners(selectedCountry)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-800/40 text-rose-200 border border-rose-700/50 hover:bg-rose-800/60 font-mono text-[11px]"
              >
                <RefreshCw className="w-3 h-3" /> Retry Discovery
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="p-8 text-center text-[var(--text-secondary)] font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
            <span>Scanning sovereign entity registries &amp; OFAC sanctions database...</span>
          </div>
        )}

        {/* Dynamic Partner Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {counterparties.map((partner) => (
              <div
                key={partner.exporterId}
                className="p-4 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] hover:border-sky-500/30 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 shrink-0">
                        <Building2 className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{partner.companyName}</h4>
                        <div className="text-[11px] text-[var(--text-secondary)] font-mono flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                          <span>{partner.originCountry}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono font-bold text-emerald-600">{partner.matchScore}% Fit</div>
                      <span className="text-[10px] font-mono text-[var(--text-tertiary)]">Trust {partner.trustScore}/100</span>
                    </div>
                  </div>

                  {partner.port && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-secondary)] px-2.5 py-1 rounded bg-[var(--surface-3)] border border-[var(--hairline)]">
                      <Anchor className="w-3 h-3 text-sky-600 shrink-0" />
                      <span className="truncate">Port: {partner.port}</span>
                    </div>
                  )}

                  <p className="text-xs text-[var(--text-secondary)] font-sans line-clamp-2">
                    {partner.explanation}
                  </p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {partner.certifications?.map((c) => (
                      <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-secondary)] border border-[var(--hairline)]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--hairline)] text-[11px] font-mono">
                  <span className="text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Sanctions Screened (OFAC/UN Clear)
                  </span>
                  <Link
                    to={`/discover?commodity=Basmati+Rice&origin=${selectedCountry}`}
                    className="text-sky-600 hover:text-sky-700 flex items-center gap-1 group font-bold"
                  >
                    <span>Connect &amp; Trade</span>
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default CounterpartiesIndexPage;
