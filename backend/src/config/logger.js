'use strict';

const pino = require('pino');

const isDev = process.env.NODE_ENV === 'development';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'body.password',
      'password',
      'token',
      'jwt',
      'hashedPassword',
    ],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
