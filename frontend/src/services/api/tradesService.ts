 * Thin client for GlobeX Express trade endpoints.
 * Supports authenticated trade requests (POST/GET /api/trades) and REST v1 reads.
 */

import { supabase } from "@/lib/supabaseClient";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import type { ExportRequest, ExportTradeStatus } from "@/data/exportRequests";

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
  listing?: {
    product_name?: string;
    product_category?: string;
    hs_code?: string;
    unit?: string;
    origin_port?: string;
    price?: number;
    incoterms?: string;
    currency?: string;
  } | null;
  importer?: { legal_name?: string | null; trade_name?: string | null; country?: string | null } | null;
  exporter?: { legal_name?: string | null; trade_name?: string | null; country?: string | null } | null;
}

const TRADE_STATUS_TO_EXPORT: Record<string, ExportTradeStatus> = {
  CREATED: "NEW REQUEST",
  OFFERED: "NEW REQUEST",
  COUNTER_OFFERED: "NEGOTIATING",
  ACCEPTED: "PAYMENT PENDING",
  AGREED: "PAYMENT PENDING",
  IN_PROGRESS: "READY TO SHIP",
  SHIPPED: "IN TRANSIT",
  DELIVERED: "DELIVERED",
  DISPUTED: "DISPUTED",
  COMPLETED: "SETTLED",
  REJECTED: "REJECTED",
  CANCELLED: "REJECTED",
};

const COUNTRY_FLAGS: Record<string, string> = {
  UAE: "🇦🇪",
  "United Arab Emirates": "🇦🇪",
  India: "🇮🇳",
  USA: "🇺🇸",
  "United States": "🇺🇸",
  Germany: "🇩🇪",
  Singapore: "🇸🇬",
};

export function mapTradeToExportRequest(trade: TradeRecord): ExportRequest {
  const listing = trade.listing || {};
  const importer = trade.importer || {};
  const quantity = Number(trade.quantity) || 0;
  const unitPrice = Number(trade.agreed_price) || Number(listing.price) || 0;
  const tradeValue = Number(trade.total_amount) || quantity * unitPrice;
  const country = importer.country || "UAE";
  const createdAt = trade.created_at || new Date().toISOString();

  return {
    id: trade.id,
    listingId: trade.listing_id || "",
    buyer: importer.trade_name || importer.legal_name || "Buyer organization",
    country,
    flag: COUNTRY_FLAGS[country] || "🌍",
    product: listing.product_name || "Export listing",
    category: listing.product_category || "Agriculture",
    hsCode: listing.hs_code || "",
    quantity,
    unit: listing.unit || "MT",
    originalPrice: Number(listing.price) || unitPrice,
    originalTradeValue: tradeValue,
    buyerProposedPrice: unitPrice,
    buyerProposedTradeValue: tradeValue,
    status: TRADE_STATUS_TO_EXPORT[trade.status] || "NEW REQUEST",
    negotiationHistory: [
      {
        role: "Buyer",
        price: unitPrice,
        quantity,
        time: new Date(createdAt).toLocaleString(),
        note: "Trade request submitted from Configure & Request Trade.",
      },
    ],
    origin: listing.origin_port || "India",
    destination: country,
    destinationPort: "Jebel Ali Port, UAE",
    transit: "5-7 days",
    incoterm: listing.incoterms || "FOB",
    paymentTerms: "To be confirmed",
    paymentStatus: "Pending",
    buyerRisk: "Pending review",
    requiredLicenses: "As required for this corridor",
    createdAt: createdAt.slice(0, 10),
  };
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
  private apiBaseUrl: string;

  constructor() {
    this.baseUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:5002";
    this.apiBaseUrl = getApiBaseUrl();
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("You must be signed in to manage trade requests.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  public async createTradeRequest(payload: {
    listingId: string;
    quantity: number;
    agreedPrice: number;
    currency?: string;
    importerId?: string;
  }): Promise<TradeRecord> {
    const headers = await this.authHeaders();
    const body: Record<string, any> = {
      listing_id: payload.listingId,
      quantity: payload.quantity,
      agreed_price: payload.agreedPrice,
      currency: payload.currency || "USD",
    };
    
    if (payload.importerId) {
      body.importer_id = payload.importerId;
    }
    
    const res = await fetch(`${this.apiBaseUrl}/api/trades`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Trade request failed (${res.status})`);
    }
    const data = await res.json();
    return (data.trade || data) as TradeRecord;
  }

  public async listOrgTrades(params?: {
    role?: "exporter" | "importer";
    listingId?: string;
  }): Promise<TradeRecord[]> {
    const headers = await this.authHeaders();
    const qs = new URLSearchParams();
    if (params?.role) qs.set("role", params.role);
    if (params?.listingId) qs.set("listing_id", params.listingId);
    const res = await fetch(`${this.apiBaseUrl}/api/trades?${qs.toString()}`, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Fetching trade requests failed (${res.status})`);
    }
    const data = await res.json();
    return (data.trades || []) as TradeRecord[];
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
