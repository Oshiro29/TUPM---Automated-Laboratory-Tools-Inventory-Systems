CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_one_active_per_student
  ON transactions(student_id) WHERE returned_at IS NULL;
