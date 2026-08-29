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
    const query = { user: req.user._id };

    if (req.query.search) {
      query.title = { $regex: req.query.search, $options: 'i' };
    }

    const notes = await Note.find(query).sort({ pinned: -1, updatedAt: -1 });

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

/**
 * @desc    Toggle pin status of a note belonging to the authenticated user
 * @route   PATCH /api/notes/:id/pin
 * @access  Private
 */
const togglePin = async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });

    if (!note) {
      const error = new Error('Note not found');
      error.statusCode = 404;
      return next(error);
    }

    note.pinned = !note.pinned;
    await note.save();

    logger.info({ noteId: note._id, userId: req.user._id, pinned: note.pinned }, 'Note pin toggled successfully');

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
 * @desc    Export all notes belonging to the authenticated user as a JSON file
 * @route   GET /api/notes/export
 * @access  Private
 */
const exportNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.user._id }).sort({ pinned: -1, updatedAt: -1 });

    const exportedNotes = notes.map((note) => ({
      title: note.title,
      content: note.content,
      pinned: note.pinned || false,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));

    res.setHeader('Content-Disposition', 'attachment; filename="notes-export.json"');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json(exportedNotes);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Import a JSON array of notes for the authenticated user
 * @route   POST /api/notes/import
 * @access  Private
 */
const importNotes = async (req, res, next) => {
  try {
    const notesArray = req.body;

    if (!Array.isArray(notesArray)) {
      const error = new Error('Request body must be a JSON array of notes');
      error.statusCode = 400;
      return next(error);
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];

    const validNotesToInsert = [];

    notesArray.forEach((noteItem, index) => {
      const { title, content, pinned } = noteItem;

      if (!title || typeof title !== 'string' || !title.trim()) {
        skippedCount++;
        errors.push(`Note at index ${index} skipped: Title is required and must be a non-empty string`);
        return;
      }

      if (title.trim().length > 200) {
        skippedCount++;
        errors.push(`Note at index ${index} skipped: Title cannot exceed 200 characters`);
        return;
      }

      if (!content || typeof content !== 'string' || !content.trim()) {
        skippedCount++;
        errors.push(`Note at index ${index} skipped: Content is required and must be a non-empty string`);
        return;
      }

      validNotesToInsert.push({
        title: title.trim(),
        content: content.trim(),
        pinned: Boolean(pinned),
        user: req.user._id,
      });
    });

    if (validNotesToInsert.length > 0) {
      const inserted = await Note.insertMany(validNotesToInsert);
      importedCount = inserted.length;
    }

    return res.status(200).json({
      status: 'success',
      data: {
        importedCount,
        skippedCount,
        errors,
      },
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
  togglePin,
  exportNotes,
  importNotes,
};
