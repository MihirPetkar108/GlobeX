/**
 * Real escrow service — calls the FastAPI escrow router (src/api/escrow_api.py),
 * which persists to public.escrow_accounts / public.blockchain_records and
 * proxies mutating calls through services/chain-adapter to the real
 * TradeEscrow.sol contract on the configured chain (local Hardhat 31337 by
 * default). No fabricated tx hashes: every method either returns a real
 * on-chain result or throws a structured EscrowApiError carrying the
 * backend's real error code (e.g. CONDITIONS_NOT_MET, DISPUTE_ACTIVE).
 *
 * computeFileHash is unchanged from the previous version — it was already a
 * real client-side SHA-256, not part of the simulation.
 */

export class EscrowApiError extends Error {
  code: string;
  httpStatus: number;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, httpStatus: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "EscrowApiError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export type ConditionKind = "DOCS" | "SHIPMENT" | "INSPECTION";

export interface EscrowTxResult {
  ok: boolean;
  trade_id: string;
  status: string;
  transaction_hash?: string | null;
  block_number?: number | null;
  already_anchored?: boolean;
}

export interface EscrowChainState {
  tradeId: string;
  buyer: string;
  seller: string;
  token: string;
  amount: string;
  state: number;
  stateLabel: string;
  docsVerified: boolean;
  shipmentDelivered: boolean;
  inspectionPassed: boolean;
  createdAt: string;
  fundedAt: string;
  settledAt: string;
}

export interface EscrowStatus {
  ok: boolean;
  db: Record<string, unknown>;
  chain: EscrowChainState | null;
  chain_error: { code: string; message: string } | null;
  drift: boolean | null;
  drift_details: string[];
}

class BlockchainEscrowService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (import.meta as any).env?.VITE_FASTAPI_AI_URL || "http://localhost:8000";
  }

  public async computeFileHash(file: File | string): Promise<string> {
    const buffer = typeof file === "string" ? new TextEncoder().encode(file) : await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = body?.detail ?? body;
      throw new EscrowApiError(
        detail?.code ?? "UNKNOWN",
        detail?.message ?? res.statusText ?? "Escrow request failed",
        res.status,
        detail?.details
      );
    }
    return body as T;
  }

  /** GET /api/v1/escrow/{tradeId} — DB row + live on-chain state, or null if no escrow exists yet for this trade. */
  public async getEscrowStatus(tradeId: string): Promise<EscrowStatus | null> {
    try {
      return await this.request<EscrowStatus>(`/api/v1/escrow/${tradeId}`);
    } catch (err) {
      if (err instanceof EscrowApiError && err.code === "ESCROW_NOT_FOUND") return null;
      throw err;
    }
  }

  public async createEscrow(tradeId: string, buyerAddress: string, sellerAddress: string, amountUsdc?: number): Promise<EscrowTxResult> {
    return this.request<EscrowTxResult>(`/api/v1/trades/${tradeId}/escrow`, {
      method: "POST",
      body: JSON.stringify({ buyer_address: buyerAddress, seller_address: sellerAddress, amount_usdc: amountUsdc }),
    });
  }

  public async fundEscrow(tradeId: string): Promise<EscrowTxResult> {
    return this.request<EscrowTxResult>(`/api/v1/escrow/${tradeId}/fund`, { method: "POST" });
  }

  public async setCondition(tradeId: string, kind: ConditionKind, value: boolean): Promise<EscrowTxResult> {
    return this.request<EscrowTxResult>(`/api/v1/escrow/${tradeId}/conditions`, {
      method: "POST",
      body: JSON.stringify({ kind, value }),
    });
  }

  /** Attempts release. On refusal, the backend's real reason (CONDITIONS_NOT_MET / DISPUTE_ACTIVE) surfaces as EscrowApiError.code — callers render that, never a fabricated success. */
  public async releaseEscrow(tradeId: string): Promise<EscrowTxResult> {
    return this.request<EscrowTxResult>(`/api/v1/escrow/${tradeId}/release`, { method: "POST" });
  }

  public async raiseDispute(tradeId: string): Promise<EscrowTxResult> {
    return this.request<EscrowTxResult>(`/api/v1/escrow/${tradeId}/dispute`, { method: "POST" });
  }

  public async resolveDispute(tradeId: string, sellerAmount: number, buyerAmount: number): Promise<EscrowTxResult> {
    return this.request<EscrowTxResult>(`/api/v1/escrow/${tradeId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ seller_amount: sellerAmount, buyer_amount: buyerAmount }),
    });
  }

  public async refundEscrow(tradeId: string): Promise<EscrowTxResult> {
    return this.request<EscrowTxResult>(`/api/v1/escrow/${tradeId}/refund`, { method: "POST" });
  }

  /** Static architecture description for the admin status panel — no live fetch, matches the other services' synchronous getStatus() convention. */
  public getStatus() {
    return {
      network: "Local Hardhat (31337)",
      tokenAsset: "mUSDC — real 6-decimal ERC-20, real balances",
      path: "Frontend -> FastAPI /api/v1/escrow/* -> chain-adapter -> TradeEscrow.sol",
      status: "LIVE",
    };
  }
}

export const blockchainEscrowService = new BlockchainEscrowService();
