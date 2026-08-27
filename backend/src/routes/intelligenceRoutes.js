const express = require('express');
const { proxyPost, proxyGet, getHealth } = require('../services/mlProxy');
const { synthesizeCountryProsCons } = require('../services/prosConsSynthesizer');

const router = express.Router();

// Every model and ML workflow lives in backend/brain. Express is only the
// public gateway; request and response JSON stay byte-for-byte compatible.
[
  '/predict/hs-code',
  '/predict/market-opportunity',
  '/api/trade-anomaly/predict',
  '/predict/counterparty-match',
  '/predict/counterparty-risk',
  '/compliance/rag-analyze',
  '/compliance/sanctions-screen',
  '/compliance/transaction-gate',
  '/compliance/doc-verdict',
  '/compliance/trade-synthesis',
  '/scoring/composite',
  '/scoring/doc-verdict',
  '/api/v1/rag/query',
  '/documents/ocr-extract',
  '/api/v1/marketplace/match-buyers',
  '/api/v1/trade/generate-report',
].forEach((path) => router.post(path, proxyPost(path)));

// GET routes proxied to Python ML service
[
  '/predict/hs-code/search',
  '/api/trade-anomaly/coverage',
  '/api/trade-anomaly/health',
  '/compliance/coverage',
  '/api/v1/companies/top-by-country',
  '/api/v1/companies/detail/:companyId',
  '/api/v1/logistics/shipping-eta',
  '/api/v1/logistics/profit-estimate',
].forEach((path) => router.get(path, proxyGet(path)));

// No FastAPI route exists for this — synthesized locally in Express from the
// insight_data already produced by /predict/market-opportunity (deterministic,
// no LLM dependency). Kept at the same path the frontend already calls.
router.post('/predict/market-opportunity/synthesize-pros-cons', (req, res) => {
  res.json(synthesizeCountryProsCons(req.body?.insight_data || {}));
});

// Keep brain's read-only ML/system surfaces available through Express too.
router.get('/api/v1/ml/health', async (_req, res, next) => {
  try {
    const body = await getHealth();
    res.json(body);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
