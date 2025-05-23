const CoinData = require('../models/CoinData');
const logger = require('../utils/logger');

async function getCoinData(req, res) {
  try {
    const { coin } = req.params;
    const { hours = 24 } = req.query;

    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const data = await CoinData.find({
      coin,
      timestamp: { $gte: startTime }
    })
    .sort({ timestamp: 1 })
    .lean();

    // Calculate rolling average for sentiment
    const windowSize = 3;
    const smoothedData = data.map((point, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const window = data.slice(start, index + 1);
      const avgSentiment = window.reduce((sum, p) => sum + p.sentiment.score, 0) / window.length;

      return {
        ...point,
        sentiment: {
          ...point.sentiment,
          smoothedScore: avgSentiment
        }
      };
    });

    res.json({
      coin,
      data: smoothedData
    });
  } catch (error) {
    logger.error('Error fetching coin data:', error);
    res.status(500).json({ error: 'Failed to fetch coin data' });
  }
}

module.exports = {
  getCoinData
}; 