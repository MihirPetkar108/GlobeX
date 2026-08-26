import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PrimaryAction } from "@/components/common/PrimaryAction";
import { Section } from "@/components/common/Section";
import { aiService, CompanyDirectoryEntry } from "@/services/api/aiService";
import { Building2, Globe2, Users, MapPin, ExternalLink, AlertCircle, RefreshCw } from "lucide-react";

const formatUSD = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return "N/A";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
};

const websiteHref = (site: string | null): string | null => {
  if (!site) return null;
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
};

export const CompanyDetailPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [company, setCompany] = useState<CompanyDirectoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.getCompanyDetail(companyId);
      setCompany(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load company record.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  if (loading) {
    return (
      <AppShell maxWidth="lg">
        <div className="p-16 text-center text-[var(--text-secondary)] font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
          <span>Loading company record...</span>
        </div>
      </AppShell>
    );
  }

  if (error || !company) {
    return (
      <AppShell maxWidth="lg">
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-3 mt-6">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-rose-300">Company Not Found</div>
            <p className="text-rose-200/80 font-mono">{error || "This company record does not exist."}</p>
            <button
              onClick={fetchCompany}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-800/40 text-rose-200 border border-rose-700/50 hover:bg-rose-800/60 font-mono text-[11px]"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const website = websiteHref(company.website);

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-5 select-none">
        <PageHeader
          breadcrumbs={[{ label: "Companies", href: "/discover" }, { label: company.displayName }]}
          title={company.displayName}
          subtitle={
            <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {company.country}
              </span>
              {company.industry && (
                <>
                  <span>•</span>
                  <span className="font-mono">{company.industry}</span>
                </>
              )}
            </div>
          }
          badge={<StatusBadge status="verified" label="Yahoo Finance Valuation Dataset" size="md" />}
          action={
            website ? (
              <a href={website} target="_blank" rel="noopener noreferrer">
                <PrimaryAction icon={<ExternalLink className="w-4 h-4" />} iconPosition="left" size="sm">
                  Contact via Website
                </PrimaryAction>
              </a>
            ) : null
          }
        />

        {!website && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 font-sans">
            No verified website or contact channel is on file for this company in the source dataset — reach out through your own diligence process before proceeding.
          </div>
        )}

        {/* Overview Spec Row */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Market Cap</span>
            <strong className="text-emerald-600 text-base">{formatUSD(company.marketCapUSD)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Total Revenue</span>
            <strong className="text-[var(--text-primary)] text-base">{formatUSD(company.totalRevenueUSD)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Sector</span>
            <strong className="text-[var(--text-primary)] text-base">{company.sector || "—"}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Employees</span>
            <strong className="text-[var(--text-primary)] text-base flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              {company.employees ? company.employees.toLocaleString() : "—"}
            </strong>
          </div>
        </div>

        <Section title="Company Profile">
          <div className="p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
            {company.businessSummary || "No business summary available for this company."}
          </div>
        </Section>

        <Section title="Contact">
          <div className="p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 text-sm text-[var(--text-primary)]">
              <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="font-mono">{company.companyName}</span>
            </div>
            {website ? (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sky-600 hover:text-sky-700 text-xs font-mono font-bold"
              >
                <Globe2 className="w-3.5 h-3.5" />
                {company.website}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-xs font-mono text-[var(--text-tertiary)]">No website on file</span>
            )}
          </div>
        </Section>
      </div>
    </AppShell>
  );
};

export default CompanyDetailPage;
