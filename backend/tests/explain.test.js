const test = require('node:test');
const assert = require('node:assert/strict');
const { setupServer } = require('./testUtils');
const { explainIncident } = require('../services/aiExplainer');

function validEvent(overrides = {}) {
  return {
    timestamp: new Date().toISOString(),
    website: 'explain.example',
    event_type: 'form_scrape',
    destination: 'https://exfil.example',
    severity: 'high',
    ...overrides
  };
}

test('explainIncident references real event indices and invents nothing', () => {
  const events = [
    { event_id: 'e1', event_type: 'clipboard_read', severity: 'low', timestamp: 't1' },
    { event_id: 'e2', event_type: 'form_scrape', severity: 'high', destination: 'https://exfil.example', timestamp: 't2' }
  ];

  const explanation = explainIncident(events);

  assert.equal(explanation.findings.length, 2);
  explanation.findings.forEach((finding, i) => {
    assert.equal(finding.event_index, i);
    assert.equal(finding.event_id, events[i].event_id);
    assert.ok(finding.statement.includes(events[i].event_type));
  });
  assert.match(explanation.verdict, /high/);
});

test('explainIncident handles an incident with no events', () => {
  const explanation = explainIncident([]);
  assert.equal(explanation.findings.length, 0);
  assert.equal(explanation.confidence, 'low');
});

test('POST /incidents/:id/explain returns an evidence-based explanation', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const ingest = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent())
  });
  const ingestBody = await ingest.json();
  const incidentId = ingestBody.incident.id;

  const res = await fetch(`${baseUrl}/incidents/${incidentId}/explain`, { method: 'POST' });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.findings.length, 1);
  assert.equal(body.findings[0].event_index, 0);
  assert.equal(body.findings[0].event_id, ingestBody.event.event_id);

  const getRes = await fetch(`${baseUrl}/incidents/${incidentId}`);
  const incident = await getRes.json();
  assert.equal(incident.verdict, body.verdict);
});

test('POST /incidents/:id/explain returns 404 for unknown incident', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/incidents/does-not-exist/explain`, { method: 'POST' });
  assert.equal(res.status, 404);
});
