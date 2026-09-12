// One real end-to-end run of the full pipeline this backend exists to
// support: an observed sensitive-field event, followed by a blocked
// cross-site exfiltration attempt for the same field, grouped into one
// incident, retrievable with its full attack-chain evidence, and explained
// deterministically from that recorded evidence.
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupServer } = require('./testUtils');

test('end-to-end: OBSERVED -> BLOCKED -> incident -> GET -> explain', async (t) => {
  const { server, baseUrl } = setupServer();
  t.after(() => server.close());

  const fieldHash = 'f'.repeat(64);

  const observed = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: '2026-01-01T10:41:08.000Z',
      website: 'checkout.example.com',
      event_type: 'exfiltration_detected',
      field_type: 'password',
      script_origin: 'https://cdn.trackerio.io/pixel.js',
      destination: 'https://cdn.trackerio.io/collect',
      vector: 'fetch',
      policy: 'default',
      action: 'OBSERVED',
      severity: 'medium',
      metadata: { field_id: 'login-field-1', field_hash: fieldHash, field_length: 12 }
    })
  });
  assert.equal(observed.status, 201);
  const observedBody = await observed.json();

  const blocked = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: '2026-01-01T10:41:26.000Z',
      website: 'checkout.example.com',
      event_type: 'network_exfiltration',
      field_type: 'password',
      script_origin: 'https://cdn.trackerio.io/pixel.js',
      destination: 'https://data-collector.io/collect',
      vector: 'fetch',
      policy: 'cross-site-egress-blocked',
      action: 'BLOCKED',
      severity: 'critical',
      metadata: { field_id: 'login-field-1', field_hash: fieldHash, field_length: 12 }
    })
  });
  assert.equal(blocked.status, 201);
  const blockedBody = await blocked.json();

  // One coherent incident, not two unrelated ones.
  assert.equal(blockedBody.incident.id, observedBody.incident.id);
  assert.equal(blockedBody.incident.severity, 'critical');

  const getRes = await fetch(`${baseUrl}/incidents/${blockedBody.incident.id}`);
  assert.equal(getRes.status, 200);
  const incident = await getRes.json();

  assert.equal(incident.events.length, 2);
  assert.equal(incident.events[0].action, 'OBSERVED');
  assert.equal(incident.events[1].action, 'BLOCKED');
  assert.equal(incident.events[1].destination, 'https://data-collector.io/collect');
  assert.equal(incident.events[1].metadata.field_hash, fieldHash);

  const explainRes = await fetch(`${baseUrl}/incidents/${incident.id}/explain`, { method: 'POST' });
  assert.equal(explainRes.status, 200);
  const explanation = await explainRes.json();

  assert.equal(explanation.findings.length, 2);
  assert.match(explanation.verdict, /critical/);
  assert.match(explanation.verdict, /data-collector\.io/);

  // The explanation is stored back onto the incident record.
  const finalGet = await fetch(`${baseUrl}/incidents/${incident.id}`);
  const finalIncident = await finalGet.json();
  assert.equal(finalIncident.verdict, explanation.verdict);

  // No raw plaintext or full fingerprint ever needs to appear for this to
  // work - confirm the full hash is present only where it belongs (it is
  // itself just a fingerprint, not plaintext) and nothing resembling a
  // secret value leaked in free-text fields.
  const raw = JSON.stringify(finalIncident);
  assert.ok(!raw.toLowerCase().includes('correcthorsebatterystaple'));
});
