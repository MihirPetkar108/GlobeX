import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricStrip } from "@/components/common/MetricStrip";
import { FilterBar } from "@/components/common/FilterBar";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import SpecularButton from "@/components/ui/SpecularButton";
import { aiService, ListingRecord } from "@/services/api/aiService";
import { PlusCircle, DollarSign, Boxes, ArrowUpRight, Bookmark, BookmarkX } from "lucide-react";

const CATEGORIES = ["All Commodities", "Agriculture", "Spices", "Textiles", "Chemicals", "Pharmaceuticals", "Metals"];
const WATCHLIST_KEY = "globex_watchlist_listing_ids";

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(ids: string[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(ids));
}

const ListingRow: React.FC<{
  listing: ListingRecord;
  action: React.ReactNode;
}> = ({ listing, action }) => (
  <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] hover:border-[var(--hairline-strong)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group">
    <div className="space-y-1 min-w-0 flex-1">
      <Link to={`/discover/${listing.id}`} className="text-sm font-display font-bold text-[var(--text-primary)] group-hover:text-emerald-600 transition-colors truncate block">
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
          {listing.minimumOrderQuantity != null && ` (MOQ: ${listing.minimumOrderQuantity})`}
        </div>
      </div>
      {action}
    </div>
  </div>
);

const ExporterCatalog: React.FC = () => {
  const { user } = useWorkspace();
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All Commodities");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMine = async () => {
    if (!user.organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await aiService.getListings({ organizationId: user.organizationId, status: "ACTIVE" });
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.organizationId]);

  const filtered = listings.filter((l) => {
    const matchesCat = selectedCategory === "All Commodities" || l.productCategory === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === "" ||
      l.productName.toLowerCase().includes(q) ||
      (l.hsCode || "").includes(q) ||
      (l.originPort || "").toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const totalValueUSD = listings.reduce((sum, l) => sum + (l.price || 0) * (l.quantityAvailable || 0), 0);
  const totalStock = listings.reduce((sum, l) => sum + (l.quantityAvailable || 0), 0);

  return (
    <>
      <PageHeader
        title="My Listings"
        subtitle={`Your organization's export catalog — ${user.companyName || "no organization yet"}.`}
        badge={<span className="text-xs font-mono text-[var(--text-secondary)]">{listings.length} active listings</span>}
        action={
          <Link to="/catalog/new">
            <SpecularButton icon={<PlusCircle className="w-4 h-4" />} iconPosition="left" size="sm" radius={10}>
              Add Listing
            </SpecularButton>
          </Link>
        }
      />

      {!user.organizationId ? (
        <EmptyState title="No organization yet" description="Complete onboarding to create and manage listings." />
      ) : loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchMine} />
      ) : (
        <>
          <MetricStrip
            columns={2}
            metrics={[
              {
                label: "Catalog Value (est.)",
                value: `$${(totalValueUSD / 1000).toFixed(1)}K`,
                subtext: `Across ${listings.length} listings`,
                icon: DollarSign,
                accentColor: "emerald",
              },
              {
                label: "Available Stock",
                value: totalStock.toLocaleString(),
                subtext: "Combined across all listings",
                icon: Boxes,
                accentColor: "slate",
              },
            ]}
          />

          <FilterBar
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search catalog by title, port, HS code..."
          />

          <div className="space-y-2.5">
            {filtered.map((listing) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                action={
                  <Link
                    to={`/discover/${listing.id}`}
                    className="flex items-center gap-1 text-xs font-sans text-sky-700 hover:text-sky-800 bg-sky-500/10 border border-sky-500/30 px-2.5 py-1.5 rounded-xl transition-colors font-medium"
                  >
                    <span>View</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
            ))}
            {filtered.length === 0 && (
              <EmptyState
                title="No listings match"
                description={listings.length === 0 ? "You haven't published any listings yet." : "Try clearing your filters."}
                action={
                  listings.length === 0 ? (
                    <Link to="/catalog/new">
                      <SpecularButton size="sm" radius={10}>Create your first listing</SpecularButton>
                    </Link>
                  ) : undefined
                }
              />
            )}
          </div>
        </>
      )}
    </>
  );
};

const ImporterWatchlist: React.FC = () => {
  const { listings, listingsLoading, listingsError, refreshListings } = useWorkspace();
  const [watchlist, setWatchlist] = useState<string[]>(loadWatchlist);

  const toggle = (id: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveWatchlist(next);
      return next;
    });
  };

  const watched = listings.filter((l) => watchlist.includes(l.id));

  return (
    <>
      <PageHeader
        title="Watchlist"
        subtitle="Listings you've bookmarked, pulled live from the current catalog. Saved to this browser only — not synced across devices."
        badge={<span className="text-xs font-mono text-[var(--text-secondary)]">{watched.length} bookmarked</span>}
      />

      {listingsLoading ? (
        <LoadingSkeleton />
      ) : listingsError ? (
        <ErrorState message={listingsError} onRetry={refreshListings} />
      ) : watched.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing bookmarked yet"
          description="Browse listings on Discover and bookmark the ones you want to track here."
          action={
            <Link to="/discover">
              <SpecularButton size="sm" radius={10}>Go to Discover</SpecularButton>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {watched.map((l) => (
            <div
              key={l.id}
              className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] hover:border-[var(--hairline-strong)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <Link to={`/discover/${l.id}`} className="text-sm font-display font-bold text-[var(--text-primary)] group-hover:text-emerald-600 transition-colors truncate block">
                  {l.title}
                </Link>
                <div className="text-xs text-[var(--text-secondary)] font-sans">
                  {l.exporterName} · {l.exporterCountry}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-sm font-mono font-bold text-[var(--text-primary)]">
                  ${l.unitPriceUSD.toLocaleString()} <span className="text-xs font-sans text-[var(--text-secondary)] font-normal">/ {l.unit}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(l.id)}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-rose-600 hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
                  title="Remove from watchlist"
                >
                  <BookmarkX className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export const CatalogPage: React.FC = () => {
  const { isExporterView } = useWorkspace();
  return (
    <AppShell maxWidth="full" className="space-y-5">
      {isExporterView ? <ExporterCatalog /> : <ImporterWatchlist />}
    </AppShell>
  );
};

export default CatalogPage;
