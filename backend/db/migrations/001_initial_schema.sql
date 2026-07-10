CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  slot TEXT NOT NULL UNIQUE,
  total_qty INTEGER NOT NULL CHECK (total_qty >= 0),
  available_qty INTEGER NOT NULL CHECK (available_qty BETWEEN 0 AND total_qty)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  tool_id TEXT NOT NULL REFERENCES tools(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  compartment_id TEXT NOT NULL,
  borrowed_at INTEGER NOT NULL,
  due_at INTEGER NOT NULL CHECK (due_at >= borrowed_at),
  returned_at INTEGER,
  return_compartment_id TEXT,
  CHECK ((returned_at IS NULL AND return_compartment_id IS NULL) OR
         (returned_at IS NOT NULL AND return_compartment_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_student_active
  ON transactions(student_id, returned_at);
CREATE INDEX IF NOT EXISTS idx_transactions_due_active
  ON transactions(due_at) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_tool_active
  ON transactions(tool_id, returned_at);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
