const express = require('express');
const authMiddleware = require('../utilities/authMiddleware');
const { createTrade, getTrades } = require('../controllers/tradeController');

const router = express.Router();

router.get('/', authMiddleware, getTrades);
router.post('/', authMiddleware, createTrade);

module.exports = router;
