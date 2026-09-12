const express = require('express');

module.exports = () => {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'unmasked-backend', time: new Date().toISOString() });
  });

  return router;
};
