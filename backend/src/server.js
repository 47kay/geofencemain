const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./utils/logger');
const config = require('./config/env');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
    error: err.name,
    message: err.message,
    stack: err.stack
  });
  process.exit(1);
});

const DB = config.database.url.replace(
  '<PASSWORD>',
  config.database.password
);

// MongoDB connection
mongoose.connect(config.database.url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useCreateIndex: true,
  // useFindAndModify: false,
  autoIndex: config.env !== 'production'
}).then(() => {
  logger.info('Connected to MongoDB successfully');
}).catch((err) => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// Start server
const port = config.port || 3000;
const server = app.listen(port, () => {
  logger.info(`Server running in ${config.env} mode on port ${port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
    error: err.name,
    message: err.message,
    stack: err.stack
  });
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('💥 Process terminated!');
      process.exit(0);
    });
  });
});