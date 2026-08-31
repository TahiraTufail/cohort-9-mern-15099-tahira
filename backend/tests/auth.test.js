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

// ─── Auth Route Tests ─────────────────────────────────────────────────────────
describe('Auth Routes', () => {
  const testUser = {
    name: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'Password123',
  };
  let authToken;

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

  // ── POST /api/auth/register ───────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new user and return a token', async () => {
      const res = await chai.request(app).post('/api/auth/register').send(testUser);

      expect(res).to.have.status(201);
      expect(res.body.status).to.equal('success');
      expect(res.body.data).to.have.property('token');
      expect(res.body.data.user).to.have.property('email', testUser.email);

      authToken = res.body.data.token;
    });

    it('should return 409 if email is already registered', async () => {
      const res = await chai.request(app).post('/api/auth/register').send(testUser);

      expect(res).to.have.status(409);
      expect(res.body.status).to.equal('error');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await chai
        .request(app)
        .post('/api/auth/register')
        .send({ email: 'missing@test.com' });

      expect(res).to.have.status(400);
      expect(res.body.status).to.equal('error');
    });
  });

  // ── POST /api/auth/login ─────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return a token', async () => {
      const res = await chai
        .request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res).to.have.status(200);
      expect(res.body.status).to.equal('success');
      expect(res.body.data).to.have.property('token');
    });

    it('should return 401 with wrong password', async () => {
      const res = await chai
        .request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword' });

      expect(res).to.have.status(401);
      expect(res.body.status).to.equal('error');
    });

    it('should return 401 with non-existent email', async () => {
      const res = await chai
        .request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'Password123' });

      expect(res).to.have.status(401);
    });

    it('should return 400 if fields are missing', async () => {
      const res = await chai
        .request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email });

      expect(res).to.have.status(400);
    });
  });
});
