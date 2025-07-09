const MLSentimentService = require('../services/mlSentimentService');
const CoinData = require('../models/CoinData');
const logger = require('../utils/logger');

async function getModelPerformance(req, res) {
  try {
    const mlService = new MLSentimentService();
    
    // Get recent data for correlation analysis
    const recentData = await CoinData.find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    
    const results = {
      modelComparison: {},
      correlationAnalysis: {},
      recommendations: []
    };
    
    // Test with sample data
    const testData = [
      { text: "Bitcoin is going to the moon! 🚀", expectedSentiment: "positive" },
      { text: "The market is crashing hard", expectedSentiment: "negative" },
      { text: "HODL strong, diamond hands!", expectedSentiment: "positive" },
      { text: "This is a complete scam", expectedSentiment: "negative" },
      { text: "Great time to buy the dip", expectedSentiment: "positive" }
    ];
    
    const evaluationResults = await mlService.evaluateModels(testData);
    results.modelComparison = evaluationResults;
    
    // Calculate correlation if we have enough data
    if (recentData.length > 10) {
      const sentimentData = recentData.map(d => d.sentiment.score);
      const priceData = recentData.map(d => d.price);
      
      const correlation = mlService.calculateSentimentPriceCorrelation(sentimentData, priceData);
      results.correlationAnalysis = {
        correlation: correlation,
        dataPoints: recentData.length,
        interpretation: Math.abs(correlation) > 0.3 ? 'Strong correlation' : 
                      Math.abs(correlation) > 0.1 ? 'Moderate correlation' : 'Weak correlation'
      };
    }
    
    // Generate recommendations
    if (evaluationResults.hybrid.accuracy > evaluationResults.baseline.accuracy) {
      results.recommendations.push('Hybrid model shows improvement over baseline');
    }
    
    if (results.correlationAnalysis.correlation > 0.2) {
      results.recommendations.push('Strong sentiment-price correlation detected');
    }
    
    res.json(results);
  } catch (error) {
    logger.error('Error getting model performance:', error);
    res.status(500).json({ error: 'Failed to get model performance' });
  }
}

async function evaluateSentiment(req, res) {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const mlService = new MLSentimentService();
    
    const results = {
      text: text,
      baseline: mlService.analyzeSentimentBaseline(text),
      ml: await mlService.analyzeSentimentML(text),
      hybrid: await mlService.analyzeSentimentHybrid(text)
    };
    
    res.json(results);
  } catch (error) {
    logger.error('Error evaluating sentiment:', error);
    res.status(500).json({ error: 'Failed to evaluate sentiment' });
  }
}

async function getCorrelationAnalysis(req, res) {
  try {
    const { coin = 'bitcoin', hours = 24 } = req.query;
    
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const data = await CoinData.find({
      coin,
      timestamp: { $gte: startTime }
    })
    .sort({ timestamp: 1 })
    .lean();
    
    if (data.length < 10) {
      return res.status(400).json({ error: 'Insufficient data for correlation analysis' });
    }
    
    const mlService = new MLSentimentService();
    const sentimentData = data.map(d => d.sentiment.score);
    const priceData = data.map(d => d.price);
    
    const correlation = mlService.calculateSentimentPriceCorrelation(sentimentData, priceData);
    
    const analysis = {
      coin: coin,
      timeRange: hours,
      dataPoints: data.length,
      correlation: correlation,
      interpretation: Math.abs(correlation) > 0.3 ? 'Strong correlation' : 
                    Math.abs(correlation) > 0.1 ? 'Moderate correlation' : 'Weak correlation',
      sentimentStats: {
        mean: sentimentData.reduce((sum, val) => sum + val, 0) / sentimentData.length,
        min: Math.min(...sentimentData),
        max: Math.max(...sentimentData)
      },
      priceStats: {
        mean: priceData.reduce((sum, val) => sum + val, 0) / priceData.length,
        min: Math.min(...priceData),
        max: Math.max(...priceData)
      }
    };
    
    res.json(analysis);
  } catch (error) {
    logger.error('Error in correlation analysis:', error);
    res.status(500).json({ error: 'Failed to perform correlation analysis' });
  }
}

module.exports = {
  getModelPerformance,
  evaluateSentiment,
  getCorrelationAnalysis
}; 