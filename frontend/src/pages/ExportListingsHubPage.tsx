import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import CreateListingModal from "@/components/marketplace/CreateListingModal";
import { aiService, ListingRecord } from "@/services/api/aiService";
import { Plus, FileStack, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ListingRow: React.FC<{ listing: ListingRecord }> = ({ listing }) => (
  <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] hover:border-[var(--hairline-strong)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group">
    <div className="space-y-1 min-w-0 flex-1">
      <Link
        to={`/discover/${listing.id}`}
        className="text-sm font-display font-bold text-[var(--text-primary)] group-hover:text-emerald-600 transition-colors truncate block"
      >
        {listing.productName}
      </Link>
      <div className="text-xs text-[var(--text-secondary)] font-sans flex items-center gap-1.5">
        <span>{listing.productCategory || "Uncategorized"}</span>
        {listing.hsCode && (
          <>
            <span>·</span>
            <span className="text-[var(--text-tertiary)] font-mono">HS {listing.hsCode}</span>
          </>
        )}
      </div>
    </div>

    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--hairline)]">
      <div className="text-left md:text-right">
        <div className="text-sm sm:text-base font-mono font-bold text-[var(--text-primary)]">
          {listing.price != null ? `$${listing.price.toLocaleString()}` : "—"}{" "}
          <span className="text-xs font-sans text-[var(--text-secondary)] font-normal">/ {listing.unit || "unit"}</span>
        </div>
        <div className="text-[11px] font-mono text-[var(--text-tertiary)]">
          Stock: {listing.quantityAvailable != null ? listing.quantityAvailable.toLocaleString() : "—"} {listing.unit}
        </div>
      </div>
      <Link
        to={`/discover/${listing.id}`}
        className="flex items-center gap-1 text-xs font-sans text-sky-700 hover:text-sky-800 bg-sky-500/10 border border-sky-500/30 px-2.5 py-1.5 rounded-xl transition-colors font-medium"
      >
        <span>View</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  </div>
);

/**
 * Create Listing tab — two large icon buttons on entry: Plus opens a modal
 * to publish a new listing, Docs shows every listing this org has already
 * published. Both are always visible; Docs toggles a grid open below them.
 */
export const ExportListingsHubPage: React.FC = () => {
  const { user } = useWorkspace();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchMine = async () => {
    if (!user.organizationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.getListings({ organizationId: user.organizationId, status: "ACTIVE" });
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your listings.");
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  useEffect(() => {
    if (isDocsOpen && !hasFetched) {
      fetchMine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDocsOpen]);

  return (
    <AppShell maxWidth="lg" className="space-y-6">
      <PageHeader
        title="Create Listing"
        subtitle="Publish new products to the buyer-facing catalog, or review everything you've already listed."
      />

      {/* Two large icon-button entry points */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="group p-8 rounded-3xl border border-[var(--hairline)] bg-[var(--surface-1)] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex flex-col items-center gap-4 text-center cursor-pointer"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Plus className="w-8 h-8 text-emerald-600 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-base font-display font-bold text-[var(--text-primary)]">New Listing</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">Publish a product for buyers to discover</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsDocsOpen((v) => !v)}
          className={cn(
            "group p-8 rounded-3xl border transition-all flex flex-col items-center gap-4 text-center cursor-pointer",
            isDocsOpen
              ? "border-sky-500/50 bg-sky-500/5"
              : "border-[var(--hairline)] bg-[var(--surface-1)] hover:border-sky-500/50 hover:bg-sky-500/5"
          )}
        >
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileStack className="w-8 h-8 text-sky-600 stroke-[2]" />
          </div>
          <div>
            <div className="text-base font-display font-bold text-[var(--text-primary)]">My Listings</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              {isDocsOpen ? "Showing everything you've published" : "View listings you've already published"}
            </div>
          </div>
        </button>
      </div>

      {/* Docs — previously created listing cards */}
      {isDocsOpen && (
        <div className="space-y-2.5 pt-2">
          {!user.organizationId ? (
            <EmptyState title="No organization yet" description="Complete onboarding to create and manage listings." />
          ) : loading ? (
            <LoadingSkeleton variant="row" count={3} />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchMine} />
          ) : listings.length === 0 ? (
            <EmptyState
              icon={FileStack}
              title="No listings yet"
              description="Publish your first listing to see it here."
              action={
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-500 cursor-pointer"
                >
                  Create your first listing
                </button>
              }
            />
          ) : (
            listings.map((listing) => <ListingRow key={listing.id} listing={listing} />)
          )}
        </div>
      )}

      <CreateListingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          setIsDocsOpen(true);
          fetchMine();
        }}
      />
    </AppShell>
  );
};

export default ExportListingsHubPage;
