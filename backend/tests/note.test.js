'use strict';

const originalChai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

originalChai.use(chaiHttp.default || chaiHttp);
const chai = Object.create(originalChai, {
  request: { value: chaiHttp.request.execute, enumerable: true },
});
const { expect } = originalChai;

let mongoServer;
let app;

describe('Notes CRUD API Tests', () => {
  let tokenUserA;
  let tokenUserB;
  let userA;
  let userB;
  let noteUserA;

  before(async function () {
    this.timeout(30000);
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    app = require('../server');
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear Users and Notes before each test block
    const User = require('../src/models/User');
    const Note = require('../src/models/Note');
    await User.deleteMany({});
    await Note.deleteMany({});

    // Register User A
    const resA = await chai.request(app).post('/api/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password123',
    });
    tokenUserA = resA.body.data.token;
    userA = resA.body.data.user;

    // Register User B
    const resB = await chai.request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'Password123',
    });
    tokenUserB = resB.body.data.token;
    userB = resB.body.data.user;

    // Create a note for User A
    const resNote = await chai
      .request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: "User A's First Note",
        content: '<p>Content for User A</p>',
      });
    noteUserA = resNote.body.data.note;
  });

  // ── Authentication Protection ─────────────────────────────────────────────
  describe('Authentication Enforcement', () => {
    it('should return 401 when accessing notes without a token', async () => {
      const res = await chai.request(app).get('/api/notes');
      expect(res).to.have.status(401);
    });

    it('should return 401 when creating a note with an invalid token', async () => {
      const res = await chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', 'Bearer invalid_token_here')
        .send({ title: 'Test', content: 'Test' });
      expect(res).to.have.status(401);
    });
  });

  // ── POST /api/notes (Create) ──────────────────────────────────────────────
  describe('POST /api/notes', () => {
    it('should create a note linked to the authenticated user', async () => {
      const res = await chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'New Note',
          content: 'Note content',
        });

      expect(res).to.have.status(201);
      expect(res.body.status).to.equal('success');
      expect(res.body.data.note).to.have.property('title', 'New Note');
      expect(res.body.data.note).to.have.property('user', userA.id);
    });

    it('should return 400 when title or content is missing', async () => {
      const res = await chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'Only Title' });

      expect(res).to.have.status(400);
      expect(res.body.status).to.equal('error');
    });
  });

  // ── GET /api/notes (List) ──────────────────────────────────────────────────
  describe('GET /api/notes', () => {
    it("should return only the authenticated user's notes", async () => {
      // Create a note for User B
      await chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({
          title: "User B's Note",
          content: 'Secret content',
        });

      // User A requests notes list
      const resA = await chai
        .request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(resA).to.have.status(200);
      expect(resA.body.results).to.equal(1);
      expect(resA.body.data.notes[0]._id).to.equal(noteUserA._id);

      // User B requests notes list
      const resB = await chai
        .request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(resB).to.have.status(200);
      expect(resB.body.results).to.equal(1);
      expect(resB.body.data.notes[0].title).to.equal("User B's Note");
    });
  });

  // ── GET /api/notes/:id (Single Note) ──────────────────────────────────────
  describe('GET /api/notes/:id', () => {
    it("should fetch a note by ID if owned by the user", async () => {
      const res = await chai
        .request(app)
        .get(`/api/notes/${noteUserA._id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res).to.have.status(200);
      expect(res.body.data.note).to.have.property('title', noteUserA.title);
    });

    it("should return 404 when User B tries to fetch User A's note (Ownership Check)", async () => {
      const res = await chai
        .request(app)
        .get(`/api/notes/${noteUserA._id}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res).to.have.status(404);
      expect(res.body.message).to.equal('Note not found');
    });
  });

  // ── PUT /api/notes/:id (Update Note) ──────────────────────────────────────
  describe('PUT /api/notes/:id', () => {
    it("should update a note if owned by the user", async () => {
      const res = await chai
        .request(app)
        .put(`/api/notes/${noteUserA._id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Updated Title',
        });

      expect(res).to.have.status(200);
      expect(res.body.data.note).to.have.property('title', 'Updated Title');
      expect(res.body.data.note).to.have.property('content', noteUserA.content);
    });

    it("should return 404 when User B tries to update User A's note (Ownership Check)", async () => {
      const res = await chai
        .request(app)
        .put(`/api/notes/${noteUserA._id}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({
          title: 'Hacked Title',
        });

      expect(res).to.have.status(404);
      expect(res.body.message).to.equal('Note not found');
    });

    it('should return 400 when empty update fields are sent', async () => {
      const res = await chai
        .request(app)
        .put(`/api/notes/${noteUserA._id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: '   ',
        });

      expect(res).to.have.status(400);
    });
  });

  // ── DELETE /api/notes/:id (Delete Note) ───────────────────────────────────
  describe('DELETE /api/notes/:id', () => {
    it("should return 404 when User B tries to delete User A's note (Ownership Check)", async () => {
      const res = await chai
        .request(app)
        .delete(`/api/notes/${noteUserA._id}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res).to.have.status(404);
      expect(res.body.message).to.equal('Note not found');
    });

    it("should delete a note if owned by the user", async () => {
      const res = await chai
        .request(app)
        .delete(`/api/notes/${noteUserA._id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res).to.have.status(200);
      expect(res.body.message).to.equal('Note deleted successfully');

      // Confirm note is gone
      const checkRes = await chai
        .request(app)
        .get(`/api/notes/${noteUserA._id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);
      expect(checkRes).to.have.status(404);
    });
  });
});
