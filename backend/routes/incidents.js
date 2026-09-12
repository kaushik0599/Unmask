const express = require('express');
const crypto = require('crypto');
const incidentService = require('../services/incidentService');
const { explainIncident } = require('../services/aiExplainer');

module.exports = (db) => {
  const router = express.Router();

  router.post('/', (req, res) => {
    const body = req.body || {};
    const { website, title, summary, severity } = body;

    if (!website || typeof website !== 'string') {
      return res.status(400).json({ error: 'MALFORMED_INPUT', message: 'website is required.' });
    }

    const sev = severity || 'low';
    if (!incidentService.VALID_SEVERITIES.includes(sev)) {
      return res.status(400).json({
        error: 'MALFORMED_INPUT',
        message: `Invalid severity. Must be one of: ${incidentService.VALID_SEVERITIES.join(', ')}`
      });
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const finalTitle = title || `Incident on ${website}`;
    const finalSummary = summary || 'No events recorded yet.';

    db.prepare(
      `INSERT INTO incidents (id, created_at, updated_at, website, severity, status, title, summary, verdict)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?, NULL)`
    ).run(id, now, now, website, sev, finalTitle, finalSummary);

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    res.status(201).json(incident);
  });

  router.get('/', (req, res) => {
    const incidents = db
      .prepare(
        `SELECT i.*, (SELECT COUNT(*) FROM events e WHERE e.incident_id = i.id) as event_count
         FROM incidents i ORDER BY updated_at DESC`
      )
      .all();
    res.json(incidents);
  });

  router.get('/:id', (req, res) => {
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found.' });
    }
    const events = incidentService.findEventsForIncident(db, req.params.id).map(incidentService.deserializeEvent);
    res.json({ ...incident, events });
  });

  router.post('/:id/explain', (req, res) => {
    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Incident not found.' });
    }

    const events = incidentService.findEventsForIncident(db, req.params.id).map(incidentService.deserializeEvent);
    const explanation = explainIncident(events);

    const now = new Date().toISOString();
    db.prepare('UPDATE incidents SET verdict = ?, updated_at = ? WHERE id = ?').run(explanation.verdict, now, req.params.id);

    res.json(explanation);
  });

  return router;
};
