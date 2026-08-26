import React from "react";
import { useParams, Link } from "react-router-dom";
import { TOP_10_TRUSTED_PARTNERS } from "@/data/mockTradeData";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PrimaryAction } from "@/components/common/PrimaryAction";
import { Section } from "@/components/common/Section";
import TrustScoreGauge from "@/components/trust/TrustScoreGauge";
import TradeRiskCompositeCard from "@/components/risk/TradeRiskCompositeCard";
import { MapPin, ShieldCheck, PlusCircle } from "lucide-react";

export const CounterpartyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const partner = TOP_10_TRUSTED_PARTNERS.find((p) => p.id === id) || TOP_10_TRUSTED_PARTNERS[0];

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-5 select-none">
        
        {/* Page Header */}
        <PageHeader
          breadcrumbs={[
            { label: "Discover", href: "/discover" },
            { label: "Counterparties", href: "/counterparties" },
            { label: partner.name },
          ]}
          title={partner.name}
          subtitle={
            <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {partner.city}, {partner.country}
              </span>
              <span>•</span>
              <span className="font-mono">REG: {partner.registrationNumber}</span>
              <span>•</span>
              <span>{partner.contactEmail}</span>
            </div>
          }
          badge={<StatusBadge status="verified" label="KYC Verified Tier-1" size="md" />}
          action={
            <Link to="/requests?duty=import">
              <PrimaryAction icon={<PlusCircle className="w-4 h-4" />} iconPosition="left" size="sm">
                Start Trade with Partner
              </PrimaryAction>
            </Link>
          }
        />

        {/* Overview Spec Row */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Historical Trade Volume</span>
            <strong className="text-emerald-600 text-base">
              ${(partner.totalTradeVolumeUSD / 1000000).toFixed(1)}M USD
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Completed Trades</span>
            <strong className="text-[var(--text-primary)] text-base">{partner.tradeHistoryCount} Shipments</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Arbitrated Disputes</span>
            <strong className="text-emerald-600 text-base">{partner.disputeCount} Disputes</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Years in Operation</span>
            <strong className="text-[var(--text-primary)] text-base">{partner.yearsActive} Years</strong>
          </div>
        </div>

        {/* Entity Narrative Description */}
        <Section title="Institutional Profile">
          <div className="p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
            {partner.description}
          </div>
        </Section>

        {/* Certifications */}
        <Section title="Verified Accreditations & Quality Licenses">
          <div className="flex flex-wrap gap-2">
            {partner.certifications.map((c) => (
              <span
                key={c}
                className="px-3 py-1.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-xs font-mono text-[var(--text-secondary)] flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{c}</span>
              </span>
            ))}
          </div>
        </Section>

        {/* Trust & Risk Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TrustScoreGauge score={partner.trustScore} title="Institutional Trust Score" />
          <TradeRiskCompositeCard score={partner.riskScore} />
        </div>

      </div>
    </AppShell>
  );
};

export default CounterpartyDetailPage;
