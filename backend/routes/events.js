const express = require('express');
const { privacyFilter } = require('../middleware/privacyFilter');
const incidentService = require('../services/incidentService');

const REQUIRED_FIELDS = ['timestamp', 'website', 'event_type'];

module.exports = (db) => {
  const router = express.Router();

  router.post('/', privacyFilter, (req, res) => {
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'MALFORMED_INPUT', message: 'Request body must be a JSON object.' });
    }

    const missing = REQUIRED_FIELDS.filter((field) => !body[field]);
    if (missing.length) {
      return res.status(400).json({
        error: 'MALFORMED_INPUT',
        message: `Missing required field(s): ${missing.join(', ')}`
      });
    }

    if (body.severity && !incidentService.VALID_SEVERITIES.includes(body.severity)) {
      return res.status(400).json({
        error: 'MALFORMED_INPUT',
        message: `Invalid severity. Must be one of: ${incidentService.VALID_SEVERITIES.join(', ')}`
      });
    }

    if (body.metadata !== undefined && body.metadata !== null) {
      if (typeof body.metadata !== 'object' || Array.isArray(body.metadata)) {
        return res.status(400).json({ error: 'MALFORMED_INPUT', message: 'metadata must be an object.' });
      }
    }

    const result = incidentService.ingestEvent(db, body);
    res.status(201).json(result);
  });

  return router;
};
