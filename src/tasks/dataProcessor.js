const axios = require('axios');
const CoinData = require('../models/CoinData');
const MLSentimentService = require('../services/mlSentimentService');
const logger = require('../utils/logger');

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
        limit: 250, // Increased limit for more posts
        type: 'link'
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'TradeBot/1.0 (by /u/yourusername)'
      }
    });

    return response.data.data.children.map(post => post.data);
  } catch (error) {
    logger.error('Error fetching Reddit data:', error.response?.data || error.message);
    // Log the full error for debugging
    if (error.response) {
      logger.error('Reddit error response:', JSON.stringify(error.response.data));
    } else {
      logger.error('Reddit error:', error.message);
    }
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