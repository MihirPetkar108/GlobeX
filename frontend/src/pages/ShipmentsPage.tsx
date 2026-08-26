import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import ShipmentTracker from "@/components/shipments/ShipmentTracker";

export const ShipmentsPage: React.FC = () => {
  return (
    <AppShell maxWidth="lg">
      <div className="space-y-6">
        <PageHeader
          title="Shipment & Vessel Telemetry"
          subtitle="Shipment milestone tracking for ocean freighters. No live AIS satellite integration exists yet — demo data below."
          badge={<StatusBadge status="muted" label="No Live Carrier Feed (Demo)" size="md" />}
        />

        <ShipmentTracker />
      </div>
    </AppShell>
  );
};

export default ShipmentsPage;
