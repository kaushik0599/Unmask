const test = require('node:test');
const assert = require('node:assert/strict');
const { setupServer } = require('./testUtils');

function eventAt(timestamp, overrides = {}) {
  return {
    timestamp,
    website: 'replay.example',
    event_type: 'exfiltration_detected',
    severity: 'low',
    ...overrides
  };
}

test('events with identical timestamps keep deterministic insertion order for replay', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const sameInstant = '2026-01-01T00:00:00.000Z';

  const first = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventAt(sameInstant, { event_type: 'field_observed' }))
  });
  const firstBody = await first.json();

  const second = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventAt(sameInstant, { event_type: 'network_exfiltration' }))
  });
  const secondBody = await second.json();

  const third = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventAt(sameInstant, { event_type: 'incident_recorded' }))
  });
  const thirdBody = await third.json();

  const res = await fetch(`${baseUrl}/incidents/${thirdBody.incident.id}`);
  const incident = await res.json();

  assert.equal(incident.events.length, 3);
  // All three share one timestamp - order must fall back to insertion order,
  // not be scrambled, so the frontend can replay the real attack sequence.
  assert.deepEqual(
    incident.events.map((e) => e.event_id),
    [firstBody.event.event_id, secondBody.event.event_id, thirdBody.event.event_id]
  );
});

test('events posted out of timestamp order are replayed chronologically', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const later = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventAt('2026-01-01T00:00:10.000Z', { website: 'out-of-order.example', event_type: 'network_exfiltration' }))
  });
  const laterBody = await later.json();

  const earlier = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventAt('2026-01-01T00:00:01.000Z', {
      website: 'out-of-order.example',
      event_type: 'field_observed',
      incident_id: laterBody.incident.id
    }))
  });
  const earlierBody = await earlier.json();

  const res = await fetch(`${baseUrl}/incidents/${laterBody.incident.id}`);
  const incident = await res.json();

  assert.deepEqual(
    incident.events.map((e) => e.event_id),
    [earlierBody.event.event_id, laterBody.event.event_id]
  );
});
