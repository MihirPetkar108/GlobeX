import React, { useState } from "react";
import { Activity, Loader2, Play, TriangleAlert } from "lucide-react";
import { aiService } from "@/services/api/aiService";

type ModelKey = "hs" | "market" | "anomaly" | "match" | "risk" | "compliance" | "sanctions" | "rag" | "ocr" | "report" | "prosCons" | "gate" | "verdict" | "score";

const MODEL_LIST: Array<{ key: ModelKey; label: string; path: string; engine: string }> = [
  { key: "hs", label: "HS6 Classification", path: "/predict/hs-code", engine: "Catalogue resolver" },
  { key: "market", label: "Market Opportunity", path: "/predict/market-opportunity", engine: "XGBoost residual + TreeSHAP" },
  { key: "anomaly", label: "Trade Anomaly", path: "/api/trade-anomaly/predict", engine: "XGBoost + IsolationForest + peer-price z-score" },
  { key: "match", label: "Counterparty Match", path: "/predict/counterparty-match", engine: "Verified supplier matcher" },
  { key: "risk", label: "Counterparty Risk", path: "/predict/counterparty-risk", engine: "Trust, disputes, completed-trade profile" },
  { key: "compliance", label: "Compliance RAG", path: "/compliance/rag-analyze", engine: "CEPA / tariff rules + TF-IDF evidence" },
  { key: "sanctions", label: "Sanctions Screen", path: "/compliance/sanctions-screen", engine: "OFAC / UN restricted-party screen" },
  { key: "rag", label: "Trade RAG Query", path: "/api/v1/rag/query", engine: "Multi-dataset TF-IDF retrieval" },
  { key: "ocr", label: "Document OCR", path: "/documents/ocr-extract", engine: "Trade document extraction" },
  { key: "report", label: "Executive Dossier", path: "/api/v1/trade/generate-report", engine: "Multi-model report synthesis" },
  { key: "prosCons", label: "Country Pros / Cons", path: "/predict/market-opportunity/synthesize-pros-cons", engine: "Optional local Ollama synthesis" },
  { key: "gate", label: "Transaction Compliance Gate", path: "/compliance/transaction-gate", engine: "Fail-closed trade clearance" },
  { key: "verdict", label: "Document Verdict", path: "/compliance/doc-verdict", engine: "OCR + compliance verification" },
  { key: "score", label: "Composite Trade Score", path: "/compliance/trade-synthesis", engine: "Weighted model synthesis" },
];

const inputClass = "w-full rounded-lg bg-[var(--surface-1)] border border-[var(--hairline)] px-2.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-sky-500/50";

export const MLModelConsole: React.FC = () => {
  const [product, setProduct] = useState("Basmati Rice");
  const [origin, setOrigin] = useState("IND");
  const [destination, setDestination] = useState("ARE");
  const [quantity, setQuantity] = useState(50000);
  const [tradeValue, setTradeValue] = useState(550000);
  const [organizationId, setOrganizationId] = useState("demo-organization");
  const [documentUrl, setDocumentUrl] = useState("");
  const [query, setQuery] = useState("What tariff and phytosanitary rules apply to Basmati Rice?");
  const [running, setRunning] = useState<ModelKey | null>(null);
  const [outputs, setOutputs] = useState<Partial<Record<ModelKey, unknown>>>({});
  const [errors, setErrors] = useState<Partial<Record<ModelKey, string>>>({});

  const run = async (key: ModelKey) => {
    setRunning(key);
    setErrors((current) => ({ ...current, [key]: undefined }));
    try {
      let result: unknown;
      if (key === "hs") result = await aiService.classifyHSCode(product, product, origin, destination);
      if (key === "market") result = await aiService.rankMarketOpportunity(product, quantity, "balanced", 6);
      if (key === "anomaly") result = await aiService.predictTradeAnomaly("Export", 100630, destination, tradeValue, quantity, "kg");
      if (key === "match") result = await aiService.semanticMatch(product, undefined, quantity, destination, 100630);
      if (key === "risk") result = await aiService.counterpartyRisk({ organization_id: organizationId, hs6: 100630 });
      if (key === "compliance") result = await aiService.analyzeCompliance("100630", origin, destination, tradeValue, ["ISO 22000", "FSSAI", "APEDA"]);
      if (key === "sanctions") result = await aiService.sanctionsScreen({ exporter_name: organizationId, importer_name: "" });
      if (key === "rag") result = await aiService.queryRAG(query, origin, destination, 100630, 6);
      if (key === "ocr") {
        if (!documentUrl.trim()) throw new Error("Enter a document URL before running OCR.");
        result = await aiService.extractTradeDocument({ document_url: documentUrl.trim(), document_type: "COMMERCIAL_INVOICE" });
      }
      if (key === "report") result = await aiService.generateTradeReport({ productQuery: product, originCountry: origin, destinationCountry: destination, quantityKg: quantity, tradeValueUSD: tradeValue, tradeFlow: "Export" });
      if (key === "prosCons") result = await aiService.synthesizeCountryProsCons({ destination: { iso3: destination }, product: { description: product }, pros: [], cons: [] });
      if (key === "gate") result = await aiService.evaluateTransactionGate({ trade_id: `console-${Date.now()}`, hs6: "100630", origin_country: origin, destination_country: destination, exporter_name: organizationId, importer_name: "" });
      if (key === "verdict") result = await aiService.evaluateDocumentVerdict({ ocr_status: "STUB", ocr_data_source: "stub", compliance_score: null, compliance_flags: [] });
      if (key === "score") result = await aiService.synthesizeTradeScore({ hs6: 100630, market_score: null, anomaly_score: null, risk_level: null, counterparty_match_score: null, counterparty_trust_score: null, compliance_score: null });
      setOutputs((current) => ({ ...current, [key]: result }));
    } catch (error) {
      setErrors((current) => ({ ...current, [key]: error instanceof Error ? error.message : "Model request failed." }));
    } finally { setRunning(null); }
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-sky-500/20 space-y-2">
        <div className="flex items-center gap-2 text-sky-700 text-xs font-bold uppercase"><Activity className="w-3.5 h-3.5" /> Live model inputs</div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <input className={`${inputClass} col-span-2 sm:col-span-2`} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product" />
          <input className={inputClass} value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} placeholder="Origin ISO3" />
          <input className={inputClass} value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} placeholder="Destination ISO3" />
          <input className={inputClass} type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} placeholder="Quantity kg" />
          <input className={inputClass} type="number" value={tradeValue} onChange={(e) => setTradeValue(Number(e.target.value))} placeholder="Trade value USD" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input className={inputClass} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} placeholder="Organization ID" />
          <input className={inputClass} value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="Document URL for OCR" />
          <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="RAG question" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MODEL_LIST.map((model) => (
          <div key={model.key} className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div><div className="text-xs text-[var(--text-primary)] font-bold">{model.label}</div><div className="text-[10px] text-[var(--text-tertiary)]">{model.engine}</div><code className="text-[10px] text-sky-700">{model.path}</code></div>
              <button onClick={() => run(model.key)} disabled={running !== null} className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-sky-500/10 border border-sky-500/30 px-2 py-1 text-[10px] text-sky-700 hover:bg-sky-500/20 disabled:opacity-50"><Play className="w-3 h-3" />{running === model.key ? <Loader2 className="w-3 h-3 animate-spin" /> : "Run"}</button>
            </div>
            {errors[model.key] && <div className="flex gap-1 text-[10px] text-rose-300"><TriangleAlert className="w-3 h-3 shrink-0" />{errors[model.key]}</div>}
            {outputs[model.key] !== undefined && <pre className="max-h-44 overflow-auto rounded-lg bg-[var(--surface-2)] border border-[var(--hairline)] p-2 text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap">{JSON.stringify(outputs[model.key], null, 2)}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MLModelConsole;
