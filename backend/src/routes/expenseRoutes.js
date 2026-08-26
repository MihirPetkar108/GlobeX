const express = require('express');
const router = express.Router();
const authMiddleware = require('../utilities/authMiddleware');
const { getExpenses, createExpense } = require('../controllers/expenseController');

// All expense routes protected by authMiddleware
router.get('/', authMiddleware, getExpenses);
router.post('/', authMiddleware, createExpense);

module.exports = router;
