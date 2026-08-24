'use strict';

const logger = require('../config/logger');

/**
 * Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error using Pino
  logger.error(
    {
      err: {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      req: {
        method: req.method,
        url: req.url,
      },
    },
    `Error handler caught: ${message}`
  );

  res.status(statusCode).json({
    success: false,
    status: 'error', // matches existing test requirements
    message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
