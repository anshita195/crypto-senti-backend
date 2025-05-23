const mongoose = require('mongoose');

const coinDataSchema = new mongoose.Schema({
  coin: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true
  },
  sentiment: {
    score: {
      type: Number,
      required: true
    },
    count: {
      type: Number,
      required: true
    }
  },
  topPosts: [{
    id: String,
    title: String,
    text: String,
    score: Number,
    sentiment: Number,
    url: String,
    subreddit: String,
    created_utc: Date
  }]
}, {
  timestamps: true
});

// Compound index for efficient time-series queries
coinDataSchema.index({ coin: 1, timestamp: -1 });

const CoinData = mongoose.model('CoinData', coinDataSchema);

module.exports = CoinData; 