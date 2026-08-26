/**
 * n8n Workflow Automation Service Client
 * Routes trade lifecycle events through the n8n webhook orchestration layer.
 *
 * Integration Rules:
 * - Real calls are attempted first when VITE_N8N_WEBHOOK_URL is set
 * - Development fallback is ONLY used when the env var is NOT set
 * - Fallback is clearly identified as "FALLBACK" in the status field
 * - A broken real backend NEVER appears as successful via the fallback
 */

export interface WorkflowExecutionResult {
  workflowId: string;
  workflowName: string;
  executionId: string;
  status: "SUCCESS" | "RUNNING" | "FAILED" | "PARTIAL" | "UNAVAILABLE" | "FALLBACK";
  startedAt: string;
  finishedAt: string;
  nodesExecuted: number;
  payloadOutput: Record<string, any>;
  /** Present only when status is FALLBACK: warns the UI that this is not a real result */
  fallbackReason?: string;
  /** Backend latency in ms when using real calls */
  latencyMs?: number;
}

/**
 * Payload for the Analyze Trade n8n webhook.
 * Maps directly to the Set — Normalize Input node in the workflow.
 */
export interface AnalyzeTradePayload {
  product: string;
  origin_country: string;
  destination_country?: string;
  quantity_kg: number;
  target_price_usd?: number;
  certifications?: string[];
  trade_flow?: "Export" | "Import";
  regime?: "balanced" | "aggressive" | "conservative" | "risk_averse";
  top_n?: number;
  reference_date?: string;
  user_id?: string;
  org_id?: string;
}

class N8nWorkflowService {
  private webhookBaseUrl: string;
  public readonly isRealBackend: boolean;
  public readonly isDev: boolean;

  constructor() {
    const envUrl = (import.meta as any).env?.VITE_N8N_WEBHOOK_URL;
    this.webhookBaseUrl = envUrl || "http://localhost:5678/webhook";
    this.isRealBackend = Boolean(envUrl);
    this.isDev = (import.meta as any).env?.DEV ?? true;
  }

  /**
   * Checks whether the local or configured n8n instance is reachable.
   */
  public async checkHealth(): Promise<{ isOnline: boolean; url: string; error?: string }> {
    try {
      // Browser-safe probe to n8n webhook listener (no-cors prevents preflight rejection)
      await fetch(`${this.webhookBaseUrl}/globex-analyze-trade-v2`, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ probe: true, product: "Basmati Rice", origin_country: "IND", destination_country: "ARE", quantity_kg: 50000 }),
        signal: AbortSignal.timeout(2500),
      });
      return { isOnline: true, url: `${this.webhookBaseUrl}/globex-analyze-trade-v2` };
    } catch (err: any) {
      return { isOnline: false, url: `${this.webhookBaseUrl}/globex-analyze-trade-v2`, error: err?.message || "Unreachable" };
    }
  }

  /**
   * POST to an n8n webhook and return the result.
   * Never fabricates fallback data on failure — always returns the real status.
   */
  private async callWebhook(
    path: string,
    body: Record<string, unknown>,
    workflowId: string,
    workflowName: string
  ): Promise<WorkflowExecutionResult> {
    const startedAt = new Date().toISOString();
    const t0 = performance.now();

    try {
      const response = await fetch(`${this.webhookBaseUrl}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
      });

      const latencyMs = Math.round(performance.now() - t0);

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        return {
          workflowId,
          workflowName,
          executionId: `exec_${Date.now()}`,
          status: "FAILED",
          startedAt,
          finishedAt: new Date().toISOString(),
          nodesExecuted: 0,
          payloadOutput: {
            error: `n8n webhook returned HTTP ${response.status}: ${response.statusText}`,
            detail: errBody.slice(0, 500),
            hint: `Make sure the workflow containing webhook '/${path}' is active in n8n.`,
          },
          latencyMs,
        };
      }

      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : { status: "SUCCESS", message: "Workflow executed successfully." };
      } catch {
        data = { status: "SUCCESS", message: text || "Workflow executed successfully." };
      }

      return {
        workflowId,
        workflowName,
        executionId: data.execution_id || `exec_${Date.now()}`,
        status: "SUCCESS",
        startedAt,
        finishedAt: new Date().toISOString(),
        nodesExecuted: data.nodes_executed || 1,
        payloadOutput: data,
        latencyMs,
      };
    } catch (err: any) {
      const isNetworkError =
        err?.name === "AbortError" ||
        err?.name === "TypeError" ||
        String(err).includes("fetch") ||
        String(err).includes("Failed to fetch");

      return {
        workflowId,
        workflowName,
        executionId: `exec_${Date.now()}`,
        status: "UNAVAILABLE",
        startedAt,
        finishedAt: new Date().toISOString(),
        nodesExecuted: 0,
        payloadOutput: {
          error: isNetworkError
            ? `n8n server is offline or unreachable at ${this.webhookBaseUrl}`
            : String(err),
          hint: "Launch n8n locally (`n8n start` at http://localhost:5678) and activate 'GlobeX Trade Automation' workflow.",
        },
        latencyMs: Math.round(performance.now() - t0),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Workflow 1: Trade Intelligence / Analyze Trade
  // ──────────────────────────────────────────────────────────────
  public async triggerTradeIntelligenceWorkflow(
    payload: AnalyzeTradePayload
  ): Promise<WorkflowExecutionResult> {
    return this.callWebhook(
      "globex-analyze-trade-v2",
      payload as unknown as Record<string, unknown>,
      "wf_trade_intelligence_02",
      "WF-02: GlobeXAI Production Trade Automation OS v2 (Schema-Corrected)"
    );
  }

  // ──────────────────────────────────────────────────────────────
  // Workflow 2: Document Verification
  // ──────────────────────────────────────────────────────────────
  public async triggerDocumentVerificationWorkflow(
    tradeId: string,
    documentUrl: string,
    documentType: string = "COMMERCIAL_INVOICE",
    uploaderOrgId?: string
  ): Promise<WorkflowExecutionResult> {
    return this.callWebhook(
      "document-uploaded",
      { trade_id: tradeId, document_url: documentUrl, document_type: documentType, uploader_org_id: uploaderOrgId },
      "wf_doc_verification_02",
      "WF-02: Document OCR & Blockchain Verification"
    );
  }

  // ──────────────────────────────────────────────────────────────
  // Workflow 3: Trade Creation + Escrow
  // ──────────────────────────────────────────────────────────────
  public async triggerEscrowLifecycleWorkflow(
    tradeId: string,
    counterpartyOrgId: string,
    eventData?: Record<string, unknown>
  ): Promise<WorkflowExecutionResult> {
    return this.callWebhook(
      "create-trade",
      { trade_id: tradeId, counterparty_org_id: counterpartyOrgId, ...eventData },
      "wf_escrow_manager_03",
      "WF-03: Trade Creation + Escrow"
    );
  }

  // ──────────────────────────────────────────────────────────────
  // Workflow 4: Shipment Tracking
  // ──────────────────────────────────────────────────────────────
  public async triggerShipmentIngestionWorkflow(
    voyageNumber: string
  ): Promise<WorkflowExecutionResult> {
    return this.callWebhook(
      "shipment-status",
      { voyage_number: voyageNumber },
      "wf_shipment_ingest_04",
      "WF-04: Shipment Tracking & Settlement"
    );
  }

  public getStatus() {
    return {
      webhookBaseUrl: this.webhookBaseUrl,
      isRealBackend: this.isRealBackend,
      note: this.isDev
        ? "Development mode — set VITE_N8N_WEBHOOK_URL to enable real n8n calls"
        : "Production mode — calling real n8n instance",
      activeWorkflowsCount: 5,
      workflows: [
        { id: "wf_01", name: "Trade Intelligence Aggregator", trigger: "POST /analyze-trade", status: "ACTIVE" },
        { id: "wf_02", name: "Document OCR & Verification", trigger: "POST /document-uploaded", status: "ACTIVE" },
        { id: "wf_03", name: "Trade Creation + Escrow", trigger: "POST /create-trade", status: "ACTIVE" },
        { id: "wf_04", name: "Shipment Polling & Settlement", trigger: "Scheduled 6h", status: "ACTIVE" },
        { id: "wf_05", name: "Trade Data Ingestion", trigger: "Daily 02:00 UTC", status: "ACTIVE" },
      ],
    };
  }
}

export const n8nWorkflowService = new N8nWorkflowService();
