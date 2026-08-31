import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge, type StatusVariant } from "@/components/common/StatusBadge";
import { MetricDial } from "@/components/common/MetricDial";
import { SourceRef } from "@/components/common/SourceRef";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { 
  aiService, 
  TradeRiskAnalysis, 
  ComplianceAnalysis, 
  TradeAnomalyResult,
  TradeReportResponse,
  RAGRetrievedPassage
} from "@/services/api/aiService";
import { 
  Activity, 
  Gauge, 
  Percent, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Search, 
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function riskLevelToStatus(level: TradeRiskAnalysis["riskLevel"] | string): StatusVariant {
  switch (level) {
    case "LOW":
    case "NORMAL":
      return "verified";
    case "MODERATE":
      return "pending";
    case "ELEVATED":
    case "HIGH":
      return "review";
    case "CRITICAL":
      return "blocked";
    default:
      return "pending";
  }
}

function dialTone(value: number | null, riskLevel: TradeRiskAnalysis["riskLevel"]): "verified" | "review" | "blocked" | "neutral" {
  if (value == null) return "neutral";
  const status = riskLevelToStatus(riskLevel);
  return status === "blocked" ? "blocked" : status === "review" ? "review" : "verified";
}

export const AssessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { activeDirection, isImporterView } = useWorkspace();

  const commodity = searchParams.get("commodity") || "1121 Steam Extra Long Grain Basmati Rice";
  const origin = searchParams.get("origin") || "IND";
  const destination = searchParams.get("destination") || "ARE";
  const quantityKg = Number(searchParams.get("qty")) || 1000;
  const rawValue = searchParams.get("value");
  const tradeValueUSD = rawValue ? Number(rawValue) : Math.round(quantityKg * 2.10);

  const [activeTab, setActiveTab] = useState<"overview" | "anomaly" | "tariffs" | "rag">("overview");

  const [risk, setRisk] = useState<TradeRiskAnalysis | null>(null);
  const [compliance, setCompliance] = useState<ComplianceAnalysis | null>(null);
  const [anomaly, setAnomaly] = useState<TradeAnomalyResult | null>(null);
  const [hsCode, setHsCode] = useState<string>("100630");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sandboxFlow, setSandboxFlow] = useState<string>(activeDirection);
  const [sandboxHs6, setSandboxHs6] = useState<number>(100630);
  const [sandboxPartner, setSandboxPartner] = useState<string>(destination);
  const [sandboxQty, setSandboxQty] = useState<number>(quantityKg);
  const [sandboxValue, setSandboxValue] = useState<number>(tradeValueUSD);
  const [sandboxResult, setSandboxResult] = useState<TradeAnomalyResult | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  const [ragQuery, setRagQuery] = useState(`India ${destination} CEPA trade tariff rules and documentation for ${commodity} export`);
  const [ragResults, setRagResults] = useState<{
    passages: RAGRetrievedPassage[];
    structuredEvidence: Record<string, any>;
    sourcesCited: string[];
  } | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [dossierData, setDossierData] = useState<TradeReportResponse | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);

  const runAssessment = async () => {
    setLoading(true);
    setError(null);
    try {
      const hs = await aiService.classifyHSCode(commodity, `${quantityKg} kg`, origin, destination);
      const hs6Int = parseInt(hs.hsCode.replace(/\D/g, "").slice(0, 6), 10) || 100630;
      setHsCode(hs.hsCode);
      setSandboxHs6(hs6Int);

      const anomalyRes = await aiService.predictTradeAnomaly(activeDirection, hs6Int, destination, tradeValueUSD, quantityKg, "kg");
      setAnomaly(anomalyRes);
      setSandboxResult(anomalyRes);

      const [riskResult, complianceResult] = await Promise.all([
        aiService.analyzeTradeRisk(commodity, origin, destination, tradeValueUSD, hs6Int, anomalyRes),
        aiService.analyzeCompliance(hs.hsCode, origin, destination, tradeValueUSD, []),
      ]);

      setRisk(riskResult);
      setCompliance(complianceResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade assessment failed — one or more models unreachable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAssessment();
  }, [commodity, origin, destination, quantityKg, tradeValueUSD, activeDirection]);

  const handleRunSandbox = async () => {
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const res = await aiService.predictTradeAnomaly(
        sandboxFlow,
        sandboxHs6,
        sandboxPartner,
        sandboxValue,
        sandboxQty,
        "kg"
      );
      setSandboxResult(res);
    } catch (err: any) {
      setSandboxError(err instanceof Error ? err.message : "Anomaly model request failed.");
    } finally {
      setSandboxLoading(false);
    }
  };

  const handleRunRAG = async (queryText?: string) => {
    const q = queryText || ragQuery;
    if (!q.trim()) return;
    setRagLoading(true);
    setRagError(null);
    try {
      const res = await aiService.queryRAG(q, origin, destination, sandboxHs6, 5);
      setRagResults(res);
    } catch (err: any) {
      setRagError(err instanceof Error ? err.message : "Regulatory RAG request failed.");
    } finally {
      setRagLoading(false);
    }
  };

  const handleGenerateDossier = async () => {
    setIsDossierOpen(true);
    setDossierLoading(true);
    setDossierError(null);
    try {
      const rep = await aiService.generateTradeReport({
        productQuery: commodity,
        originCountry: origin,
        destinationCountry: destination,
        quantityKg,
        tradeValueUSD,
        tradeFlow: activeDirection,
      });
      setDossierData(rep);
    } catch (err: any) {
      setDossierError(err.message || "Failed to generate trade dossier.");
    } finally {
      setDossierLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: isImporterView ? "Import risk" : "Export risk", icon: Activity },
    { id: "anomaly", label: "Trade anomaly", icon: Gauge },
    { id: "tariffs", label: "Tariffs & documents", icon: Percent },
    { id: "rag", label: "Regulatory evidence", icon: BookOpen },
  ] as const;

  return (
    <AppShell maxWidth="xl">
      <div className="space-y-6 select-none">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-tertiary)]">
            <Link to="/home" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
            <span>&gt;</span>
            <span className="text-[var(--text-secondary)] font-semibold">Assess</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)] tracking-tight">
                  {isImporterView ? "Import corridor assessment" : "Export corridor assessment"}
                </h1>
                {risk && (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border",
                    risk.riskLevel === "CRITICAL"
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                      : risk.riskLevel === "ELEVATED"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  )}>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      risk.riskLevel === "CRITICAL" ? "bg-rose-600 animate-pulse" : risk.riskLevel === "ELEVATED" ? "bg-amber-600" : "bg-emerald-600"
                    )} />
                    Risk: {risk.riskLevel}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans">
                {commodity} · {origin} → {destination} · {quantityKg.toLocaleString()} kg · Live model run ({activeDirection})
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateDossier}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white text-xs font-mono font-bold transition-all shadow-sm cursor-pointer shrink-0 self-start lg:self-center"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Full Trade Dossier</span>
            </button>
          </div>
        </div>

        <div className="bg-[var(--surface-1)] p-1 rounded-2xl border border-[var(--hairline)] shadow-sm">
          <div className="flex flex-wrap items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "rag" && !ragResults) handleRunRAG();
                  }}
                  className={cn(
                    "flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer",
                    isActive
                      ? "bg-white text-slate-950 shadow-sm border border-slate-200/80 font-bold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-emerald-700" : "text-[var(--text-tertiary)]")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <LoadingSkeleton variant="card" count={2} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={runAssessment} />
        ) : (
          <div className="space-y-6">
            {activeTab === "overview" && risk && compliance && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Live assessment outputs
                    </h3>
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                      HS · anomaly · compliance
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <MetricDial label="Anomaly risk" value={risk.subscores.transactionRisk} tone={dialTone(risk.subscores.transactionRisk, risk.riskLevel)} className="mx-auto" />
                    <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] flex flex-col justify-center min-h-[148px]">
                      <span className="text-[10px] uppercase font-mono text-[var(--text-tertiary)]">HS classification</span>
                      <span className="mt-2 text-xl font-mono font-bold text-[var(--text-primary)]">{hsCode || "Unavailable"}</span>
                      <span className="mt-1 text-[11px] text-emerald-700 font-mono">Live catalogue match</span>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] flex flex-col justify-center min-h-[148px]">
                      <span className="text-[10px] uppercase font-mono text-[var(--text-tertiary)]">Preferential tariff</span>
                      <span className="mt-2 text-xl font-mono font-bold text-emerald-700">{compliance.tariffRate}</span>
                      <span className="mt-1 text-[11px] text-[var(--text-tertiary)] truncate" title={compliance.tradeAgreement}>{compliance.tradeAgreement}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] flex flex-col justify-center min-h-[148px]">
                      <span className="text-[10px] uppercase font-mono text-[var(--text-tertiary)]">Required documents</span>
                      <span className="mt-2 text-xl font-mono font-bold text-[var(--text-primary)]">{compliance.mandatoryDocuments.length}</span>
                      <span className="mt-1 text-[11px] text-[var(--text-tertiary)]">From live compliance rules</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[var(--text-secondary)]">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Executive Risk Recommendation</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] text-xs text-[var(--text-primary)] font-sans leading-relaxed">
                      {risk.recommendation}
                    </div>

                    {risk.keyDrivers.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase font-semibold">Key Model Signals:</span>
                        <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
                          {risk.keyDrivers.map((driver, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                              <span>{driver}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="p-5 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-3 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[var(--text-secondary)] mb-3">
                        <Percent className="w-4 h-4 text-sky-600" />
                        <span>Bilateral Tariff &amp; Duty Framework</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)]">
                          <span className="text-[10px] uppercase font-mono text-[var(--text-tertiary)] block">Preferential Tariff</span>
                          <span className="text-base font-mono font-bold text-emerald-600 mt-0.5 block">{compliance.tariffRate}</span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">Under {compliance.tradeAgreement}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)]">
                          <span className="text-[10px] uppercase font-mono text-[var(--text-tertiary)] block">Standard MFN</span>
                          <span className="text-base font-mono font-bold text-[var(--text-primary)] mt-0.5 block">{compliance.standardMFNRate}</span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">Non-preferential rate</span>
                        </div>
                      </div>
                    </div>

                    {compliance.estimatedSavingsUSD != null && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs flex items-center justify-between">
                        <span className="font-medium">Estimated CEPA Duty Savings:</span>
                        <span className="font-mono font-bold text-sm text-emerald-700">${compliance.estimatedSavingsUSD.toLocaleString()} USD</span>
                      </div>
                    )}
                  </div>
                </div>

                {compliance.mandatoryDocuments.length > 0 && (
                  <div className="p-5 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-3 shadow-sm">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Mandatory Regulatory Documents ({compliance.mandatoryDocuments.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {compliance.mandatoryDocuments.map((doc) => (
                        <div key={doc.name} className="p-3.5 rounded-xl border border-[var(--hairline)] bg-[var(--surface-2)] text-xs flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--text-primary)] truncate">{doc.name}</div>
                            <div className="text-[11px] text-[var(--text-tertiary)] truncate">{doc.issuingAuthority}</div>
                          </div>
                          {doc.mandatory && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 text-[10px] font-mono font-bold shrink-0 border border-amber-500/20">
                              Required
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "anomaly" && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3">
                    <div>
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Interactive Trade Anomaly Simulation Sandbox
                      </h3>
                      <p className="text-xs text-[var(--text-tertiary)] font-sans mt-0.5">
                        Test trade parameters against the XGBoost + IsolationForest anomaly models in real time.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunSandbox}
                      disabled={sandboxLoading}
                      className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", sandboxLoading && "animate-spin")} />
                      <span>{sandboxLoading ? "Predicting..." : "Run Anomaly Inference"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)]">Trade Flow</label>
                      <select
                        value={sandboxFlow}
                        onChange={(e) => setSandboxFlow(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] font-mono text-[var(--text-primary)] outline-none"
                      >
                        <option value="Export">Export (Outbound)</option>
                        <option value="Import">Import (Inbound)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)]">HS6 Code</label>
                      <input
                        type="number"
                        value={sandboxHs6}
                        onChange={(e) => setSandboxHs6(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] font-mono text-[var(--text-primary)] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)]">Partner Country (ISO3)</label>
                      <input
                        type="text"
                        value={sandboxPartner}
                        onChange={(e) => setSandboxPartner(e.target.value.toUpperCase())}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] font-mono text-[var(--text-primary)] outline-none uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)]">Quantity (kg)</label>
                      <input
                        type="number"
                        value={sandboxQty}
                        onChange={(e) => setSandboxQty(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] font-mono text-[var(--text-primary)] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-[var(--text-tertiary)]">Trade Value (USD)</label>
                      <input
                        type="number"
                        value={sandboxValue}
                        onChange={(e) => setSandboxValue(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] font-mono text-[var(--text-primary)] outline-none"
                      />
                    </div>
                  </div>
                  {sandboxError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-mono">
                      {sandboxError}
                    </div>
                  )}
                </div>

                {sandboxResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-1">
                        <span className="text-[10px] uppercase font-mono text-[var(--text-tertiary)]">Statistical Anomaly Score</span>
                        <div className={cn(
                          "text-xl font-mono font-bold",
                          sandboxResult.risk?.is_anomaly ? "text-rose-600" : "text-emerald-600"
                        )}>
                          {sandboxResult.risk?.anomaly_score !== undefined
                            ? sandboxResult.risk.anomaly_score.toFixed(4)
                            : "Unavailable"}
                        </div>
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)] block">
                          Decision Threshold: {sandboxResult.metadata?.threshold !== undefined ? sandboxResult.metadata.threshold : "Unavailable"}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-1">
                        <span className="text-[10px] uppercase font-mono text-[var(--text-tertiary)]">Risk Classification</span>
                        <div className="text-xl font-mono font-bold text-[var(--text-primary)]">
                          {sandboxResult.risk?.risk_level || "NORMAL"}
                        </div>
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)] block">
                          Anomaly Pattern: {sandboxResult.risk?.anomaly_type || "NORMAL"}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-1">
                        <span className="text-[10px] uppercase font-mono text-[var(--text-tertiary)]">Model Provenance</span>
                        <div className="text-sm font-mono font-bold text-sky-600">
                          {sandboxResult.metadata?.model_name || "Unavailable"}
                        </div>
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)] block">
                          Engine: {sandboxResult.risk?.label_source || "MODEL"}
                        </span>
                      </div>
                    </div>

                    {sandboxResult.unsupervised_screen && (
                      <div className="p-5 rounded-2xl border border-sky-200/80 bg-sky-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono uppercase font-bold text-sky-900">
                            Unsupervised IsolationForest Screen &amp; Peer Price Distribution
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 font-bold">
                            NON-CIRCULAR ML
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3.5 rounded-xl bg-white border border-sky-100 space-y-1">
                            <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase block">IsolationForest Outlier Detection</span>
                            <div className="font-bold text-[var(--text-primary)]">
                              {sandboxResult.unsupervised_screen.unsupervised_anomaly_score?.flagged ? (
                                <span className="text-rose-600 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Flagged as Multivariate Outlier
                                </span>
                              ) : (
                                <span className="text-emerald-600 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Normal Behavioral Pattern
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[var(--text-tertiary)] font-mono block">
                              Score: {sandboxResult.unsupervised_screen.unsupervised_anomaly_score?.anomaly_score !== undefined
                                ? sandboxResult.unsupervised_screen.unsupervised_anomaly_score.anomaly_score.toFixed(3)
                                : "Unavailable"}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-xl bg-white border border-sky-100 space-y-1">
                            <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase block">Peer Price Z-Score</span>
                            <div className="font-bold text-[var(--text-primary)]">
                              {sandboxResult.unsupervised_screen.peer_price_comparison ? (
                                <span>
                                  Z = {sandboxResult.unsupervised_screen.peer_price_comparison.peer_price_zscore?.toFixed(2)} (Median ${sandboxResult.unsupervised_screen.peer_price_comparison.peer_median_usd_per_kg?.toFixed(2)}/kg)
                                </span>
                              ) : (
                                <span className="text-emerald-600">Unit pricing aligned with corridor baseline</span>
                              )}
                            </div>
                            <span className="text-[10px] text-[var(--text-tertiary)] font-mono block">
                              Detects under-invoicing, over-invoicing, or transfer mispricing
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {sandboxResult.signals && sandboxResult.signals.length > 0 && (
                      <div className="p-5 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-3 shadow-sm">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                          Causal Deviation Signals ({sandboxResult.signals.length})
                        </span>
                        <div className="space-y-2">
                          {sandboxResult.signals.map((sig, i) => (
                            <div key={i} className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] flex items-center justify-between text-xs gap-3">
                              <span className="text-[var(--text-secondary)] font-sans">{sig.description || sig.message}</span>
                              <span className={cn(
                                "px-2.5 py-0.5 rounded font-mono font-bold text-[10px] shrink-0 border",
                                sig.severity === "HIGH" || sig.direction === "HIGHER_IS_WORSE"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              )}>
                                {sig.code || sig.signal || "NORMAL"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "tariffs" && compliance && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[var(--text-secondary)] border-b border-[var(--hairline)] pb-3">
                      <Percent className="w-4 h-4 text-emerald-600" />
                      <span>Bilateral Preferential Tariff Agreement</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-[var(--hairline)]">
                        <span className="text-[var(--text-secondary)]">Governing Treaty</span>
                        <span className="font-semibold text-[var(--text-primary)]">{compliance.tradeAgreement}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[var(--hairline)]">
                        <span className="text-[var(--text-secondary)]">Preferential Concession Rate</span>
                        <span className="font-mono font-bold text-emerald-600 text-sm">{compliance.tariffRate}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[var(--hairline)]">
                        <span className="text-[var(--text-secondary)]">Standard WTO MFN Rate</span>
                        <span className="font-mono text-[var(--text-primary)]">{compliance.standardMFNRate}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-[var(--text-secondary)]">Net Duty Cost Savings</span>
                          <span className="font-mono font-bold text-emerald-600">
                          {compliance.estimatedSavingsUSD != null ? `$${compliance.estimatedSavingsUSD.toLocaleString()} USD` : "Unavailable"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--surface-2)] text-[11px] text-[var(--text-tertiary)] font-sans">
                      {compliance.disclaimer}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[var(--text-secondary)] border-b border-[var(--hairline)] pb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Non-Tariff Measures (NTMs) &amp; Standards</span>
                    </div>

                    {compliance.ntmBarriers && compliance.ntmBarriers.length > 0 ? (
                      <ul className="space-y-2 text-xs">
                        {compliance.ntmBarriers.map((bar, i) => (
                          <li key={i} className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] flex items-start gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span className="text-[var(--text-secondary)] font-sans">{bar}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center rounded-xl bg-[var(--surface-2)] text-xs text-[var(--text-tertiary)] font-mono">
                        No active Non-Tariff Barriers reported for this corridor.
                      </div>
                    )}
                  </div>
                </div>

                {compliance.sourcesCited && compliance.sourcesCited.length > 0 && (
                  <div className="p-5 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-3 shadow-sm">
                    <h4 className="text-xs font-mono font-bold uppercase text-[var(--text-secondary)]">
                      Official Legal &amp; Schedule Citations ({compliance.sourcesCited.length})
                    </h4>
                    <div className="flex flex-wrap gap-2.5">
                      {compliance.sourcesCited.map((cite) => (
                        <SourceRef key={cite} citation={cite} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "rag" && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3">
                    <div>
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Regulatory RAG Knowledge Retriever (TF-IDF &amp; Vector Embeddings)
                      </h3>
                      <p className="text-xs text-[var(--text-tertiary)] font-sans mt-0.5">
                        Live semantic passage retrieval across official trade manuals, customs tariffs, DGFT notices, and treaties.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={ragQuery}
                        onChange={(e) => setRagQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRunRAG()}
                        placeholder="Search trade regulations, rules of origin, permits..."
                        className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] text-xs font-sans text-[var(--text-primary)] outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRunRAG()}
                      disabled={ragLoading}
                      className="px-4 h-10 rounded-xl bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white text-xs font-mono font-bold transition-all shrink-0 cursor-pointer disabled:opacity-60"
                    >
                      {ragLoading ? "Retrieving..." : "Search RAG"}
                    </button>
                  </div>
                  {ragError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-mono">
                      {ragError}
                    </div>
                  )}
                </div>

                {ragResults ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
                      <span>Retrieved Evidence ({ragResults.passages.length} passages)</span>
                      <span className="text-emerald-700">Cosine Similarity Ranked</span>
                    </div>

                    <div className="space-y-3">
                      {ragResults.passages.map((passage, pIdx) => (
                        <div key={pIdx} className="p-4 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] space-y-2 shadow-sm">
                          <div className="flex items-center justify-between gap-2 border-b border-[var(--hairline)] pb-2">
                            <span className="text-xs font-semibold text-[var(--text-primary)] font-mono">{passage.source}</span>
                            {passage.relevance !== undefined && (
                              <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-mono font-bold">
                                Match: {Math.round(passage.relevance * 100)}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                            {passage.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] text-xs text-[var(--text-tertiary)] font-mono">
                    Type a query or search to retrieve regulatory evidence.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Dialog open={isDossierOpen} onOpenChange={setIsDossierOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--hairline)] p-6 rounded-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 font-bold uppercase tracking-wide">
                <Sparkles className="w-4 h-4" />
                <span>Autonomous Multi-Model Synthesis</span>
              </div>
              <DialogTitle className="text-xl font-display font-bold">
                Executive Trade Intelligence Dossier
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-secondary)] font-sans">
                Corridor: {origin} → {destination} · Commodity: {commodity} ({quantityKg.toLocaleString()} kg)
              </DialogDescription>
            </DialogHeader>

            {dossierLoading ? (
              <div className="p-12 text-center text-xs font-mono text-[var(--text-tertiary)] animate-pulse space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto" />
                <p>Synthesizing XGBoost forecasts, anomaly signals, CEPA rules, and OFAC entities...</p>
              </div>
            ) : dossierError ? (
              <div className="p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-mono">
                {dossierError}
              </div>
            ) : dossierData ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] space-y-2">
                  <span className="text-[10px] font-mono uppercase text-emerald-700 font-bold block">
                    Executive Briefing Narrative
                  </span>
                  <pre className="text-xs font-sans text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {dossierData.executive_summary}
                  </pre>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block uppercase">Demand</span>
                    <span className={cn(
                      "font-bold block mt-0.5",
                      dossierData.sections?.demand?.available ? "text-emerald-700" : "text-amber-600"
                    )}>
                      {dossierData.sections?.demand?.available ? "AVAILABLE (XGBoost)" : "UNAVAILABLE"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block uppercase">Anomaly</span>
                    <span className={cn(
                      "font-bold block mt-0.5",
                      dossierData.sections?.anomaly?.available ? "text-sky-700" : "text-amber-600"
                    )}>
                      {dossierData.sections?.anomaly?.available ? "DUAL-SCREEN ACTIVE" : "UNAVAILABLE"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block uppercase">Compliance</span>
                    <span className={cn(
                      "font-bold block mt-0.5",
                      dossierData.sections?.compliance?.available ? "text-emerald-700" : "text-amber-600"
                    )}>
                      {dossierData.sections?.compliance?.available ? "CEPA PREFERENTIAL" : "UNAVAILABLE"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block uppercase">Counterparty</span>
                    <span className={cn(
                      "font-bold block mt-0.5",
                      dossierData.sections?.counterparty?.available ? "text-emerald-700" : "text-[var(--text-tertiary)]"
                    )}>
                      {dossierData.sections?.counterparty?.available ? "SCREENED" : "ORG SPECIFIC"}
                    </span>
                  </div>
                </div>

                {dossierData.missing_dimensions && dossierData.missing_dimensions.length > 0 && (
                  <p className="text-[10px] font-mono text-amber-600">
                    Missing: {dossierData.missing_dimensions.join(", ")}
                  </p>
                )}

                <p className="text-[10px] font-mono text-[var(--text-tertiary)] pt-2 border-t border-[var(--hairline)]">
                  {dossierData.disclaimer}
                </p>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
};

export default AssessPage;
