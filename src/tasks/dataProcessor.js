const axios = require('axios');
const CoinData = require('../models/CoinData');
const logger = require('../utils/logger');

const SUPPORTED_COINS = ['bitcoin', 'ethereum', 'dogecoin'];
const BATCH_SIZE = process.env.BATCH_SIZE || 100;

// Simple sentiment analysis using keyword matching
function analyzeSentiment(text) {
  const positiveWords = ['bullish', 'moon', 'buy', 'growth', 'profit', 'gain', 'up', 'good', 'great', 'excellent'];
  const negativeWords = ['bearish', 'crash', 'sell', 'loss', 'down', 'bad', 'terrible', 'scam', 'dump'];
  
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });
  
  // Normalize score between -1 and 1
  return Math.max(-1, Math.min(1, score / 5));
}

async function fetchCoinPrices() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: SUPPORTED_COINS.join(','),
        vs_currencies: 'inr'
      }
    });
    return response.data;
  } catch (error) {
    logger.error('Error fetching coin prices:', error);
    throw error;
  }
}

async function fetchRedditData(coin) {
  try {
    // First, get an access token
    const authResponse = await axios.post('https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        auth: {
          username: process.env.REDDIT_CLIENT_ID,
          password: process.env.REDDIT_CLIENT_SECRET
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = authResponse.data.access_token;

    // Now fetch the posts with the access token
    const response = await axios.get(`https://oauth.reddit.com/search`, {
      params: {
        q: coin,
        sort: 'top',
        t: 'day',
        limit: 100,
        type: 'link'
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'TradeBot/1.0'
      }
    });

    return response.data.data.children.map(post => post.data);
  } catch (error) {
    logger.error('Error fetching Reddit data:', error.response?.data || error.message);
    // Return empty array instead of throwing to allow the process to continue
    return [];
  }
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
      
      // Analyze sentiment
      const sentiments = texts.map(text => analyzeSentiment(text));
      
      // Calculate average sentiment
      const avgSentiment = sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
      
      // Get top posts
      const topPosts = redditData
        .map((post, index) => ({
          ...post,
          sentiment: sentiments[index]
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      // Save to database
      await CoinData.create({
        coin,
        timestamp: new Date(),
        price: prices[coin].inr,
        sentiment: {
          score: avgSentiment,
          count: sentiments.length
        },
        topPosts
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