const { HfInference } = require('@huggingface/inference');
const natural = require('natural');
const logger = require('../utils/logger');
const axios = require('axios');

class MLSentimentService {
  constructor() {
    this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    this.tokenizer = new natural.WordTokenizer();
    this.classifier = new natural.BayesClassifier();
    
    // Initialize with crypto-specific training data
    this.initializeClassifier();
  }

  initializeClassifier() {
    // Crypto-specific positive words
    const positiveWords = [
      'bullish', 'moon', 'lambo', 'hodl', 'diamond hands', 'to the moon',
      'buy', 'buying', 'accumulate', 'dip', 'sale', 'discount', 'undervalued',
      'growth', 'profit', 'gain', 'up', 'good', 'great', 'excellent', 'amazing',
      'pump', 'rally', 'breakout', 'ath', 'all time high', 'mooning', 'rocketing'
    ];

    // Crypto-specific negative words
    const negativeWords = [
      'bearish', 'crash', 'dump', 'selling', 'sell', 'loss', 'down', 'bad',
      'terrible', 'scam', 'rug', 'rugpull', 'ponzi', 'bubble', 'overvalued',
      'fud', 'fear', 'panic', 'dump', 'dumping', 'bear market', 'correction',
      'dead', 'worthless', 'garbage', 'trash', 'scam coin', 'shitcoin'
    ];

    // Train the classifier
    positiveWords.forEach(word => {
      this.classifier.addDocument(word, 'positive');
    });

    negativeWords.forEach(word => {
      this.classifier.addDocument(word, 'negative');
    });

    this.classifier.train();
  }

  // Baseline keyword-based sentiment analysis (current implementation)
  analyzeSentimentBaseline(text) {
    const positiveWords = ['bullish', 'moon', 'buy', 'growth', 'profit', 'gain', 'up', 'good', 'great', 'excellent'];
    const negativeWords = ['bearish', 'crash', 'sell', 'loss', 'down', 'bad', 'terrible', 'scam', 'dump'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / 5));
  }

  // Updated ML-based sentiment analysis using local Python service
  async analyzeSentimentML(text) {
    try {
      const response = await axios.post('http://34.67.119.39:8000/predict', { text });
      const sentiment = response.data.sentiment;
      if (sentiment === 'Positive') return 1;
      if (sentiment === 'Negative') return -1;
      return 0; // Neutral
    } catch (error) {
      logger.error('Error in local ML sentiment analysis:', error);
      return this.analyzeSentimentBaseline(text);
    }
  }

  // Hybrid approach combining ML and baseline
  async analyzeSentimentHybrid(text) {
    const baselineScore = this.analyzeSentimentBaseline(text);
    const mlScore = await this.analyzeSentimentML(text);
    
    // Weighted average (70% ML, 30% baseline)
    return (mlScore * 0.7) + (baselineScore * 0.3);
  }

  // Evaluate model performance
  async evaluateModels(testData) {
    const results = {
      baseline: { correct: 0, total: 0, accuracy: 0 },
      ml: { correct: 0, total: 0, accuracy: 0 },
      hybrid: { correct: 0, total: 0, accuracy: 0 }
    };

    for (const item of testData) {
      const { text, expectedSentiment } = item;
      
      // Test baseline
      const baselineScore = this.analyzeSentimentBaseline(text);
      const baselinePrediction = baselineScore > 0 ? 'positive' : baselineScore < 0 ? 'negative' : 'neutral';
      if (baselinePrediction === expectedSentiment) results.baseline.correct++;
      results.baseline.total++;

      // Test ML
      const mlScore = await this.analyzeSentimentML(text);
      const mlPrediction = mlScore > 0 ? 'positive' : mlScore < 0 ? 'negative' : 'neutral';
      if (mlPrediction === expectedSentiment) results.ml.correct++;
      results.ml.total++;

      // Test hybrid
      const hybridScore = await this.analyzeSentimentHybrid(text);
      const hybridPrediction = hybridScore > 0 ? 'positive' : hybridScore < 0 ? 'negative' : 'neutral';
      if (hybridPrediction === expectedSentiment) results.hybrid.correct++;
      results.hybrid.total++;
    }

    // Calculate accuracies
    results.baseline.accuracy = results.baseline.correct / results.baseline.total;
    results.ml.accuracy = results.ml.correct / results.ml.total;
    results.hybrid.accuracy = results.hybrid.correct / results.hybrid.total;

    return results;
  }

  // Calculate correlation between sentiment and price movements
  calculateSentimentPriceCorrelation(sentimentData, priceData) {
    if (sentimentData.length !== priceData.length || sentimentData.length < 2) {
      return 0;
    }

    const n = sentimentData.length;
    const sentimentMean = sentimentData.reduce((sum, val) => sum + val, 0) / n;
    const priceMean = priceData.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sentimentVariance = 0;
    let priceVariance = 0;

    for (let i = 0; i < n; i++) {
      const sentimentDiff = sentimentData[i] - sentimentMean;
      const priceDiff = priceData[i] - priceMean;
      
      numerator += sentimentDiff * priceDiff;
      sentimentVariance += sentimentDiff * sentimentDiff;
      priceVariance += priceDiff * priceDiff;
    }

    const denominator = Math.sqrt(sentimentVariance * priceVariance);
    return denominator === 0 ? 0 : numerator / denominator;
  }
}

module.exports = MLSentimentService; 