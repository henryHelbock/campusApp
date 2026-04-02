-- Initial database schema for CampusApp
-- Tables: users, issues, lost_found_items, item_images, audit_logs

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('Building', 'Social', 'Road', 'Water', 'Debris', 'Fight')),
  severity TEXT NOT NULL CHECK (severity IN ('Mild', 'Medium', 'Large', 'Severe')),
  description TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  report_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fixed', 'archived')),
  reporter_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lost_found_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'resolved')),
  reporter_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('issue', 'lost_found')),
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  affected_content_id INTEGER NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Spatial indexes for geo-queries
CREATE INDEX IF NOT EXISTS idx_issues_location ON issues (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues (category);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues (created_at);

CREATE INDEX IF NOT EXISTS idx_lost_found_location ON lost_found_items (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_lost_found_status ON lost_found_items (status);
CREATE INDEX IF NOT EXISTS idx_lost_found_type ON lost_found_items (type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);
