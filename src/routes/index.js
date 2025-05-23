const express = require('express');
const { getCoinData } = require('../controllers/coinController');

function setupRoutes(app) {
  const router = express.Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Coin data endpoints
  router.get('/api/coins/:coin/timeseries', getCoinData);

  app.use(router);
}

module.exports = { setupRoutes }; 