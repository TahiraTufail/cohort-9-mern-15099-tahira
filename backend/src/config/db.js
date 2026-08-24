'use strict';

const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Connect to MongoDB using the URI defined in environment variables.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
