const express = require('express');
const cors = require('cors');
const { createDb } = require('./db');
const healthRoutes = require('./routes/health');
const eventsRoutes = require('./routes/events');
const incidentsRoutes = require('./routes/incidents');

function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/health', healthRoutes(db));
  app.use('/events', eventsRoutes(db));
  app.use('/incidents', incidentsRoutes(db));

  app.use((req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found.' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'MALFORMED_INPUT', message: 'Invalid JSON payload.' });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected server error.' });
  });

  return app;
}

if (require.main === module) {
  const db = createDb();
  const app = createApp(db);
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`UNMASK backend listening on port ${PORT}`);
  });
}

module.exports = { createApp };
