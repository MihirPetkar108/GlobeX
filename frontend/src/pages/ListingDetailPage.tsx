import React from "react";
import { useParams, Link } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { TOP_10_TRUSTED_PARTNERS } from "@/data/mockTradeData";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PrimaryAction } from "@/components/common/PrimaryAction";
import { Section } from "@/components/common/Section";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import TrustScoreGauge from "@/components/trust/TrustScoreGauge";
import TradeRiskCompositeCard from "@/components/risk/TradeRiskCompositeCard";
import ComplianceChecklistWidget from "@/components/compliance/ComplianceChecklistWidget";
import LogisticsProfitWidget from "@/components/marketplace/LogisticsProfitWidget";
import { MapPin, ShieldCheck, Coins } from "lucide-react";

export const ListingDetailPage: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const { listings, listingsLoading, listingsError, refreshListings } = useWorkspace();

  if (listingsLoading) {
    return (
      <AppShell maxWidth="lg">
        <LoadingSkeleton variant="card" count={3} />
      </AppShell>
    );
  }

  if (listingsError) {
    return (
      <AppShell maxWidth="lg">
        <ErrorState message={listingsError} onRetry={refreshListings} />
      </AppShell>
    );
  }

  const listing = listings.find((p) => p.id === listingId);

  if (!listing) {
    return (
      <AppShell maxWidth="lg">
        <EmptyState
          title="Listing not found"
          description="This listing may have been removed, or the link is out of date."
          action={
            <Link to="/discover">
              <PrimaryAction size="sm">Back to Discover</PrimaryAction>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const supplier = TOP_10_TRUSTED_PARTNERS.find((c) => c.id === listing.exporterId) || null;

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-5 select-none">
        <PageHeader
          breadcrumbs={[{ label: "Discover", href: "/discover" }, { label: listing.title }]}
          title={listing.title}
          subtitle={
            <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs text-[var(--text-secondary)]">
              <span className="text-[var(--text-primary)] font-medium">{listing.exporterName}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {listing.exporterCity}, {listing.exporterCountry}
              </span>
              <span>•</span>
              <span className="font-mono">HS {listing.hsCode}</span>
            </div>
          }
          badge={<StatusBadge status="verified" label="Verified Export Ready" size="md" />}
          action={
            <Link to={`/requests?listingId=${listing.id}`}>
              <PrimaryAction icon={<Coins className="w-4 h-4" />} iconPosition="left" size="sm">
                Request Trade (${(listing.minimumOrderQuantity * listing.unitPriceUSD).toLocaleString()})
              </PrimaryAction>
            </Link>
          }
        />

        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase block">FOB Unit Price</span>
            <strong className="text-[var(--text-primary)] text-base">${listing.unitPriceUSD.toLocaleString()} / {listing.unit}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Min Order Qty (MOQ)</span>
            <strong className="text-[var(--text-primary)] text-base">{listing.minimumOrderQuantity.toLocaleString()} {listing.unit}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Origin Port</span>
            <strong className="text-emerald-600 text-base truncate block">{listing.originPort}</strong>
          </div>
        </div>

        <Section title="Commodity Specifications & Lab Parameters">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            {Object.entries(listing.specs).map(([key, val]) => (
              <div key={key} className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)]">
                <span className="text-[var(--text-secondary)] text-[10px] uppercase block">{key}</span>
                <span className="font-bold text-[var(--text-primary)] text-xs">{val}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Accreditations & Compliance">
          <div className="flex flex-wrap gap-2">
            {listing.certifications.map((c) => (
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

        {supplier ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TrustScoreGauge score={supplier.trustScore} title="Supplier Trust Dossier" />
            <TradeRiskCompositeCard score={supplier.riskScore} />
          </div>
        ) : (
          <EmptyState title="No trust/risk dossier on file" description="This exporter has no verified trust or risk history yet." />
        )}

        <ComplianceChecklistWidget hsCode={listing.hsCode} productName={listing.title} />

        <LogisticsProfitWidget
          originPortHint={listing.originPort}
          fobUnitPriceUSD={listing.unitPriceUSD}
          quantityKg={listing.minimumOrderQuantity}
        />
      </div>
    </AppShell>
  );
};

export default ListingDetailPage;
