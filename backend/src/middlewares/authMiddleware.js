'use strict';

const User = require('../models/User');
const { verifyToken } = require('../utils/generateToken');

/**
 * Protect route middleware.
 * Reads Authorization: Bearer <token>, verifies it, and attaches req.user.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user; // available to all downstream handlers
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: 'error', message: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Token has expired.' });
    }
    next(err);
  }
};

module.exports = { protect };
