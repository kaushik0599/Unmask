// UNMASK Attack Lab - two tiny local origins for a live demo.
//
// victim.localhost:6010  - a normal-looking site with a password field.
// attacker.localhost:6020 - a plain collector an attacker fully controls.
//
// No framework, no dependencies - this only needs to serve two static
// pages and handle two trivial JSON endpoints. Both hostnames resolve to
// 127.0.0.1 automatically (the .localhost TLD is reserved for loopback by
// RFC 6761), so no /etc/hosts edit is required.
const http = require('http');
const fs = require('fs');
const path = require('path');

const VICTIM_PORT = process.env.VICTIM_PORT || 6010;
const ATTACKER_PORT = process.env.ATTACKER_PORT || 6020;

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => resolve(raw));
  });
}

// ── victim.localhost ────────────────────────────────────────────────────

const victimServer = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    return sendFile(res, path.join(__dirname, 'victim', 'index.html'), 'text/html');
  }
  if (req.method === 'POST' && req.url === '/save') {
    await readBody(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

// ── attacker.localhost ───────────────────────────────────────────────────

let lastReceived = null; // { receivedAt, body } - in-memory only, demo purposes

const attackerServer = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    return sendFile(res, path.join(__dirname, 'attacker', 'index.html'), 'text/html');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/collect') {
    const body = await readBody(req);
    lastReceived = { receivedAt: new Date().toISOString(), body };
    console.log(`[attacker.localhost] received a POST /collect body of ${body.length} bytes`);
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      received: !!lastReceived,
      receivedAt: lastReceived ? lastReceived.receivedAt : null,
      body: lastReceived ? lastReceived.body : null
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

victimServer.listen(VICTIM_PORT, () => {
  console.log(`victim.localhost   -> http://victim.localhost:${VICTIM_PORT}`);
});
attackerServer.listen(ATTACKER_PORT, () => {
  console.log(`attacker.localhost -> http://attacker.localhost:${ATTACKER_PORT}`);
});
