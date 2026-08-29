'use strict';

const mongoose = require('mongoose');

/**
 * Note Schema
 * Represents a user's personal note containing a title, rich content, and user association.
 */
const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User association is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Add index on the user field for faster lookups of a user's notes, sorted by pinned and updatedAt
noteSchema.index({ user: 1, pinned: -1, updatedAt: -1 });

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
