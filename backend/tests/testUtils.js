const { createApp } = require('../server');
const { createDb } = require('../db');

function setupServer() {
  const db = createDb(':memory:');
  const app = createApp(db);
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  return { server, baseUrl, db };
}

module.exports = { setupServer };
