ALTER TABLE prototypes ADD COLUMN version_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS prototype_versions (
  prototype_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  html_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (prototype_id, version),
  FOREIGN KEY (prototype_id) REFERENCES prototypes(id)
);

CREATE INDEX IF NOT EXISTS idx_versions_proto
  ON prototype_versions (prototype_id);
