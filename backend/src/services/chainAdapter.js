const DEFAULT_TIMEOUT_MS = 30000;

class ChainAdapterError extends Error {
  constructor(code, message, status = 503, details = {}) {
    super(message);
    this.name = 'ChainAdapterError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const baseUrl = () => process.env.CHAIN_ADAPTER_URL || 'http://127.0.0.1:3001';

async function request(path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) {
      throw new ChainAdapterError(
        body.code || 'CHAIN_UNAVAILABLE',
        body.message || `Chain adapter returned HTTP ${response.status}`,
        response.status || 503,
        body.details || {}
      );
    }
    return body;
  } catch (error) {
    if (error instanceof ChainAdapterError) throw error;
    throw new ChainAdapterError(
      'CHAIN_UNAVAILABLE',
      error.name === 'AbortError' ? 'Chain adapter request timed out.' : `Chain adapter unreachable: ${error.message}`
    );
  } finally {
    clearTimeout(timer);
  }
}

const post = (path, payload) => request(path, { method: 'POST', body: JSON.stringify(payload || {}) });

module.exports = {
  ChainAdapterError,
  getHealth: () => request('/health', {}, 5000),
  anchorTrade: (payload) => post('/anchor/trade', payload),
  getTrade: (id) => request(`/trade/${encodeURIComponent(id)}`),
  createEscrow: (tradeId, buyer, seller, amount) => post('/escrow/create', { tradeId, buyer, seller, amount }),
  fundEscrow: (tradeId) => post(`/escrow/${encodeURIComponent(tradeId)}/fund`),
  setCondition: (tradeId, kind, value) => post(`/escrow/${encodeURIComponent(tradeId)}/condition`, { kind, value }),
  releaseEscrow: (tradeId) => post(`/escrow/${encodeURIComponent(tradeId)}/release`),
  disputeEscrow: (tradeId) => post(`/escrow/${encodeURIComponent(tradeId)}/dispute`),
  resolveEscrow: (tradeId, sellerAmount, buyerAmount) => post(`/escrow/${encodeURIComponent(tradeId)}/resolve`, { sellerAmount, buyerAmount }),
  refundEscrow: (tradeId) => post(`/escrow/${encodeURIComponent(tradeId)}/refund`),
  getEscrow: (tradeId) => request(`/escrow/${encodeURIComponent(tradeId)}`),
};
