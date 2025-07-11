require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { setupRoutes } = require('./routes');
const { setupScheduledTasks } = require('./tasks');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 900000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100
});
app.use(limiter);

// Routes
setupRoutes(app);

// TEMPORARY: Test endpoint to check Reddit env variables
app.get('/test-reddit-env', (req, res) => {
  res.json({
    REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID ? 'SET' : 'NOT SET',
    REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET ? 'SET' : 'NOT SET'
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    
    // Start the server
    app.listen(PORT, async () => {
      logger.info(`Server running on port ${PORT}`);
      
      // Perform initial data fetch
      try {
        logger.info('Performing initial data fetch');
        const { fetchAndProcessData } = require('./tasks/dataProcessor');
        await fetchAndProcessData();
        logger.info('Initial data fetch completed');
      } catch (error) {
        logger.error('Error in initial data fetch:', error);
      }
      
      // Setup scheduled tasks
      setupScheduledTasks();
    });
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Error handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
}); 