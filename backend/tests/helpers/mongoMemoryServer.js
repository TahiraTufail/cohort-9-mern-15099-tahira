'use strict';

const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

/**
 * Keep MongoDB's temporary database inside the workspace. This avoids Windows
 * temp-directory cleanup interrupting the first binary download/startup.
 */
const createMongoMemoryServer = () => {
  const dbPath = fs.mkdtempSync(path.join(process.cwd(), '.mongo-test-'));
  return MongoMemoryServer.create({ instance: { dbPath } });
};

const stopMongoMemoryServer = async (server) => {
  if (!server) return;

  const dbPath = server.instanceInfo?.dbPath;
  await server.stop();

  if (dbPath) fs.rmSync(dbPath, { recursive: true, force: true });
};

module.exports = { createMongoMemoryServer, stopMongoMemoryServer };
