const express = require('express');
const { getCoinData } = require('../controllers/coinController');
const { getModelPerformance, evaluateSentiment, getCorrelationAnalysis } = require('../controllers/mlController');

function setupRoutes(app) {
  const router = express.Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Coin data endpoints
  router.get('/api/coins/:coin/timeseries', getCoinData);

  // ML endpoints
  router.get('/api/ml/performance', getModelPerformance);
  router.post('/api/ml/evaluate', evaluateSentiment);
  router.get('/api/ml/correlation', getCorrelationAnalysis);

  app.use(router);
}

module.exports = { setupRoutes }; 