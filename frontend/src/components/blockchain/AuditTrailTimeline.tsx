import React from "react";
import { AuditLogEntry } from "@/types/trade";
import { DEMO_AUDIT_LOGS } from "@/data/mockTradeData";
import { cn } from "@/lib/utils";
import {
  Database,
  Sparkles,
  Lock,
  FilePlus2,
  ShieldCheck,
  Ship,
  Anchor,
  PackageCheck,
  ClipboardCheck,
  Unlock,
  Scale,
  Hash,
  CheckCircle2,
} from "lucide-react";

interface AuditTrailTimelineProps {
  logs?: AuditLogEntry[];
}

const EVENT_STYLE: Record<AuditLogEntry["event"], { icon: React.ElementType; tone: string }> = {
  "Trade Created": { icon: Sparkles, tone: "sky" },
  "Document Registered": { icon: FilePlus2, tone: "sky" },
  "Document Verified": { icon: ShieldCheck, tone: "emerald" },
  "Escrow Funded": { icon: Lock, tone: "amber" },
  "Shipment Dispatched": { icon: Ship, tone: "sky" },
  "Customs Cleared": { icon: Anchor, tone: "sky" },
  "Shipment Received": { icon: PackageCheck, tone: "emerald" },
  "Inspection Accepted": { icon: ClipboardCheck, tone: "emerald" },
  "Payment Released": { icon: Unlock, tone: "emerald" },
  "Dispute Arbitrated": { icon: Scale, tone: "amber" },
};

const TONE_CLASSES: Record<string, { bg: string; border: string; text: string }> = {
  sky: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-600" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats "2026-08-10 09:30:14 UTC" → "Aug 10, 2026 · 09:30 UTC" via plain
 *  string parsing — deliberately avoids `new Date()` on a non-ISO,
 *  space-separated timestamp, which browsers handle inconsistently. */
function formatTimestamp(ts: string): string {
  const [datePart, timePart] = ts.split(" ");
  const [y, m, d] = (datePart || "").split("-");
  const monthName = MONTHS[Number(m) - 1] || m;
  const hhmm = (timePart || "").slice(0, 5);
  return `${monthName} ${Number(d)}, ${y} · ${hhmm} UTC`;
}

export const AuditTrailTimeline: React.FC<AuditTrailTimelineProps> = ({ logs = DEMO_AUDIT_LOGS }) => {
  return (
    <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs select-none">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-base text-slate-900">Audit Trail</h3>
          <p className="text-xs text-slate-500 font-sans">Chronological record of this trade's key milestones.</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative space-y-5 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
        {logs.map((log) => {
          const meta = EVENT_STYLE[log.event] || { icon: Database, tone: "sky" };
          const tone = TONE_CLASSES[meta.tone];
          const Icon = meta.icon;

          return (
            <div key={log.id} className="relative flex items-start gap-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-full border flex items-center justify-center shrink-0 z-10 bg-white",
                  tone.bg,
                  tone.border,
                  tone.text
                )}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>

              <div className="flex-1 min-w-0 pt-1.5 pb-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">{log.event}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    {log.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-sans mt-0.5">{formatTimestamp(log.timestamp)}</div>
                <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1 truncate select-all">
                  <Hash className="w-3 h-3 shrink-0" />
                  {log.txHash.slice(0, 14)}…{log.txHash.slice(-6)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditTrailTimeline;
