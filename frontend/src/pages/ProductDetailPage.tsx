import React from "react";
import { useParams, Link } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { TOP_10_TRUSTED_PARTNERS } from "@/data/mockTradeData";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PrimaryAction } from "@/components/common/PrimaryAction";
import { Section } from "@/components/common/Section";
import TrustScoreGauge from "@/components/trust/TrustScoreGauge";
import TradeRiskCompositeCard from "@/components/risk/TradeRiskCompositeCard";
import ComplianceChecklistWidget from "@/components/compliance/ComplianceChecklistWidget";
import LogisticsProfitWidget from "@/components/marketplace/LogisticsProfitWidget";
import { MapPin, ShieldCheck, Coins } from "lucide-react";

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { listings } = useWorkspace();
  const listing = listings.find((p) => p.id === id) || listings[0];
  const supplier = TOP_10_TRUSTED_PARTNERS.find((c) => c.id === listing?.exporterId) || TOP_10_TRUSTED_PARTNERS[0];

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-5 select-none">
        
        {/* Page Header */}
        <PageHeader
          breadcrumbs={[
            { label: "Marketplace", href: "/marketplace" },
            { label: listing.title },
          ]}
          title={listing.title}
          subtitle={
            <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs text-slate-400">
              <span className="text-white font-medium">{listing.exporterName}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {listing.exporterCity}, {listing.exporterCountry}
              </span>
              <span>•</span>
              <span className="font-mono">HS {listing.hsCode}</span>
            </div>
          }
          badge={<StatusBadge status="verified" label="Verified Export Ready" size="md" />}
          action={
            <Link to="/trades/TRD-IND-UAE-550K">
              <PrimaryAction icon={<Coins className="w-4 h-4" />} iconPosition="left" size="sm">
                Initiate Trade (${(listing.minimumOrderQuantity * listing.unitPriceUSD).toLocaleString()})
              </PrimaryAction>
            </Link>
          }
        />

        {/* Overview Spec Row */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0C121D] border border-white/[0.07] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">FOB Unit Price</span>
            <strong className="text-white text-base">${listing.unitPriceUSD.toLocaleString()} / {listing.unit}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Min Order Qty (MOQ)</span>
            <strong className="text-white text-base">{listing.minimumOrderQuantity.toLocaleString()} {listing.unit}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Origin Port</span>
            <strong className="text-emerald-400 text-base truncate block">{listing.originPort}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Tariff Schedule</span>
            <strong className="text-sky-400 text-base">0.0% CEPA Free</strong>
          </div>
        </div>

        {/* Detailed Specs */}
        <Section title="Commodity Specifications & Lab Parameters">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            {Object.entries(listing.specs).map(([key, val]) => (
              <div key={key} className="p-3 rounded-xl bg-[#0C121D] border border-white/[0.06]">
                <span className="text-slate-400 text-[10px] uppercase block">{key}</span>
                <span className="font-bold text-white text-xs">{val}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Certifications */}
        <Section title="Accreditations & Compliance">
          <div className="flex flex-wrap gap-2">
            {listing.certifications.map((c) => (
              <span
                key={c}
                className="px-3 py-1.5 rounded-xl bg-[#0C121D] border border-white/[0.07] text-xs font-mono text-slate-300 flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{c}</span>
              </span>
            ))}
          </div>
        </Section>

        {/* Supplier Trust & Risk Assessment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TrustScoreGauge score={supplier.trustScore} title="Supplier Trust Dossier" />
          <TradeRiskCompositeCard score={supplier.riskScore} />
        </div>

        {/* Compliance Checklist Widget */}
        <ComplianceChecklistWidget hsCode={listing.hsCode} productName={listing.title} />

        {/* Shipping ETA & Profit Estimate */}
        <LogisticsProfitWidget
          originPortHint={listing.originPort}
          fobUnitPriceUSD={listing.unitPriceUSD}
          quantityKg={listing.minimumOrderQuantity}
        />

      </div>
    </AppShell>
  );
};

export default ProductDetailPage;
