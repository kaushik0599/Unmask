const crypto = require('crypto');

const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };
const VALID_SEVERITIES = Object.keys(SEVERITY_RANK);

function maxSeverity(a, b) {
  const rankA = SEVERITY_RANK[a] || SEVERITY_RANK.low;
  const rankB = SEVERITY_RANK[b] || SEVERITY_RANK.low;
  return rankA >= rankB ? a : b;
}

function buildTitle(website, events) {
  const eventTypes = [...new Set(events.map((e) => e.event_type))];
  if (eventTypes.length === 1) {
    return `${eventTypes[0]} detected on ${website}`;
  }
  return `Multiple security events detected on ${website}`;
}

function buildSummary(events) {
  const count = events.length;
  const eventTypes = [...new Set(events.map((e) => e.event_type))];
  const destinations = [...new Set(events.map((e) => e.destination).filter(Boolean))];

  let summary = `${count} event${count === 1 ? '' : 's'} recorded (${eventTypes.join(', ')}).`;
  if (destinations.length) {
    summary += ` Observed destination(s): ${destinations.join(', ')}.`;
  }
  return summary;
}

function deserializeEvent(row) {
  if (!row) return row;
  const { metadata_json, ...rest } = row;
  return {
    ...rest,
    metadata: metadata_json ? JSON.parse(metadata_json) : null
  };
}

function findEventsForIncident(db, incidentId) {
  return db
    .prepare('SELECT * FROM events WHERE incident_id = ? ORDER BY timestamp ASC, rowid ASC')
    .all(incidentId);
}

function ingestEvent(db, input) {
  const now = new Date().toISOString();
  const severity = input.severity || 'low';

  let incident = null;
  if (input.incident_id) {
    incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(input.incident_id);
  }
  if (!incident) {
    incident = db
      .prepare("SELECT * FROM incidents WHERE website = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1")
      .get(input.website);
  }

  if (!incident) {
    const incidentId = crypto.randomUUID();
    const title = buildTitle(input.website, [input]);
    const summary = buildSummary([input]);
    db.prepare(
      `INSERT INTO incidents (id, created_at, updated_at, website, severity, status, title, summary, verdict)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?, NULL)`
    ).run(incidentId, now, now, input.website, severity, title, summary);
    incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId);
  }

  const eventId = crypto.randomUUID();

  db.prepare(
    `INSERT INTO events (
      event_id, incident_id, timestamp, tab_id, website, field_type,
      script_origin, event_type, destination, vector, policy, action, severity, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    eventId,
    incident.id,
    input.timestamp,
    input.tab_id !== undefined && input.tab_id !== null ? String(input.tab_id) : null,
    input.website,
    input.field_type || null,
    input.script_origin || null,
    input.event_type,
    input.destination || null,
    input.vector || null,
    input.policy || null,
    input.action || null,
    severity,
    input.metadata ? JSON.stringify(input.metadata) : null
  );

  const allEvents = findEventsForIncident(db, incident.id);
  const escalatedSeverity = allEvents.reduce((acc, e) => maxSeverity(acc, e.severity), 'low');
  const title = buildTitle(incident.website, allEvents);
  const summary = buildSummary(allEvents);

  db.prepare('UPDATE incidents SET severity = ?, title = ?, summary = ?, updated_at = ? WHERE id = ?').run(
    escalatedSeverity,
    title,
    summary,
    now,
    incident.id
  );

  const updatedIncident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incident.id);
  const createdEvent = db.prepare('SELECT * FROM events WHERE event_id = ?').get(eventId);

  return { event: deserializeEvent(createdEvent), incident: updatedIncident };
}

module.exports = {
  ingestEvent,
  deserializeEvent,
  findEventsForIncident,
  buildTitle,
  buildSummary,
  maxSeverity,
  VALID_SEVERITIES
};
