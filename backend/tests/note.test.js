'use strict';

const originalChai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { createMongoMemoryServer, stopMongoMemoryServer } = require('./helpers/mongoMemoryServer');

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
    // MongoDB Memory Server downloads its binary once on a new machine.
    this.timeout(10 * 60 * 1000);
    process.env.JWT_SECRET ||= 'test-only-jwt-secret';
    mongoServer = await createMongoMemoryServer();
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    app = require('../app');
  });

  after(async () => {
    await mongoose.disconnect();
    await stopMongoMemoryServer(mongoServer);
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

  // ── PATCH /api/notes/:id/pin (Pin Toggle) ─────────────────────────────────
  describe('PATCH /api/notes/:id/pin', () => {
    it("should toggle a note's pinned state if owned by the user", async () => {
      // Toggle once (false -> true)
      const res1 = await chai
        .request(app)
        .patch(`/api/notes/${noteUserA._id}/pin`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res1).to.have.status(200);
      expect(res1.body.data.note.pinned).to.be.true;

      // Toggle again (true -> false)
      const res2 = await chai
        .request(app)
        .patch(`/api/notes/${noteUserA._id}/pin`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res2).to.have.status(200);
      expect(res2.body.data.note.pinned).to.be.false;
    });

    it("should return 404 when User B tries to pin User A's note (Ownership Check)", async () => {
      const res = await chai
        .request(app)
        .patch(`/api/notes/${noteUserA._id}/pin`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res).to.have.status(404);
      expect(res.body.message).to.equal('Note not found');
    });
  });

  // ── GET /api/notes (Search by Title) ──────────────────────────────────────
  describe('GET /api/notes (Search by Title)', () => {
    beforeEach(async () => {
      // Create additional notes for User A
      await chai.request(app).post('/api/notes').set('Authorization', `Bearer ${tokenUserA}`).send({
        title: 'Meeting Sprint Review',
        content: 'Sprint review details'
      });
      await chai.request(app).post('/api/notes').set('Authorization', `Bearer ${tokenUserA}`).send({
        title: 'Grocery checklist',
        content: 'Milk, bread'
      });
    });

    it("should support case-insensitive partial title matching for authenticated user", async () => {
      const res = await chai
        .request(app)
        .get('/api/notes?search=sprint')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res).to.have.status(200);
      expect(res.body.results).to.equal(1);
      expect(res.body.data.notes[0].title).to.equal('Meeting Sprint Review');
    });

    it("should respect user ownership boundaries when searching", async () => {
      // User B searches for "Sprint" which User A has
      const resB = await chai
        .request(app)
        .get('/api/notes?search=sprint')
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(resB).to.have.status(200);
      expect(resB.body.results).to.equal(0);
    });

    it("should return all user notes if search parameter is empty", async () => {
      const res = await chai
        .request(app)
        .get('/api/notes?search=')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res).to.have.status(200);
      // User A has "User A's First Note", "Meeting Sprint Review", and "Grocery checklist"
      expect(res.body.results).to.equal(3);
    });
  });

  // ── Import / Export Notes ────────────────────────────────────────────────
  describe('Import / Export Notes API', () => {
    it("should export only authenticated user's notes in correct portable format", async () => {
      // Create a note for User B to ensure it is not exported
      await chai.request(app).post('/api/notes').set('Authorization', `Bearer ${tokenUserB}`).send({
        title: "User B Note",
        content: "B's content"
      });

      const res = await chai
        .request(app)
        .get('/api/notes/export')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res).to.have.status(200);
      expect(res.headers['content-type']).to.include('application/json');
      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(1);
      
      const exportedNote = res.body[0];
      expect(exportedNote).to.have.property('title', "User A's First Note");
      expect(exportedNote).to.have.property('content', '<p>Content for User A</p>');
      expect(exportedNote).to.have.property('pinned');
      expect(exportedNote).to.have.property('createdAt');
      expect(exportedNote).to.have.property('updatedAt');
      expect(exportedNote).to.not.have.property('_id');
      expect(exportedNote).to.not.have.property('user');
    });

    it("should import a list of notes, skip malformed entries, and report stats", async () => {
      const importData = [
        {
          title: "Imported Note 1",
          content: "Successful import content"
        },
        {
          title: "", // invalid (empty title)
          content: "Will be skipped"
        },
        {
          title: "Imported Note 2",
          content: "   " // invalid (empty content)
        },
        {
          title: "Imported Note 3",
          content: "Valid third note",
          pinned: true
        }
      ];

      const res = await chai
        .request(app)
        .post('/api/notes/import')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send(importData);

      expect(res).to.have.status(200);
      expect(res.body.status).to.equal('success');
      expect(res.body.data.importedCount).to.equal(2);
      expect(res.body.data.skippedCount).to.equal(2);
      expect(res.body.data.errors).to.have.lengthOf(2);

      // Verify the new notes were saved in User A's list
      const listRes = await chai
        .request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${tokenUserA}`);

      // User A originally had 1 note, now has 3
      expect(listRes.body.results).to.equal(3);
      
      const titles = listRes.body.data.notes.map(n => n.title);
      expect(titles).to.include("Imported Note 1");
      expect(titles).to.include("Imported Note 3");
      
      const pinnedNote = listRes.body.data.notes.find(n => n.title === "Imported Note 3");
      expect(pinnedNote.pinned).to.be.true;
    });

    it("should return 400 when importing a non-array body", async () => {
      const res = await chai
        .request(app)
        .post('/api/notes/import')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: "Not an array", content: "Oops" });

      expect(res).to.have.status(400);
    });
  });
});
