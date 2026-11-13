PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS email_challenges (
  token_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  email TEXT,
  purpose TEXT NOT NULL CHECK (purpose IN ('download', 'trial')),
  offers INTEGER NOT NULL CHECK (offers IN (0, 1)),
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS challenges_expiry ON email_challenges(expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS trials (
  subject TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at = started_at + 2592000000)
);
CREATE TRIGGER IF NOT EXISTS immutable_trial
BEFORE UPDATE ON trials
BEGIN
  SELECT RAISE(ABORT, 'A trial cannot be restarted or extended');
END;

CREATE TABLE IF NOT EXISTS free_claims (
  subject TEXT NOT NULL,
  sku TEXT NOT NULL,
  claimed_at INTEGER NOT NULL,
  PRIMARY KEY (subject, sku)
);
CREATE TABLE IF NOT EXISTS consents (
  subject TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  confirmed_at INTEGER NOT NULL,
  subscribed INTEGER NOT NULL CHECK (subscribed IN (0, 1))
);

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('pro', 'items')),
  items TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  variant_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id),
  subject TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('pro', 'items')),
  items TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'refunded')),
  received_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_subject ON orders(subject, status);
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS limits_expiry ON rate_limits(expires_at);
