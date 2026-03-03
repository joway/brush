-- Destructive refactor: replace prototype_* tables with page_* tables

DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS prototype_versions;
DROP TABLE IF EXISTS prototypes;

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  public INTEGER NOT NULL DEFAULT 1,
  likes_count INTEGER NOT NULL DEFAULT 0,
  version_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS page_versions (
  page_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  html_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (page_id, version),
  FOREIGN KEY (page_id) REFERENCES pages(id)
);

CREATE TABLE IF NOT EXISTS page_likes (
  user_id INTEGER NOT NULL,
  page_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, page_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (page_id) REFERENCES pages(id)
);

CREATE INDEX IF NOT EXISTS idx_pages_public_updated
  ON pages (public, updated_at);
CREATE INDEX IF NOT EXISTS idx_pages_public_likes
  ON pages (public, likes_count);
CREATE INDEX IF NOT EXISTS idx_page_likes_page
  ON page_likes (page_id);
