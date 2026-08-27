const express = require('express');
const { randomUUID } = require('crypto');
const chain = require('../services/chainAdapter');
const { getTrade, recordBlockchain, getLedger } = require('../services/tradeStore');
const router = express.Router();

const chainError = (res, error) => res.status(error.status || 503).json({ detail: { code: error.code || 'CHAIN_UNAVAILABLE', message: error.message, details: error.details || {} } });

router.get('/api/v1/blockchain/status', async (_req, res) => { try { res.json(await chain.getHealth()); } catch (e) { chainError(res, e); } });
router.get('/api/v1/blockchain/ledger', async (req, res, next) => { try { res.json({ records: await getLedger(Number(req.query.limit) || 100) }); } catch (e) { next(e); } });
router.post('/api/v1/trades/:tradeId/anchor', async (req, res, next) => { try { const trade = await getTrade(req.params.tradeId); if (!trade) return res.status(404).json({ detail: { code: 'TRADE_NOT_FOUND', message: 'Trade not found.' } }); const result = await chain.anchorTrade({ tradeId: req.params.tradeId, documentHash: req.body.document_hash || req.body.documentHash, eventType: req.body.event_type || 'DOCUMENT_ANCHOR' }); await recordBlockchain({ id: randomUUID(), trade_id: req.params.tradeId, event_type: 'DOCUMENT_ANCHOR', document_hash: req.body.document_hash || req.body.documentHash, tx_hash: result.transactionHash || result.txHash, block_number: result.blockNumber || null, chain: result.chain || 'EVM_TESTNET', contract_address: result.contractAddress || null, metadata: result }); res.json({ transaction_hash: result.transactionHash || result.txHash, block_number: result.blockNumber || null }); } catch (e) { if (e.code) return chainError(res, e); next(e); } });

const escrow = async (action, req, res) => { try { const result = await action(); res.json({ ok: true, trade_id: req.params.tradeId, status: result.status, transaction_hash: result.transactionHash || result.txHash, block_number: result.blockNumber || null, ...result }); } catch (e) { chainError(res, e); } };
router.post('/api/v1/trades/:tradeId/escrow', (req, res) => escrow(() => chain.createEscrow(req.params.tradeId, req.body.buyer_address, req.body.seller_address, req.body.amount_usdc), req, res));
router.post('/api/v1/escrow/:tradeId/fund', (req, res) => escrow(() => chain.fundEscrow(req.params.tradeId), req, res));
router.post('/api/v1/escrow/:tradeId/conditions', (req, res) => escrow(() => chain.setCondition(req.params.tradeId, req.body.kind, req.body.value), req, res));
router.post('/api/v1/escrow/:tradeId/release', (req, res) => escrow(() => chain.releaseEscrow(req.params.tradeId), req, res));
router.post('/api/v1/escrow/:tradeId/dispute', (req, res) => escrow(() => chain.disputeEscrow(req.params.tradeId), req, res));
router.post('/api/v1/escrow/:tradeId/resolve', (req, res) => escrow(() => chain.resolveEscrow(req.params.tradeId, req.body.seller_amount, req.body.buyer_amount), req, res));
router.post('/api/v1/escrow/:tradeId/refund', (req, res) => escrow(() => chain.refundEscrow(req.params.tradeId), req, res));
router.get('/api/v1/escrow/:tradeId', async (req, res) => { try { const result = await chain.getEscrow(req.params.tradeId); res.json(result.escrow || result); } catch (e) { chainError(res, e); } });

module.exports = router;
