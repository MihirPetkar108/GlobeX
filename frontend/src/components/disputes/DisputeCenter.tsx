import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PrimaryAction } from "@/components/common/PrimaryAction";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Scale,
  PackageX,
  PackageSearch,
  PackageMinus,
  ShieldAlert,
  Clock,
  FileWarning,
  HelpCircle,
  Upload,
  Hash,
  X,
  FileText,
  Check,
  ArrowLeft,
} from "lucide-react";

interface DisputeCenterProps {
  tradeId?: string;
}

const ISSUE_TYPES = [
  { id: "damaged", label: "Damaged Goods", icon: PackageX },
  { id: "wrong", label: "Wrong Goods", icon: PackageSearch },
  { id: "missing", label: "Missing / Short Quantity", icon: PackageMinus },
  { id: "quality", label: "Quality Issue", icon: ShieldAlert },
  { id: "late", label: "Late Delivery", icon: Clock },
  { id: "docs", label: "Documentation Issue", icon: FileWarning },
  { id: "other", label: "Other", icon: HelpCircle },
] as const;

type IssueId = (typeof ISSUE_TYPES)[number]["id"];

interface EvidenceFile {
  id: string;
  name: string;
  sizeKB: number;
  hash: string | null; // null while hashing
}

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type View = "none" | "form" | "filed";

export const DisputeCenter: React.FC<DisputeCenterProps> = ({ tradeId = "TRD-IND-UAE-550K" }) => {
  const [view, setView] = useState<View>("none");
  const [issue, setIssue] = useState<IssueId | null>(null);
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = Boolean(issue) && description.trim().length > 0;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const id = `${file.name}-${file.size}-${Date.now()}`;
      setEvidence((prev) => [...prev, { id, name: file.name, sizeKB: file.size / 1024, hash: null }]);
      sha256Hex(file)
        .then((hash) => {
          setEvidence((prev) => prev.map((e) => (e.id === id ? { ...e, hash } : e)));
        })
        .catch(() => {
          setEvidence((prev) => prev.map((e) => (e.id === id ? { ...e, hash: "unavailable" } : e)));
        });
    });
  };

  const removeEvidence = (id: string) => {
    setEvidence((prev) => prev.filter((e) => e.id !== id));
  };

  const handleCreateDispute = () => {
    if (!canSubmit) return;
    setSubmittedAt(new Date().toISOString());
    setView("filed");
  };

  const resetToNone = () => {
    setView("none");
    setIssue(null);
    setDescription("");
    setEvidence([]);
    setSubmittedAt(null);
  };

  const issueMeta = ISSUE_TYPES.find((i) => i.id === issue);

  return (
    <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs select-none">
      <AnimatePresence mode="wait">
        {/* ── NO ACTIVE DISPUTES ──────────────────────────────────────────── */}
        {view === "none" && (
          <motion.div
            key="none"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-center text-center gap-3 py-10"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-display font-bold text-slate-900">No Active Disputes</h3>
            <p className="text-xs sm:text-sm text-slate-500 font-sans max-w-sm leading-relaxed">
              This trade is progressing as agreed. If something doesn't match — damaged goods, the wrong items,
              a short quantity, or a documentation mismatch — you can file a dispute here.
            </p>
            <PrimaryAction
              size="lg"
              variant="amber"
              className="mt-2 bg-yellow-400 hover:bg-yellow-500 border-yellow-500 text-slate-900 shadow-md shadow-yellow-500/20"
              onClick={() => setView("form")}
              icon={<Scale className="w-4 h-4" />}
              iconPosition="left"
            >
              File a Dispute
            </PrimaryAction>
          </motion.div>
        )}

        {/* ── FILE A DISPUTE FORM ──────────────────────────────────────────── */}
        {view === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">File a Dispute</h3>
                  <p className="text-xs text-slate-500 font-sans">Trade {tradeId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetToNone}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>

            {/* Issue type cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">What went wrong?</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {ISSUE_TYPES.map(({ id, label, icon: Icon }) => {
                  const selected = issue === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setIssue(id)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border text-center transition-all",
                        selected
                          ? "bg-slate-900 border-slate-900 text-white shadow-md"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", selected ? "text-white" : "text-slate-500")} />
                      <span className="text-[11px] font-semibold leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Specify your issue</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened — include quantities, dates, or anything the reviewer should know."
                className="w-full p-3 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 outline-none focus:border-sky-400 font-sans resize-none"
              />
            </div>

            {/* Evidence upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Evidence (photos or documents)</label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  handleFilesSelected(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-sky-400 hover:bg-sky-50/30 transition-colors flex flex-col items-center gap-1.5 text-center"
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Click to upload photos or documents</span>
                <span className="text-[10px] text-slate-400">PDF, DOC, or image files</span>
              </button>

              {evidence.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {evidence.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80"
                    >
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 truncate">{f.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 truncate flex items-center gap-1">
                          {(f.sizeKB).toFixed(0)} KB ·{" "}
                          {f.hash ? (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <Hash className="w-2.5 h-2.5" /> {f.hash.slice(0, 10)}…
                            </span>
                          ) : (
                            <span className="text-slate-400">hashing…</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEvidence(f.id)}
                        className="text-slate-300 hover:text-rose-500 shrink-0"
                        aria-label="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-1.5 text-[11px] text-slate-400 font-sans pt-0.5">
                <Hash className="w-3 h-3 shrink-0 mt-0.5" />
                <span>Every file is hashed with SHA-256 on your device for tamper-evident verification.</span>
              </div>
            </div>

            <PrimaryAction
              size="lg"
              variant="amber"
              className="w-full justify-center"
              disabled={!canSubmit}
              onClick={handleCreateDispute}
            >
              Create Dispute
            </PrimaryAction>
          </motion.div>
        )}

        {/* ── FILED DISPUTE SUMMARY ───────────────────────────────────────── */}
        {view === "filed" && issueMeta && (
          <motion.div
            key="filed"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            <div className="flex flex-col items-center text-center gap-2 pb-1">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-display font-bold text-slate-900">Dispute Filed</h3>
              <p className="text-xs text-slate-500 font-sans max-w-sm">
                We've recorded your dispute and evidence. Our team will review it and follow up.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <span className="text-xs font-sans text-slate-500">Issue</span>
                <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <issueMeta.icon className="w-4 h-4 text-slate-500" />
                  {issueMeta.label}
                </span>
              </div>
              <div className="p-4 space-y-1.5">
                <span className="text-xs font-sans text-slate-500 block">Description</span>
                <p className="text-xs text-slate-800 leading-relaxed font-sans">{description}</p>
              </div>
              <div className="p-4 space-y-1.5">
                <span className="text-xs font-sans text-slate-500 block">
                  Submitted Evidence {evidence.length > 0 ? `(${evidence.length})` : ""}
                </span>
                {evidence.length > 0 ? (
                  <div className="space-y-1.5">
                    {evidence.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 text-xs font-mono text-slate-600">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{f.name}</span>
                        {f.hash && f.hash !== "unavailable" && (
                          <span className="text-emerald-600 shrink-0">{f.hash.slice(0, 8)}…</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-sans">No files attached.</p>
                )}
              </div>
              <div className="p-4 flex items-center justify-between text-xs">
                <span className="font-sans text-slate-500">Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-mono font-bold text-[11px]">
                  <Clock className="w-3.5 h-3.5" /> Filed
                </span>
              </div>
              {submittedAt && (
                <div className="p-4 flex items-center justify-between text-xs">
                  <span className="font-sans text-slate-500">Submitted</span>
                  <span className="font-mono text-slate-700">
                    {new Date(submittedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={resetToNone}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DisputeCenter;
