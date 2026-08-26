import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import CryptoEscrowCard from "@/components/escrow/CryptoEscrowCard";

export const EscrowPage: React.FC = () => {
  const { tradeId } = useParams<{ tradeId?: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState("");

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-6">
        <PageHeader
          title="Programmable Smart Escrow"
          subtitle="Real on-chain USDC escrow, backed by TradeEscrow.sol on the configured chain."
        />

        {tradeId ? (
          <CryptoEscrowCard tradeId={tradeId} />
        ) : (
          <div className="p-6 bg-[var(--surface-1)] border border-[var(--hairline)] rounded-2xl space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">Enter a trade ID to view its escrow.</p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) navigate(`/escrow/${input.trim()}`);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Trade ID"
                className="flex-1 p-2.5 rounded-xl bg-[var(--surface-3)] border border-[var(--hairline)] text-sm text-[var(--text-primary)] outline-none font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold"
              >
                View Escrow
              </button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default EscrowPage;
