const cron = require('node-cron');
const { fetchAndProcessData } = require('./dataProcessor');
const logger = require('../utils/logger');

function setupScheduledTasks() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      logger.info('Starting scheduled data fetch and processing');
      await fetchAndProcessData();
      logger.info('Completed scheduled data fetch and processing');
    } catch (error) {
      logger.error('Error in scheduled task:', error);
    }
  });
}

module.exports = { setupScheduledTasks }; 