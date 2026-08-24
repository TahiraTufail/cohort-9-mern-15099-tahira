'use strict';

const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const logger = require('../config/logger');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Basic presence validation
    if (!name || !email || !password) {
      const error = new Error('name, email and password are required');
      error.statusCode = 400;
      return next(error);
    }

    // Check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      const error = new Error('An account with this email already exists');
      error.statusCode = 409;
      return next(error);
    }

    // Create user (password hashed by pre-save hook)
    const user = await User.create({ name, email, password });

    const token = generateToken(user._id);

    // Secure logging - only log the userId, never the password or token
    logger.info({ userId: user._id }, 'User registered successfully');

    return res.status(201).json({
      status: 'success',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error('email and password are required');
      error.statusCode = 400;
      return next(error);
    }

    // Explicitly select password (it's excluded by default)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      return next(error);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      return next(error);
    }

    const token = generateToken(user._id);

    // Secure logging - only log the userId, never the password or token
    logger.info({ userId: user._id }, 'User logged in successfully');

    return res.status(200).json({
      status: 'success',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login };
