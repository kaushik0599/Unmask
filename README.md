# UNMASK

UNMASK watches how sensitive data moves through the browser — field → script → destination — and blocks it locally before a silent leak becomes a breach.

**Architecture:** Chrome extension (Data X-Ray fingerprints sensitive fields, Firewall blocks cross-site exfiltration in real time) → Express + SQLite backend (incident grouping, deterministic explanation) → React console (Investigate, Incident Center, Incident Detail, Replay).

## Run it

```bash
cd backend && npm install && npm start        # http://localhost:4000
cd frontend && npm install && npm run dev      # http://localhost:5173
```

Load `extension/` as an unpacked extension in `chrome://extensions` (Developer Mode required).

## Attack Lab (live demo)

```bash
node attack-lab/server.js
```

Open `http://victim.localhost:6010`, sign in with any test password, and wait ~6 seconds. A simulated compromised script then tries to send the password to `http://attacker.localhost:6020` — a different origin. With the extension loaded, UNMASK's Firewall blocks it before the request leaves the browser; check `http://attacker.localhost:6020` to confirm it received nothing, and the console's Incident Center to see the recorded, replayable incident.
