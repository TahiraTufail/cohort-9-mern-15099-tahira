'use strict';

const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const logger = require('./src/config/logger');
const app = require('./app');

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
