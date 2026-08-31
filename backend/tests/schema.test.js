'use strict';

const { expect } = require('chai');
const mongoose = require('mongoose');
const { createMongoMemoryServer, stopMongoMemoryServer } = require('./helpers/mongoMemoryServer');
const User = require('../src/models/User');
const Note = require('../src/models/Note');

let mongoServer;

describe('Database Schema Integration Tests', () => {
  before(async function () {
    // MongoDB Memory Server downloads its binary once on a new machine.
    this.timeout(10 * 60 * 1000);
    mongoServer = await createMongoMemoryServer();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    await stopMongoMemoryServer(mongoServer);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Note.deleteMany({});
  });

  describe('User Model', () => {
    it('should create and save a valid user successfully', async () => {
      const userData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123',
        phone: '+1234567890',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).to.exist;
      expect(savedUser.name).to.equal(userData.name);
      expect(savedUser.email).to.equal(userData.email);
      expect(savedUser.phone).to.equal(userData.phone);
      expect(savedUser.password).to.not.equal(userData.password); // Verify hashing is performed
    });

    it('should fail validation when email is invalid', async () => {
      const user = new User({
        name: 'Jane Doe',
        email: 'invalid-email',
        password: 'Password123',
      });

      try {
        await user.save();
        throw new Error('Should have failed validation');
      } catch (err) {
        expect(err.name).to.equal('ValidationError');
        expect(err.errors.email.message).to.equal('Please provide a valid email address');
      }
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        name: 'Jane Doe',
        email: 'duplicate@example.com',
        password: 'Password123',
      };

      await User.create(userData);

      const duplicateUser = new User({
        name: 'John Doe',
        email: 'duplicate@example.com',
        password: 'Password987',
      });

      try {
        await duplicateUser.save();
        throw new Error('Should have thrown unique constraint error');
      } catch (err) {
        expect(err.code).to.equal(11000);
      }
    });
  });

  describe('Note Model', () => {
    it('should create a note linked to a user and fetch it successfully', async () => {
      const user = await User.create({
        name: 'Author Name',
        email: 'author@example.com',
        password: 'Password123',
      });

      const noteData = {
        title: 'Meeting Notes',
        content: '<h1>Rich Text content</h1><p>Notes content here</p>',
        user: user._id,
      };

      const note = new Note(noteData);
      const savedNote = await note.save();

      expect(savedNote._id).to.exist;
      expect(savedNote.title).to.equal(noteData.title);
      expect(savedNote.content).to.equal(noteData.content);
      expect(savedNote.user.toString()).to.equal(user._id.toString());
      expect(savedNote.createdAt).to.exist;
      expect(savedNote.updatedAt).to.exist;

      // Verify relationship populate
      const foundNote = await Note.findOne({ user: user._id }).populate('user');
      expect(foundNote.user.name).to.equal('Author Name');
    });

    it('should fail validation when required fields are missing', async () => {
      const note = new Note({
        title: '',
        content: '',
      });

      try {
        await note.save();
        throw new Error('Should have failed validation');
      } catch (err) {
        expect(err.name).to.equal('ValidationError');
        expect(err.errors.title.message).to.equal('Title is required');
        expect(err.errors.content.message).to.equal('Content is required');
        expect(err.errors.user.message).to.equal('User association is required');
      }
    });
  });
});
