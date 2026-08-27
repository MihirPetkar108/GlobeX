import React from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import ExportListingsPanel from "@/components/marketplace/ExportListingsPanel";
import { ArrowLeft, Plus } from "lucide-react";

export const MyListingsPage: React.FC = () => {
  return (
    <AppShell maxWidth="full" hideRail={true}>
      <div className="w-full min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 selection:bg-emerald-100">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Back Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
            <div>
              <Link
                to="/export-listings"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Create Listing Hub</span>
              </Link>
              <h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight">
                My Product Listings
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Manage your published commodities, stock availability, pricing, and active international buyer interest.
              </p>
            </div>

            <Link
              to="/export-listings"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Listing</span>
            </Link>
          </div>

          {/* Product Listings Grid and Filter Tabs */}
          <ExportListingsPanel />
        </div>
      </div>
    </AppShell>
  );
};

export default MyListingsPage;
