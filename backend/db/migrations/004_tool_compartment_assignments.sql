CREATE TABLE IF NOT EXISTS tool_compartment_assignments (
  compartment_id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL REFERENCES tools(id) ON UPDATE CASCADE ON DELETE CASCADE
);

INSERT OR IGNORE INTO tool_compartment_assignments (compartment_id, tool_id) VALUES
  ('C-01', 'tool-1'),
  ('C-05', 'tool-1'),
  ('C-09', 'tool-1'),
  ('C-13', 'tool-1'),
  ('C-02', 'tool-2'),
  ('C-06', 'tool-2'),
  ('C-10', 'tool-2'),
  ('C-14', 'tool-2'),
  ('C-03', 'tool-3'),
  ('C-07', 'tool-3'),
  ('C-11', 'tool-3'),
  ('C-15', 'tool-3'),
  ('C-04', 'tool-4'),
  ('C-08', 'tool-4'),
  ('C-12', 'tool-4'),
  ('C-16', 'tool-4');

UPDATE tools SET slot = 'C-01' WHERE id = 'tool-1' AND (slot IS NULL OR slot <> 'C-01');
UPDATE tools SET slot = 'C-02' WHERE id = 'tool-2' AND (slot IS NULL OR slot <> 'C-02');
UPDATE tools SET slot = 'C-03' WHERE id = 'tool-3' AND (slot IS NULL OR slot <> 'C-03');
UPDATE tools SET slot = 'C-04' WHERE id = 'tool-4' AND (slot IS NULL OR slot <> 'C-04');
