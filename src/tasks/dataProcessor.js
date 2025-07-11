const axios = require('axios');
const CoinData = require('../models/CoinData');
const MLSentimentService = require('../services/mlSentimentService');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const SUPPORTED_COINS = ['bitcoin', 'ethereum', 'dogecoin'];
const BATCH_SIZE = process.env.BATCH_SIZE || 100;

// Initialize ML sentiment service
const mlSentimentService = new MLSentimentService();

async function fetchCoinPrices() {
  try {
    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
      params: {
        symbol: SUPPORTED_COINS.map(c => c.toUpperCase()).join(','),
        convert: 'INR'
      },
      headers: {
        'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
      }
    });
    // CoinMarketCap returns data in a different structure than CoinGecko
    // We'll normalize it to match the rest of your code
    const data = response.data.data;
    const prices = {};
    for (const coin of SUPPORTED_COINS) {
      const symbol = coin.toUpperCase();
      prices[coin] = { inr: data[symbol].quote.INR.price };
    }
    return prices;
  } catch (error) {
    logger.error('Error fetching coin prices from CoinMarketCap:', error.response?.data || error.message);
    throw error;
  }
}

async function fetchRedditData(coin) {
  // Load static data from JSON file
  const dataPath = path.join(__dirname, '../data/sampleRedditData.json');
  const staticData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const posts = staticData[coin] || [];
  logger.debug(`Loaded ${posts.length} static Reddit posts for ${coin}`);
  return posts;
}

async function fetchAndProcessData() {
  try {
    // Fetch current prices
    const prices = await fetchCoinPrices();
    
    for (const coin of SUPPORTED_COINS) {
      // Fetch Reddit data
      const redditData = await fetchRedditData(coin);
      
      // Extract texts for sentiment analysis
      const texts = redditData.map(post => `${post.title} ${post.selftext}`).filter(Boolean);
      
      // Analyze sentiment using ML service
      const sentiments = await Promise.all(texts.map(async text => {
        try {
          return await mlSentimentService.analyzeSentimentHybrid(text);
        } catch (error) {
          logger.error('Error in sentiment analysis:', error);
          return mlSentimentService.analyzeSentimentBaseline(text);
        }
      }));
      
      // Fallback: If no posts or sentiments, skip saving and log a warning
      if (sentiments.length === 0) {
        logger.warn(`No Reddit posts or sentiments found for ${coin}. Skipping save to DB.`);
        continue;
      }
      // Calculate average sentiment
      const avgSentiment = sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
      
      // Store ALL posts with sentiment (not just top 5)
      const allPosts = redditData.map((post, index) => ({
        ...post,
        sentiment: sentiments[index]
      }));
      
      // Save to database
      await CoinData.create({
        coin,
        timestamp: new Date(),
        price: prices[coin].inr,
        sentiment: {
          score: avgSentiment,
          count: sentiments.length
        },
        topPosts: allPosts // Store all posts
      });
    }
  } catch (error) {
    logger.error('Error in data processing:', error);
    throw error;
  }
}

module.exports = {
  fetchAndProcessData
}; 