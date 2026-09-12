const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    let database = 'ok';
    try {
      db.prepare('SELECT 1').get();
    } catch (err) {
      database = 'error';
    }

    res.json({
      status: database === 'ok' ? 'ok' : 'degraded',
      service: 'unmasked-backend',
      database,
      time: new Date().toISOString()
    });
  });

  return router;
};
