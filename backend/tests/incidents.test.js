const test = require('node:test');
const assert = require('node:assert/strict');
const { setupServer } = require('./testUtils');

function validEvent(overrides = {}) {
  return {
    timestamp: new Date().toISOString(),
    website: 'example.com',
    event_type: 'form_scrape',
    severity: 'low',
    ...overrides
  };
}

test('POST /incidents creates an incident explicitly', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ website: 'manual.example' })
  });
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.ok(body.id);
  assert.equal(body.website, 'manual.example');
  assert.equal(body.status, 'open');
});

test('POST /incidents rejects missing website', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, 'MALFORMED_INPUT');
});

test('events for the same open website group into one incident', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const first = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ event_type: 'clipboard_read' }))
  });
  const firstBody = await first.json();

  const second = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ event_type: 'form_scrape' }))
  });
  const secondBody = await second.json();

  assert.equal(firstBody.incident.id, secondBody.incident.id);

  const getRes = await fetch(`${baseUrl}/incidents/${firstBody.incident.id}`);
  const incident = await getRes.json();

  assert.equal(incident.events.length, 2);
  assert.equal(incident.events[0].event_id, firstBody.event.event_id);
  assert.equal(incident.events[1].event_id, secondBody.event.event_id);
});

test('incident severity escalates to the highest event severity', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ website: 'escalate.example', severity: 'low' }))
  });

  const second = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ website: 'escalate.example', severity: 'critical' }))
  });
  const secondBody = await second.json();

  assert.equal(secondBody.incident.severity, 'critical');

  const third = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent({ website: 'escalate.example', severity: 'low' }))
  });
  const thirdBody = await third.json();

  // severity must never de-escalate once a higher severity event has been seen
  assert.equal(thirdBody.incident.severity, 'critical');
});

test('GET /incidents lists incidents ordered by most recently updated', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  await fetch(`${baseUrl}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ website: 'a.example' })
  });
  await fetch(`${baseUrl}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ website: 'b.example' })
  });

  const res = await fetch(`${baseUrl}/incidents`);
  const list = await res.json();

  assert.equal(res.status, 200);
  assert.equal(list.length, 2);
  assert.equal(list[0].website, 'b.example');
});

test('GET /incidents/:id returns 404 for unknown incident', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/incidents/does-not-exist`);
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.equal(body.error, 'NOT_FOUND');
});
