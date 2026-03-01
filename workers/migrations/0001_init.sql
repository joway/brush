-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

-- Email verification codes
CREATE TABLE IF NOT EXISTS email_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Prototypes
CREATE TABLE IF NOT EXISTS prototypes (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  public INTEGER NOT NULL DEFAULT 1,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Likes
CREATE TABLE IF NOT EXISTS likes (
  user_id INTEGER NOT NULL,
  prototype_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, prototype_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (prototype_id) REFERENCES prototypes(id)
);

CREATE INDEX IF NOT EXISTS idx_prototypes_public_updated
  ON prototypes (public, updated_at);
CREATE INDEX IF NOT EXISTS idx_prototypes_public_likes
  ON prototypes (public, likes_count);
CREATE INDEX IF NOT EXISTS idx_likes_prototype
  ON likes (prototype_id);
