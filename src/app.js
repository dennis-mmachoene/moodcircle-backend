const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const xss = require('xss-clean');

const config = require('./config/env');
const logger = require('./config/logger');
const { testConnection } = require('./config/database');
const { verifyTransporter } = require('./services/emailService');
const { startScheduler } = require('./services/schedulerService');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const reactionRoutes = require('./routes/reactions');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(xss());

if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim())
    }
  }));
}

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'MoodCircle API is running',
    version: config.apiVersion,
    environment: config.env,
    timestamp: new Date().toISOString()
  });
});

app.use(generalLimiter);

app.use(`/api/${config.apiVersion}/auth`, authRoutes);
app.use(`/api/${config.apiVersion}/posts`, postRoutes);
app.use(`/api/${config.apiVersion}/reactions`, reactionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    logger.info('🚀 Initializing MoodCircle Backend...');
    
    await testConnection();
    
    await verifyTransporter();
    
    startScheduler();
    
    const PORT = config.port;
    app.listen(PORT, () => {
      logger.info('='.repeat(50));
      logger.info(`✓ MoodCircle API Server running`);
      logger.info(`✓ Environment: ${config.env}`);
      logger.info(`✓ Port: ${PORT}`);
      logger.info(`✓ API Version: ${config.apiVersion}`);
      logger.info(`✓ Base URL: http://localhost:${PORT}/api/${config.apiVersion}`);
      logger.info('='.repeat(50));
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;