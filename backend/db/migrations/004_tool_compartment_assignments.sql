CREATE TABLE IF NOT EXISTS tool_compartment_assignments (
  compartment_id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL REFERENCES tools(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tool_compartment_assignments_tool ON tool_compartment_assignments (tool_id);
