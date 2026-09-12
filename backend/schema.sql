CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  website TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  verdict TEXT
);

CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  tab_id TEXT,
  website TEXT NOT NULL,
  field_type TEXT,
  script_origin TEXT,
  event_type TEXT NOT NULL,
  destination TEXT,
  vector TEXT,
  policy TEXT,
  action TEXT,
  severity TEXT NOT NULL DEFAULT 'low',
  metadata_json TEXT,
  FOREIGN KEY (incident_id) REFERENCES incidents(id)
);

CREATE INDEX IF NOT EXISTS idx_events_incident_id ON events(incident_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_website ON events(website);

CREATE INDEX IF NOT EXISTS idx_incidents_website ON incidents(website);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_updated_at ON incidents(updated_at);
