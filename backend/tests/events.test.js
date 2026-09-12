const test = require('node:test');
const assert = require('node:assert/strict');
const { setupServer } = require('./testUtils');

function validEvent(overrides = {}) {
  return {
    timestamp: new Date().toISOString(),
    website: 'example.com',
    event_type: 'form_scrape',
    field_type: 'password',
    script_origin: 'https://evil.example',
    destination: 'https://exfil.example/collect',
    vector: 'fetch',
    policy: 'default',
    action: 'blocked',
    severity: 'medium',
    metadata: { form_id: 'login-form' },
    ...overrides
  };
}

test('valid event ingestion creates event and incident', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent())
  });
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.ok(body.event.event_id);
  assert.equal(body.event.website, 'example.com');
  assert.equal(body.event.field_type, 'password');
  assert.deepEqual(body.event.metadata, { form_id: 'login-form' });
  assert.ok(body.incident.id);
  assert.equal(body.incident.website, 'example.com');
  assert.equal(body.incident.status, 'open');
});

test('malformed input is rejected when required fields are missing', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ website: 'example.com' })
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, 'MALFORMED_INPUT');
});

test('malformed input is rejected for invalid severity', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ severity: 'apocalyptic' }))
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, 'MALFORMED_INPUT');
});

test('malformed JSON body is rejected', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ this is not valid json'
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, 'MALFORMED_INPUT');
});

test('privacy violation rejects payloads with a password key', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ metadata: { password: 'hunter2' } }))
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, 'PRIVACY_VIOLATION');
});

test('privacy violation rejects payloads with a raw token value', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ metadata: { note: 'leaked access_token abc123' } }))
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, 'PRIVACY_VIOLATION');
});

test('malformed input is rejected when a required field has the wrong type', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ website: { nested: 'object' } }))
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, 'MALFORMED_INPUT');

  // A single malformed event must never take the server down.
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
});

test('malformed input is rejected for an unparseable timestamp', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ timestamp: 'not-a-real-timestamp' }))
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, 'MALFORMED_INPUT');
});

test('a field_id matching a real DOM id like "password" is not a privacy violation', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ metadata: { field_id: 'password', field_hash: 'a'.repeat(64), field_length: 8 } }))
  });
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.equal(body.event.metadata.field_id, 'password');
});

test('field_type "password" as a classification label is still allowed', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ field_type: 'password' }))
  });

  assert.equal(res.status, 201);
});
