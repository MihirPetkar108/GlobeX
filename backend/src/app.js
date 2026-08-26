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

app.use('/api/expenses', expenseRoutes);
app.use('/api/organizations', organizationRoutes);

// Base route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'GlobeX Backend Server',
    status: 'ONLINE',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error Middleware]', err.stack);
  res.status(500).json({
    message: 'An internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

module.exports = app;
