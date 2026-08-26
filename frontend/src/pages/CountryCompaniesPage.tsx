import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { aiService, CompanyDirectoryEntry } from "@/services/api/aiService";
import { Building2, TrendingUp, MapPin, ArrowUpRight, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const formatUSD = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return "N/A";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
};

const CompanyRow: React.FC<{ rank: number; company: CompanyDirectoryEntry }> = ({ rank, company }) => (
  <Link
    to={`/companies/detail/${company.companyId}`}
    target="_blank"
    rel="noopener noreferrer"
    className="group relative rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] hover:border-sky-500/40 p-5 transition-all duration-200 hover:shadow-xl hover:shadow-sky-500/5 flex flex-col justify-between space-y-3.5"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[var(--surface-3)] border border-[var(--hairline)] flex items-center justify-center font-mono font-bold text-xs text-[var(--text-secondary)] shrink-0">
          #{String(rank).padStart(2, "0")}
        </div>
        <div className="min-w-0">
          <h4 className="font-display font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-sky-300 transition-colors truncate">
            {company.displayName}
          </h4>
          <p className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5 truncate">
            {company.industry || company.sector || "Diversified"}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="px-2.5 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{formatUSD(company.marketCapUSD)}</span>
        </div>
        <span className="text-[10px] text-[var(--text-tertiary)] font-mono mt-1 block">Market Cap</span>
      </div>
    </div>

    {company.businessSummary && (
      <p className="text-xs text-[var(--text-secondary)] font-sans line-clamp-2 leading-relaxed">
        {company.businessSummary}
      </p>
    )}

    <div className="flex items-center justify-between pt-2 border-t border-[var(--hairline)] text-[11px] font-mono">
      <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
        <MapPin className="w-3.5 h-3.5" />
        {company.country}
      </span>
      <span className="text-sky-600 group-hover:text-sky-700 flex items-center gap-1 font-bold">
        <span>Contact & Details</span>
        <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </span>
    </div>
  </Link>
);

export const CountryCompaniesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const country = searchParams.get("country") || "USA";
  const countryName = searchParams.get("countryName") || country;
  const commodity = searchParams.get("commodity") || "";

  const [companies, setCompanies] = useState<CompanyDirectoryEntry[]>([]);
  const [industryFilterApplied, setIndustryFilterApplied] = useState(false);
  const [matchedIndustries, setMatchedIndustries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.getTopCompaniesByCountry(country, commodity, 10);
      setCompanies(res.companies);
      setIndustryFilterApplied(res.industryFilterApplied);
      setMatchedIndustries(res.matchedIndustries);
    } catch (err: any) {
      setError(err?.message || "Failed to load company directory.");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, commodity]);

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-5 select-none">
        <PageHeader
          breadcrumbs={[{ label: "Discover", href: "/discover" }, { label: `Companies · ${countryName}` }]}
          title={`Top Companies in ${countryName}`}
          subtitle={
            commodity
              ? `Ranked by market capitalisation, narrowed to companies most likely to buy ${commodity}.`
              : "Ranked by market capitalisation."
          }
          badge={<StatusBadge status="verified" label="Yahoo Finance Valuation Dataset" size="md" />}
        />

        {industryFilterApplied && matchedIndustries.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-mono text-[var(--text-secondary)]">Matched industries:</span>
            {matchedIndustries.map((ind) => (
              <span
                key={ind}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-sky-500/10 text-sky-700 border border-sky-500/30"
              >
                {ind}
              </span>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-rose-300">Company Directory Unavailable</div>
              <p className="text-rose-200/80 font-mono">{error}</p>
              <button
                onClick={fetchCompanies}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-800/40 text-rose-200 border border-rose-700/50 hover:bg-rose-800/60 font-mono text-[11px]"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="p-8 text-center text-[var(--text-secondary)] font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
            <span>Ranking companies by market capitalisation...</span>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {companies.map((company, idx) => (
              <CompanyRow key={company.companyId} rank={idx + 1} company={company} />
            ))}
            {companies.length === 0 && (
              <div className="col-span-full py-16 text-center text-[var(--text-tertiary)] font-medium bg-[var(--surface-1)] rounded-3xl border border-[var(--hairline)] border-dashed">
                No companies found for {countryName}.
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default CountryCompaniesPage;
