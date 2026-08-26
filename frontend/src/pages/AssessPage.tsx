import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge, type StatusVariant } from "@/components/common/StatusBadge";
import { MetricDial } from "@/components/common/MetricDial";
import { SourceRef } from "@/components/common/SourceRef";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { aiService, TradeRiskAnalysis, ComplianceAnalysis } from "@/services/api/aiService";

function riskLevelToStatus(level: TradeRiskAnalysis["riskLevel"]): StatusVariant {
  switch (level) {
    case "LOW":
      return "verified";
    case "MODERATE":
      return "pending";
    case "ELEVATED":
      return "review";
    case "CRITICAL":
      return "blocked";
    default:
      return "pending";
  }
}

function dialTone(value: number | null, riskLevel: TradeRiskAnalysis["riskLevel"]): "verified" | "review" | "blocked" | "neutral" {
  if (value == null) return "neutral";
  return riskLevelToStatus(riskLevel) === "blocked" ? "blocked" : riskLevelToStatus(riskLevel) === "review" ? "review" : "verified";
}

export const AssessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { activeDirection } = useWorkspace();

  const commodity = searchParams.get("commodity") || "Basmati Rice";
  const origin = searchParams.get("origin") || "IND";
  const destination = searchParams.get("destination") || "ARE";
  const quantityKg = Number(searchParams.get("qty")) || 1000;
  const tradeValueUSD = Number(searchParams.get("value")) || 500000;

  const [risk, setRisk] = useState<TradeRiskAnalysis | null>(null);
  const [compliance, setCompliance] = useState<ComplianceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runAssessment = async () => {
    setLoading(true);
    setError(null);
    try {
      const hs = await aiService.classifyHSCode(commodity, `${quantityKg} kg`, origin, destination);
      const hs6Int = parseInt(hs.hsCode.replace(/\D/g, "").slice(0, 6), 10) || 100630;

      const anomaly = await aiService.predictTradeAnomaly(activeDirection, hs6Int, destination, tradeValueUSD, quantityKg, "kg");
      const [riskResult, complianceResult] = await Promise.all([
        aiService.analyzeTradeRisk(commodity, origin, destination, tradeValueUSD, hs6Int, anomaly),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commodity, origin, destination, quantityKg, tradeValueUSD, activeDirection]);

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-5">
        <PageHeader
          breadcrumbs={[{ label: "Assess" }]}
          title="Trade Assessment"
          subtitle={`${commodity} · ${origin} → ${destination} · ${quantityKg.toLocaleString()} kg (${activeDirection})`}
          badge={risk ? <StatusBadge status={riskLevelToStatus(risk.riskLevel)} label={`Risk: ${risk.riskLevel}`} size="md" /> : undefined}
        />

        {loading ? (
          <LoadingSkeleton variant="card" count={2} />
        ) : error ? (
          <ErrorState message={error} onRetry={runAssessment} />
        ) : risk && compliance ? (
          <>
            <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] space-y-2">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                <span className="text-[var(--text-secondary)]">
                  Tariff: <strong className="text-[var(--text-primary)]">{compliance.tariffRate}</strong>{" "}
                  <span className="text-[var(--text-tertiary)]">(MFN {compliance.standardMFNRate})</span>
                </span>
                <span className="text-[var(--text-secondary)]">
                  Agreement: <strong className="text-[var(--text-primary)]">{compliance.tradeAgreement}</strong>
                </span>
                {compliance.estimatedSavingsUSD != null && (
                  <span className="text-[var(--text-secondary)]">
                    Est. savings: <strong className="text-[var(--text-primary)]">${compliance.estimatedSavingsUSD.toLocaleString()}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">{compliance.disclaimer}</p>
              {compliance.sourcesCited && compliance.sourcesCited.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {compliance.sourcesCited.map((s) => (
                    <SourceRef key={s} citation={s} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
                Six Result Dimensions — never collapsed into one score
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--surface-1)]">
                <MetricDial label="Composite" value={risk.compositeScore} tone={dialTone(risk.compositeScore, risk.riskLevel)} className="mx-auto" />
                <MetricDial label="Counterparty Risk" value={risk.subscores.counterpartyRisk} tone={dialTone(risk.subscores.counterpartyRisk, risk.riskLevel)} className="mx-auto" />
                <MetricDial label="Transaction Risk" value={risk.subscores.transactionRisk} tone={dialTone(risk.subscores.transactionRisk, risk.riskLevel)} className="mx-auto" />
                <MetricDial label="Regulatory Risk" value={risk.subscores.regulatoryRisk} tone={dialTone(risk.subscores.regulatoryRisk, risk.riskLevel)} className="mx-auto" />
                <MetricDial label="Document Integrity" value={risk.subscores.documentIntegrity} tone={dialTone(risk.subscores.documentIntegrity, risk.riskLevel)} className="mx-auto" />
                <MetricDial label="Shipment Risk" value={risk.subscores.shipmentRisk} tone={dialTone(risk.subscores.shipmentRisk, risk.riskLevel)} className="mx-auto" />
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] space-y-2">
              <div className="text-xs font-semibold text-[var(--text-primary)]">{risk.recommendation}</div>
              {risk.keyDrivers.length > 0 && (
                <ul className="text-xs text-[var(--text-secondary)] list-disc list-inside space-y-0.5">
                  {risk.keyDrivers.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>

            {compliance.mandatoryDocuments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Mandatory Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {compliance.mandatoryDocuments.map((doc) => (
                    <div key={doc.name} className="p-3 rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--surface-1)] text-xs flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{doc.name}</div>
                        <div className="text-[var(--text-tertiary)]">{doc.issuingAuthority}</div>
                      </div>
                      {doc.mandatory && <StatusBadge status="review" label="Required" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
};

export default AssessPage;
