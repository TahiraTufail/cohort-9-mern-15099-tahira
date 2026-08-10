'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server');

chai.use(chaiHttp);
const { expect } = chai;

// ─── Auth Route Tests ─────────────────────────────────────────────────────────
describe('Auth Routes', () => {
  const testUser = {
    name: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'Password123',
  };
  let authToken;

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
      const res = await chai.request(app).post('/api/auth/register').send({ email: 'missing@test.com' });

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
      const res = await chai.request(app).post('/api/auth/login').send({ email: testUser.email });

      expect(res).to.have.status(400);
    });
  });
});
