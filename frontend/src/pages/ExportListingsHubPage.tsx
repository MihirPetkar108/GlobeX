import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import CreateListingModal from "@/components/marketplace/CreateListingModal";
import { Plus, FileStack } from "lucide-react";

/**
 * Create Listing tab — two large icon buttons on entry:
 * - "New Listing" opens the modal to publish a new listing.
 * - "My Listings" opens a dedicated page displaying all published product listings.
 */
export const ExportListingsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
          className="group p-8 rounded-3xl border border-[var(--hairline)] bg-[var(--surface-1)] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex flex-col items-center gap-4 text-center cursor-pointer shadow-sm"
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
          onClick={() => navigate("/my-listings")}
          className="group p-8 rounded-3xl border border-[var(--hairline)] bg-[var(--surface-1)] hover:border-sky-500/50 hover:bg-sky-500/5 transition-all flex flex-col items-center gap-4 text-center cursor-pointer shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileStack className="w-8 h-8 text-sky-600 stroke-[2]" />
          </div>
          <div>
            <div className="text-base font-display font-bold text-[var(--text-primary)]">My Listings</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              View all products you've published
            </div>
          </div>
        </button>
      </div>

      <CreateListingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          navigate("/my-listings");
        }}
      />
    </AppShell>
  );
};

export default ExportListingsHubPage;
