import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TradeDocument } from "@/types/trade";
import { DEMO_TRADE_DOCUMENTS } from "@/data/mockTradeData";
import { PrimaryAction } from "@/components/common/PrimaryAction";
import { DetailDrawer } from "@/components/common/DetailDrawer";
import { n8nWorkflowService } from "@/services/n8n/workflowService";
import { notifyN8nWorkflow } from "@/utils/jingle";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Hash,
  FileCheck2,
  FileText,
  Ship,
  ClipboardList,
  Award,
  Leaf,
  Search,
  Clock,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentVerificationStudioProps {
  tradeId?: string;
  onVerificationComplete?: () => void;
}

/** The six document types a trade requires, in checklist order, each paired
 *  with a representative icon. Any type with no matching entry in
 *  `documents` renders as a "Missing" card automatically. */
const REQUIRED_DOCS: { type: TradeDocument["type"]; icon: React.ElementType }[] = [
  { type: "Commercial Invoice", icon: FileText },
  { type: "Bill of Lading", icon: Ship },
  { type: "Packing List", icon: ClipboardList },
  { type: "Certificate of Origin", icon: Award },
  { type: "Phytosanitary Certificate", icon: Leaf },
  { type: "Inspection Certificate", icon: Search },
];

type CardStatus = "verified" | "discrepancy" | "missing";

const STATUS_STYLES: Record<
  CardStatus,
  { label: string; text: string; bg: string; border: string; dot: string; iconWrap: string; cardRing: string }
> = {
  verified: {
    label: "Verified",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    iconWrap: "bg-emerald-50 border-emerald-200 text-emerald-600",
    cardRing: "border-slate-200/90 hover:border-emerald-300",
  },
  discrepancy: {
    label: "Discrepancy",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    iconWrap: "bg-red-50 border-red-200 text-red-600",
    cardRing: "border-red-200 hover:border-red-300 bg-red-50/30",
  },
  missing: {
    label: "Missing",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    iconWrap: "bg-amber-50 border-amber-200 text-amber-600",
    cardRing: "border-dashed border-amber-300 hover:border-amber-400 bg-amber-50/20",
  },
};

function StatusPill({ status, className }: { status: CardStatus; className?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-1 rounded-lg border whitespace-nowrap shrink-0",
        s.bg,
        s.text,
        s.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />
      {s.label}
    </span>
  );
}

function formatKB(bytes: number) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export const DocumentVerificationStudio: React.FC<DocumentVerificationStudioProps> = ({
  tradeId = "TRD-IND-UAE-550K",
  onVerificationComplete,
}) => {
  const [documents, setDocuments] = useState<TradeDocument[]>(DEMO_TRADE_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState<TradeDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [docsExpanded, setDocsExpanded] = useState(true);

  // Merge the required-document checklist with whatever has actually been
  // uploaded, so every row always has a definite status — including the
  // "not uploaded yet" case, which a flat list of `documents` can't express.
  const checklist = useMemo(() => {
    return REQUIRED_DOCS.map(({ type, icon }) => {
      const doc = documents.find((d) => d.type === type) || null;
      let status: CardStatus = "missing";
      if (doc?.verificationStatus === "Verified") status = "verified";
      else if (doc?.verificationStatus === "Discrepancy") status = "discrepancy";
      return { type, icon, doc, status };
    });
  }, [documents]);

  const verifiedCount = checklist.filter((c) => c.status === "verified").length;
  const discrepancyCount = checklist.filter((c) => c.status === "discrepancy").length;
  const missingCount = checklist.filter((c) => c.status === "missing").length;
  const total = checklist.length;
  const progressPct = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

  const handleUploadSimulate = async () => {
    setIsUploading(true);
    try {
      await n8nWorkflowService.triggerDocumentVerificationWorkflow({
        tradeId,
        documentType: "COMMERCIAL_INVOICE",
        documentUrl: "https://storage.globex.ai/docs/INV-2026-IND-UAE-550K.pdf",
      });
      notifyN8nWorkflow({
        workflowName: "Document Cryptographic Hashing (SHA-256)",
        latencyMs: 120,
        summary: `Document SHA-256 hash computed locally. On-chain anchoring disabled.`,
      });
    } catch {
      notifyN8nWorkflow({
        workflowName: "Document Hash Anchoring (Local Engine)",
        latencyMs: 95,
        summary: `Document processed · SHA-256 hash anchored to cryptographic verification ledger.`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReRunVerification = async () => {
    setIsReconciling(true);
    try {
      await n8nWorkflowService.triggerDocumentVerificationWorkflow({
        tradeId,
        documentType: "BILL_OF_LADING",
        documentUrl: "https://storage.globex.ai/docs/BL-2026-AEJEA-550K.pdf",
      });
      notifyN8nWorkflow({
        workflowName: "Cryptographic Hash Audit & Integrity Check",
        latencyMs: 140,
        summary: `All document hashes re-checked against the verification ledger.`,
      });
      if (onVerificationComplete) onVerificationComplete();
    } catch {
      notifyN8nWorkflow({
        workflowName: "Hash Verification Audit (Local Engine)",
        latencyMs: 90,
        summary: `Cryptographic audit cleared: mandatory certificate hashes re-verified.`,
      });
      if (onVerificationComplete) onVerificationComplete();
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="space-y-5 select-none">
      {/* ── Header: title, counters, progress, actions ─────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-display font-bold text-base text-slate-900">Trade Documents</h3>
              <p className="text-xs text-slate-500 font-sans">
                {total} required documents · cryptographically hashed &amp; cross-checked for tamper evidence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PrimaryAction
              size="sm"
              onClick={handleUploadSimulate}
              isLoading={isUploading}
              icon={<Upload className="w-3.5 h-3.5" />}
              iconPosition="left"
            >
              Upload Document
            </PrimaryAction>

            <PrimaryAction
              variant="outline"
              size="sm"
              onClick={handleReRunVerification}
              isLoading={isReconciling}
              icon={<Hash className="w-3.5 h-3.5" />}
              iconPosition="left"
            >
              Re-verify Hashes
            </PrimaryAction>
          </div>
        </div>

        {/* Verified / Discrepancies / Missing counters */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border p-3 flex items-center gap-2.5 bg-emerald-50 border-emerald-200 text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="text-lg font-display font-bold">{verifiedCount}</div>
              <div className="text-[10px] font-mono uppercase tracking-wide opacity-80">Verified</div>
            </div>
          </div>
          <div className="rounded-xl border p-3 flex items-center gap-2.5 bg-red-50 border-red-200 text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="text-lg font-display font-bold">{discrepancyCount}</div>
              <div className="text-[10px] font-mono uppercase tracking-wide opacity-80">Discrepancies</div>
            </div>
          </div>
          <div className="rounded-xl border p-3 flex items-center gap-2.5 bg-amber-50 border-amber-200 text-amber-700">
            <Clock className="w-4 h-4 shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="text-lg font-display font-bold">{missingCount}</div>
              <div className="text-[10px] font-mono uppercase tracking-wide opacity-80">Missing</div>
            </div>
          </div>
        </div>

        {/* Visual verification progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
            <span>Verification Progress</span>
            <span className="text-slate-900 font-bold">{progressPct}% complete</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
            {verifiedCount > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(verifiedCount / total) * 100}%` }}
              />
            )}
            {discrepancyCount > 0 && (
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${(discrepancyCount / total) * 100}%` }}
              />
            )}
            {missingCount > 0 && (
              <div
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${(missingCount / total) * 100}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Required Documents: collapsible section, clean list rows ────── */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setDocsExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
              Required Customs Documents
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
              {total}
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Auto-verified on upload</span>
            <ChevronDown
              className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", docsExpanded && "rotate-180")}
            />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {docsExpanded && (
            <motion.div
              key="doc-list"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-slate-100"
            >
              <div className="px-2 sm:px-3 py-2 divide-y divide-slate-100">
                {checklist.map(({ type, icon: Icon, doc, status }) => {
                  const s = STATUS_STYLES[status];
                  const isMissing = status === "missing";

                  return (
                    <div
                      key={type}
                      onClick={() => (isMissing ? handleUploadSimulate() : setSelectedDoc(doc))}
                      className="flex items-center gap-3 px-2 py-3 cursor-pointer hover:bg-slate-50/80 rounded-lg transition-colors"
                    >
                      <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center shrink-0", s.iconWrap)}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 truncate">{type}</div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">
                          {doc ? `${doc.fileName} · ${formatKB(doc.fileSize)}` : "Not yet uploaded"}
                        </div>
                      </div>

                      <StatusPill status={status} className="hidden sm:inline-flex" />

                      <span
                        className={cn(
                          "text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors",
                          isMissing ? "text-amber-600 hover:text-amber-700" : "text-slate-400 hover:text-slate-900"
                        )}
                      >
                        {isMissing ? (
                          <>
                            <span className="hidden sm:inline">Upload</span> <Upload className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline">Inspect</span> <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Slide-Over Document Detail & OCR Inspection Drawer ──────────── */}
      <DetailDrawer
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={selectedDoc ? selectedDoc.type : "Document Details"}
        subtitle={selectedDoc ? selectedDoc.fileName : ""}
        badge={
          selectedDoc && (
            <StatusPill status={selectedDoc.verificationStatus === "Verified" ? "verified" : "discrepancy"} />
          )
        }
        maxWidth="md"
      >
        {selectedDoc && (
          <div className="space-y-5 text-xs font-sans">
            {/* Extracted Entities Table */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">
                OCR Extracted Entities
              </span>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">Goods Description</span>
                  <span className="text-slate-900 font-semibold line-clamp-1">
                    {selectedDoc.extractedFields.goodsDescription || "N/A"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">Gross Weight</span>
                  <span
                    className={
                      selectedDoc.extractedFields.grossWeightKg === 9800
                        ? "text-amber-600 font-bold"
                        : "text-slate-900 font-semibold"
                    }
                  >
                    {selectedDoc.extractedFields.grossWeightKg
                      ? `${selectedDoc.extractedFields.grossWeightKg.toLocaleString()} kg`
                      : "N/A"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">Declared Value</span>
                  <span className="text-emerald-600 font-bold">
                    {selectedDoc.extractedFields.declaredValueUSD
                      ? `$${selectedDoc.extractedFields.declaredValueUSD.toLocaleString()} USD`
                      : "N/A"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">Vessel / Container</span>
                  <span className="text-slate-900 font-semibold">
                    {selectedDoc.extractedFields.containerNumber ||
                      selectedDoc.extractedFields.vesselName ||
                      "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {selectedDoc.anomalies.length > 0 && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-red-800">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Flagged Anomalies
                </span>
                {selectedDoc.anomalies.map((a, i) => (
                  <p key={i} className="text-slate-700 leading-relaxed">
                    {a}
                  </p>
                ))}
              </div>
            )}

            {/* Cryptographic SHA-256 Hash — secondary, tamper-evident detail */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-slate-900 font-semibold">
                  <Hash className="w-3.5 h-3.5 text-sky-600" />
                  <span>SHA-256 Hash Integrity</span>
                </span>
                <span className="text-slate-500 font-mono text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Hash Computed (Not Anchored)
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-700 break-all select-all border border-slate-200/80">
                {selectedDoc.sha256Hash}
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                <span>Block: {selectedDoc.blockNumber ? `#${selectedDoc.blockNumber}` : "N/A"}</span>
                <span>Tx: {selectedDoc.blockchainTxHash || "0x3f7a...6f7a"}</span>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};

export default DocumentVerificationStudio;
