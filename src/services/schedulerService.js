const cron = require('node-cron');
const { deleteExpiredPosts } = require('./postService');
const config = require('../config/env');
const logger = require('../config/logger');

let cleanupJob = null;

const startScheduler = () => {
  if (cleanupJob) {
    logger.warn('Scheduler already running');
    return;
  }
  
  cleanupJob = cron.schedule(config.posts.cleanupCron, async () => {
    logger.info('Running scheduled post cleanup...');
    try {
      const result = await deleteExpiredPosts();
      logger.info(`Cleanup complete: ${result.deleted} posts removed`);
    } catch (error) {
      logger.error('Scheduled cleanup failed:', error);
    }
  });
  
  logger.info(`✓ Post cleanup scheduler started (${config.posts.cleanupCron})`);
};

const stopScheduler = () => {
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
    logger.info('Post cleanup scheduler stopped');
  }
};

const runCleanupNow = async () => {
  logger.info('Running manual post cleanup...');
  try {
    const result = await deleteExpiredPosts();
    logger.info(`Manual cleanup complete: ${result.deleted} posts removed`);
    return result;
  } catch (error) {
    logger.error('Manual cleanup failed:', error);
    throw error;
  }
};

module.exports = {
  startScheduler,
  stopScheduler,
  runCleanupNow
};