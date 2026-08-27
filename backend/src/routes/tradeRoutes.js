const express = require('express');
const { listListings, createListing, listTrades, getTrade, createTrade } = require('../services/tradeStore');
const router = express.Router();

router.get('/api/v1/listings', async (req, res, next) => { try { res.json({ listings: await listListings(req.query) }); } catch (e) { next(e); } });
router.post('/api/v1/listings', async (req, res, next) => { try { res.status(201).json(await createListing(req.body)); } catch (e) { next(e); } });
router.get('/api/v1/trades', async (req, res, next) => { try { res.json({ trades: await listTrades({ ...req.query, limit: Number(req.query.limit) || 100, offset: Number(req.query.offset) || 0 }) }); } catch (e) { next(e); } });
router.get('/api/v1/trades/:tradeId', async (req, res, next) => { try { const trade = await getTrade(req.params.tradeId); if (!trade) return res.status(404).json({ detail: { code: 'TRADE_NOT_FOUND', message: 'Trade not found.' } }); res.json(trade); } catch (e) { next(e); } });
router.post('/api/v1/trades', async (req, res, next) => { try { res.status(201).json(await createTrade(req.body)); } catch (e) { next(e); } });
module.exports = router;
