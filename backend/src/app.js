const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Routes
const expenseRoutes = require('./routes/expenseRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const intelligenceRoutes = require('./routes/intelligenceRoutes');
const blockchainRoutes = require('./routes/blockchainRoutes');

app.use('/api/expenses', expenseRoutes);
app.use('/api/organizations', organizationRoutes);
app.use(tradeRoutes);
app.use(intelligenceRoutes);
app.use(blockchainRoutes);

// Base route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'GlobeX Backend Server',
    status: 'ONLINE',
    version: '1.0.0'
  });
});

const mlProxy = require('./services/mlProxy');
const chainAdapter = require('./services/chainAdapter');

app.get('/health', async (_req, res) => {
  const mlHealth = await mlProxy.getHealth().catch((err) => ({
    status: 'unavailable',
    error: err.message,
  }));

  const chainHealth = await chainAdapter.getHealth().catch((err) => ({
    reachable: false,
    error: err.message,
  }));

  const dbConfigured = Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY));

  const isDegraded = mlHealth.status === 'unavailable' || chainHealth.reachable === false;

  res.json({
    status: isDegraded ? 'degraded' : 'healthy',
    service: 'globex-express-api',
    version: '3.0.0',
    subsystems: {
      express: { status: 'healthy', port: Number(process.env.PORT) || 5002 },
      python_ml: mlHealth,
      chain_adapter: chainHealth,
      database: { configured: dbConfigured, status: dbConfigured ? 'configured' : 'not_configured' },
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error Middleware]', err?.stack || err?.message || err);
  const status = Number.isInteger(err?.status) ? err.status : 500;
  res.status(status).json({
    detail: err?.message || 'An internal server error occurred',
    ...(err?.details ? { details: err.details } : {}),
  });
});

module.exports = app;
