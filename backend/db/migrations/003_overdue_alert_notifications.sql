ALTER TABLE alerts ADD COLUMN transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE alerts ADD COLUMN alert_type TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE alerts ADD COLUMN resolved_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_one_overdue_per_transaction
  ON alerts(transaction_id, alert_type)
  WHERE alert_type = 'OVERDUE';
CREATE INDEX IF NOT EXISTS idx_alerts_active_overdue
  ON alerts(alert_type, resolved_at, created_at DESC);
