import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, type BreadcrumbCrumb } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Construction } from "lucide-react";

interface PhasePendingPageProps {
  section?: string;
  breadcrumbs?: BreadcrumbCrumb[];
  title: string;
  subtitle?: string;
  pendingNote: string;
}

/**
 * Route-table placeholder for a page whose real content lands in a later
 * rebuild phase (see reports/production/session_handoff_2026-08-24d_frontend_rebuild.md
 * §2, Phase 5/6). Renders honestly as "not built yet", never fake content.
 */
export const PhasePendingPage: React.FC<PhasePendingPageProps> = ({
  section,
  breadcrumbs,
  title,
  subtitle,
  pendingNote,
}) => {
  return (
    <AppShell maxWidth="lg">
      <div className="space-y-5">
        <PageHeader section={section} breadcrumbs={breadcrumbs} title={title} subtitle={subtitle} />
        <EmptyState
          icon={Construction}
          title="Not built yet"
          description={pendingNote}
        />
      </div>
    </AppShell>
  );
};

export default PhasePendingPage;
