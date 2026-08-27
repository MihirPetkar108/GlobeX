/**
 * Thin client for GlobeX Express trade endpoints.
 * following the same fetch/error conventions as aiService.ts. No fallback: a
 * failed or unreachable call throws, callers decide how to render that.
 *
 * Both DB-backed calls here will 503 with a recognizable `.code` on the
 * thrown Error (`DB_NOT_CONFIGURED` | `DB_UNAVAILABLE`) while
 * SUPABASE_DB_URL/DATABASE_URL is unset on the backend — callers should
 * special-case that into a calm "not connected yet" state rather than a
 * generic error.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BackendTradeStatus =
  | "CREATED"
  | "OFFERED"
  | "ACCEPTED"
  | "REJECTED"
  | "COUNTER_OFFERED"
  | "AGREED"
  | "IN_PROGRESS"
  | "SHIPPED"
  | "DELIVERED"
  | "DISPUTED"
  | "COMPLETED"
  | "CANCELLED";

/** Raw shape of a row in public.trades, exactly as GET /api/v1/trades[/{id}] returns it. */
export interface TradeRecord {
  id: string;
  listing_id: string | null;
  exporter_id: string;
  importer_id: string;
  status: BackendTradeStatus;
  total_amount: number | null;
  currency: string | null;
  quantity: number | null;
  agreed_price: number | null;
  created_at: string;
  updated_at: string;
}

export class BackendUnavailableError extends Error {
  code: "DB_NOT_CONFIGURED" | "DB_UNAVAILABLE" | "UNKNOWN";
  status: number;

  constructor(message: string, code: "DB_NOT_CONFIGURED" | "DB_UNAVAILABLE" | "UNKNOWN", status: number) {
    super(message);
    this.name = "BackendUnavailableError";
    this.code = code;
    this.status = status;
  }
}

class TradesService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:5002";
  }

  private async handleErrorResponse(res: Response, context: string): Promise<never> {
    if (res.status === 503) {
      let code: "DB_NOT_CONFIGURED" | "DB_UNAVAILABLE" | "UNKNOWN" = "UNKNOWN";
      try {
        const body = await res.json();
        if (body?.detail?.code === "DB_NOT_CONFIGURED" || body?.detail?.code === "DB_UNAVAILABLE") {
          code = body.detail.code;
        }
      } catch {
        // body wasn't JSON — fall through with UNKNOWN
      }
      throw new BackendUnavailableError(
        code === "DB_NOT_CONFIGURED"
          ? "Backend database isn't connected yet."
          : "Backend database is temporarily unreachable.",
        code,
        503
      );
    }
    const body = await res.text().catch(() => "");
    throw new Error(`${context} failed (${res.status}): ${body || res.statusText}`);
  }

  /**
   * GET /api/v1/trades — a GLOBAL, unfiltered list (only `status` narrows
   * it server-side; there is no org/user scoping parameter on the backend).
   * Callers must filter to their own org client-side.
   */
  public async getTrades(params?: { status?: BackendTradeStatus; limit?: number; offset?: number }): Promise<TradeRecord[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));

    const res = await fetch(`${this.baseUrl}/api/v1/trades?${qs.toString()}`);
    if (!res.ok) await this.handleErrorResponse(res, "Fetching trades");
    const data = await res.json();
    return (data.trades || []) as TradeRecord[];
  }

  /**
   * GET /api/v1/trades/{id} — single trade, no ownership check on the
   * backend. Validates the id looks like a UUID before firing the request:
   * the backend runs `uuid.UUID(trade_id)` unguarded and throws an
   * unhandled 500 on anything else, so this catches that client-side first.
   */
  public async getTrade(id: string): Promise<TradeRecord> {
    if (!UUID_RE.test(id)) {
      throw new Error(`"${id}" is not a valid trade id.`);
    }
    const res = await fetch(`${this.baseUrl}/api/v1/trades/${id}`);
    if (!res.ok) await this.handleErrorResponse(res, "Fetching trade");
    return (await res.json()) as TradeRecord;
  }
}

export const tradesService = new TradesService();
export default tradesService;
