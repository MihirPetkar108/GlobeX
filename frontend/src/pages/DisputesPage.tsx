import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import DisputeResolutionSuite from "@/components/disputes/DisputeResolutionSuite";

export const DisputesPage: React.FC = () => {
  return (
    <AppShell maxWidth="lg">
      <div className="space-y-6">
        <PageHeader
          title="Dispute Resolution & Arbitrator Portal"
          subtitle="AI synthesizes weighbridge discrepancy proofs, OCR variances, and contract clauses to provide settlement recommendations for certified Human Arbitrators."
          badge={<StatusBadge status="review" label="Human-in-the-Loop Protocol" size="md" />}
        />

        <DisputeResolutionSuite />
      </div>
    </AppShell>
  );
};

export default DisputesPage;
