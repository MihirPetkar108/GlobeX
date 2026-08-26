import { AuditLogEntry } from "@/types/trade";
import { DEMO_AUDIT_LOGS } from "@/data/mockTradeData";
import { Database, CheckCircle2 } from "lucide-react";

interface PublicTradeLedgerTableProps {
  logs?: AuditLogEntry[];
}

export const PublicTradeLedgerTable = ({ logs = DEMO_AUDIT_LOGS }: PublicTradeLedgerTableProps) => {
  return (
    <div className="p-5 bg-[var(--surface-1)] border border-[var(--hairline)] rounded-2xl space-y-4 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--hairline)] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Public Immutable Evidence Ledger
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-secondary)] border border-[var(--hairline-strong)]">
                DEMO DATA
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-sans">
              Cryptographic SHA-256 fingerprint anchoring for tamper-evident trade milestone auditing.
            </p>
          </div>
        </div>

        <div className="text-right text-xs font-mono text-[var(--text-secondary)]">
          Network: <strong className="text-[var(--text-primary)]">Local Hardhat Testnet</strong> (demo rows, not live)
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-[var(--text-tertiary)] uppercase text-[10px]">
              <th className="pb-3 px-3">Event Type</th>
              <th className="pb-3 px-3">Timestamp (UTC)</th>
              <th className="pb-3 px-3">Block Number</th>
              <th className="pb-3 px-3">Transaction Hash</th>
              <th className="pb-3 px-3">Signer Address</th>
              <th className="pb-3 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--hairline)]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-[var(--surface-3)] transition-colors">
                <td className="py-3 px-3 font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{log.event}</span>
                </td>
                <td className="py-3 px-3 text-[var(--text-secondary)]">{log.timestamp}</td>
                <td className="py-3 px-3 text-sky-600 font-bold">#{log.blockNumber}</td>
                <td className="py-3 px-3 text-emerald-600 truncate max-w-[140px] select-all">
                  {log.txHash}
                </td>
                <td className="py-3 px-3 text-[var(--text-secondary)] truncate max-w-[120px] select-all">
                  {log.signerAddress}
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{log.status}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PublicTradeLedgerTable;
