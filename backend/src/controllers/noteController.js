'use strict';

const Note = require('../models/Note');
const logger = require('../config/logger');

/**
 * @desc    Create a new note linked to the authenticated user
 * @route   POST /api/notes
 * @access  Private
 */
const createNote = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title || !content || !title.trim() || !content.trim()) {
      const error = new Error('title and content are required');
      error.statusCode = 400;
      return next(error);
    }

    const note = await Note.create({
      title: title.trim(),
      content: content.trim(),
      user: req.user._id,
    });

    logger.info({ noteId: note._id, userId: req.user._id }, 'Note created successfully');

    return res.status(201).json({
      status: 'success',
      data: {
        note,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all notes belonging to the authenticated user
 * @route   GET /api/notes
 * @access  Private
 */
const getNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      results: notes.length,
      data: {
        notes,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a single note by ID belonging to the authenticated user
 * @route   GET /api/notes/:id
 * @access  Private
 */
const getNoteById = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });

    if (!note) {
      const error = new Error('Note not found');
      error.statusCode = 404;
      return next(error);
    }

    return res.status(200).json({
      status: 'success',
      data: {
        note,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a note belonging to the authenticated user
 * @route   PUT /api/notes/:id
 * @access  Private
 */
const updateNote = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (title === undefined && content === undefined) {
      const error = new Error('At least one field (title or content) is required for update');
      error.statusCode = 400;
      return next(error);
    }

    if ((title !== undefined && !title.trim()) || (content !== undefined && !content.trim())) {
      const error = new Error('title and content cannot be empty');
      error.statusCode = 400;
      return next(error);
    }

    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });

    if (!note) {
      const error = new Error('Note not found');
      error.statusCode = 404;
      return next(error);
    }

    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content.trim();

    await note.save();

    logger.info({ noteId: note._id, userId: req.user._id }, 'Note updated successfully');

    return res.status(200).json({
      status: 'success',
      data: {
        note,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a note belonging to the authenticated user
 * @route   DELETE /api/notes/:id
 * @access  Private
 */
const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!note) {
      const error = new Error('Note not found');
      error.statusCode = 404;
      return next(error);
    }

    logger.info({ noteId: req.params.id, userId: req.user._id }, 'Note deleted successfully');

    return res.status(200).json({
      status: 'success',
      message: 'Note deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
};
