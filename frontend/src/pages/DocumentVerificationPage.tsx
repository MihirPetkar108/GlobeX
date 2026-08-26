import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import DocumentVerificationStudio from "@/components/documents/DocumentVerificationStudio";

export const DocumentVerificationPage: React.FC = () => {
  return (
    <AppShell maxWidth="lg">
      <div className="space-y-6">
        <PageHeader
          title="Document Cryptographic Verification"
          subtitle="SHA-256 cryptographic document hashing across Commercial Invoices, Bills of Lading, and Phytosanitary Certificates. On-chain anchoring is built but disabled by default."
          badge={<StatusBadge status="muted" label="On-Chain Anchoring Disabled" size="md" />}
        />

        <DocumentVerificationStudio />
      </div>
    </AppShell>
  );
};

export default DocumentVerificationPage;
