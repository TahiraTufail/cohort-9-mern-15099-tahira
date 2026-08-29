'use strict';

const express = require('express');
const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  togglePin,
  exportNotes,
  importNotes,
} = require('../controllers/noteController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply auth middleware to protect all note endpoints
router.use(protect);

router.route('/export')
  .get(exportNotes);

router.route('/import')
  .post(importNotes);

router.route('/')
  .post(createNote)
  .get(getNotes);

router.route('/:id')
  .get(getNoteById)
  .put(updateNote)
  .delete(deleteNote);

router.route('/:id/pin')
  .patch(togglePin);

module.exports = router;
