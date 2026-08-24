'use strict';

const logger = require('../config/logger');

/**
 * Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Handle Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate field value entered: ${field}. Please use another value.`;
    // Match duplicate message expected by existing auth flow
    if (field === 'email') {
      message = 'An account with this email already exists';
    }
  }

  // Handle Mongoose Cast Error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found. Invalid formatted ID: ${err.value}`;
  }

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
