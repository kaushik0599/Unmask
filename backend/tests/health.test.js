const test = require('node:test');
const assert = require('node:assert/strict');
const { setupServer } = require('./testUtils');

test('GET /health returns ok status', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/health`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.status, 'ok');
});
