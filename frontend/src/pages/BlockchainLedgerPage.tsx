import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import PublicTradeLedgerTable from "@/components/blockchain/PublicTradeLedgerTable";

export const BlockchainLedgerPage: React.FC = () => {
  return (
    <AppShell maxWidth="lg">
      <div className="space-y-6">
        <PageHeader
          title="On-Chain Evidence & Audit Ledger"
          subtitle="Cryptographic SHA-256 verification of registered trade documents, anchored to a local Hardhat testnet. Not deployed to a public network."
          badge={<StatusBadge status="muted" label="Local Testnet (Not Public)" size="md" />}
        />

        <PublicTradeLedgerTable />
      </div>
    </AppShell>
  );
};

export default BlockchainLedgerPage;
