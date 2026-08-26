import { useEffect, useState } from "react";
import { CheckSquare, AlertCircle, FileText, Percent, Loader2 } from "lucide-react";
import { aiService, ComplianceAnalysis } from "@/services/api/aiService";

interface ComplianceChecklistWidgetProps {
  hsCode?: string;
  productName?: string;
  origin?: string;
  destination?: string;
  originIso3?: string;
  destinationIso3?: string;
}

export const ComplianceChecklistWidget = ({
  hsCode = "1006.30.20",
  productName = "1121 Steam Extra Long Grain Basmati Rice",
  origin = "India",
  destination = "United Arab Emirates",
  originIso3 = "IND",
  destinationIso3 = "ARE",
}: ComplianceChecklistWidgetProps) => {
  const [analysis, setAnalysis] = useState<ComplianceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    aiService
      .analyzeCompliance(hsCode, originIso3, destinationIso3)
      .then((result) => {
        if (!cancelled) setAnalysis(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Compliance analysis failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hsCode, originIso3, destinationIso3]);

  const isDemo = analysis?.dataSource === "fallback";

  if (loading) {
    return (
      <div className="glass-panel p-4 bg-card/80 border-border/70 rounded-xl flex items-center justify-center gap-2 text-xs text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        Running compliance analysis…
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="glass-panel p-4 bg-card/80 border-border/70 rounded-xl">
        <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-800/40 flex items-start gap-2 text-red-300 text-[11px]">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="leading-tight">
            Compliance analysis unavailable: {error || "no response"}. Blocked from proceeding —
            never treat a missing analysis as compliant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 bg-card/80 border-border/70 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Compliance & Regulatory Intelligence
          </h4>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            isDemo
              ? "bg-amber-950/60 text-amber-400 border-amber-800/50"
              : "bg-emerald-950/60 text-emerald-400 border-emerald-800/50"
          }`}
        >
          {isDemo ? "DEMO — NOT LIVE" : "LIVE ANALYSIS"}
        </span>
      </div>

      {isDemo && (
        <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[10px] font-mono">
          DEMO DATA — NOT LIVE COMPLIANCE. Backend unreachable; showing illustrative data only.
        </div>
      )}

      {/* Tariff & Trade Treaty Card */}
      <div className="p-3 bg-secondary/50 rounded-lg border border-border space-y-2">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-muted-foreground">Harmonized Tariff (HS Code):</span>
          <span className="font-bold text-primary">{hsCode}</span>
        </div>
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-muted-foreground">Applied Import Duty:</span>
          <span className="font-bold text-emerald-400 flex items-center gap-1">
            <Percent className="w-3 h-3" /> {analysis.tariffRate} ({analysis.tradeAgreement})
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground bg-secondary/70 p-2 rounded border border-border/50">
          Estimated tariff savings for this contract:{" "}
          <strong className="text-emerald-400 font-mono">
            ${analysis.estimatedSavingsUSD.toLocaleString()} USD
          </strong>{" "}
          compared to standard MFN {analysis.standardMFNRate} rates.
        </div>
      </div>

      {/* Mandatory Document Checklist */}
      <div className="space-y-2">
        <div className="text-xs font-mono font-semibold text-foreground flex items-center justify-between">
          <span>Mandatory Document Checklist</span>
          <span className="text-[11px] text-muted-foreground">
            {analysis.mandatoryDocuments.length} required
          </span>
        </div>
        <div className="space-y-1.5">
          {analysis.mandatoryDocuments.map((doc) => (
            <div
              key={doc.name}
              className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/40 text-xs"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <div>
                  <div className="font-medium text-foreground">{doc.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{doc.issuingAuthority}</div>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  doc.mandatory
                    ? "bg-amber-950/50 text-amber-400 border-amber-800/40"
                    : "bg-secondary text-muted-foreground border-border/40"
                }`}
              >
                {doc.mandatory ? "Required" : "Optional"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Non-Tariff Measures (NTMs) */}
      {analysis.ntmBarriers.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-mono font-semibold text-foreground">
            Non-Tariff Measures & Import Rules
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {analysis.ntmBarriers.map((req, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px]">
                <span className="text-primary font-bold">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legal Disclaimer Warning */}
      <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-start gap-2 text-amber-300 text-[11px]">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p className="leading-tight">{analysis.disclaimer}</p>
      </div>
    </div>
  );
};

export default ComplianceChecklistWidget;
