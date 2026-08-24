'use strict';

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT for the given user id.
 * @param {string} userId - MongoDB ObjectId as string
 * @returns {string} signed JWT
 */
const generateToken = (userId) => {
  if (!SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.sign({ id: userId }, SECRET, { expiresIn: EXPIRES_IN });
};

/**
 * Verify a JWT and return its decoded payload.
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyToken = (token) => {
  if (!SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.verify(token, SECRET);
};

module.exports = { generateToken, verifyToken };
