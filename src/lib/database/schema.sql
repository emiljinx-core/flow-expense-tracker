-- LEDGER Expense Tracker SQLite Schema
-- Version 1

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  person TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('account', 'cash')),
  created_at TEXT NOT NULL, -- ISO 8601 timestamp
  origin TEXT NOT NULL CHECK(origin IN ('manual', 'detected')),
  source_app TEXT
);

-- Credits table
CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  target TEXT NOT NULL CHECK(target IN ('account', 'cash')),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL, -- ISO 8601 timestamp
  origin TEXT NOT NULL CHECK(origin IN ('manual', 'detected')),
  source_app TEXT
);

-- Budget history table
CREATE TABLE IF NOT EXISTS budget_history (
  month TEXT PRIMARY KEY, -- YYYY-MM format
  base REAL NOT NULL,
  carry_in REAL NOT NULL,
  spent REAL NOT NULL
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  name TEXT PRIMARY KEY,
  is_default INTEGER NOT NULL DEFAULT 0
);

-- App settings table (for non-preference settings that need to be in DB)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_source ON expenses(source);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_target ON credits(target);
CREATE INDEX IF NOT EXISTS idx_budget_history_month ON budget_history(month);
