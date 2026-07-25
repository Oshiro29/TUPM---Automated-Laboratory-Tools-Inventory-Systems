const { initializeDatabase } = require('./database');

const students = [
  ['TUPM-23-1111', 'Maria Santos', '4321', 'maria.santos@tupm.edu.ph'],
  ['TUPM-23-1112', 'Jerome Cruz', '1234', 'jerome.cruz@tupm.edu.ph'],
  ['TUPM-23-2201', 'MARK JIMSON NOGALO', '1111', 'markjimson.nogalo@tupm.edu.ph'],
];

const tools = [
  ['tool-1', 'Scientific Calculator', 'It solves complex mathematical, scientific, and engineering equations.', 'C-03', 5, 3],
  ['tool-2', 'Wire Stripper', 'It cuts and removes plastic insulation from electrical wires safely.', 'C-05', 4, 2],
  ['tool-3', 'Dual Screwdriver', 'It features interchangeable, double-sided tips to drive multiple screw types.', 'C-07', 2, 1],
  ['tool-4', 'Combination Pliers', 'It grips, bends, twists, and cuts heavy wires or fasteners.', 'C-09', 8, 6],
];

async function seedDatabase() {
  const db = await initializeDatabase();
  await db.exec('BEGIN');
  try {
    for (const student of students) {
      await db.run('INSERT OR IGNORE INTO students (id, name, pin, email) VALUES (?, ?, ?, ?)', student);
    }
    for (const tool of tools) {
      await db.run('INSERT OR IGNORE INTO tools (id, name, description, slot, total_qty, available_qty) VALUES (?, ?, ?, ?, ?, ?)', tool);
    }

    const toolAssignments = [
      ['C-01', 'tool-1'],
      ['C-05', 'tool-1'],
      ['C-09', 'tool-1'],
      ['C-13', 'tool-1'],
      ['C-02', 'tool-2'],
      ['C-06', 'tool-2'],
      ['C-10', 'tool-2'],
      ['C-14', 'tool-2'],
      ['C-03', 'tool-3'],
      ['C-07', 'tool-3'],
      ['C-11', 'tool-3'],
      ['C-15', 'tool-3'],
      ['C-04', 'tool-4'],
      ['C-08', 'tool-4'],
      ['C-12', 'tool-4'],
      ['C-16', 'tool-4'],
    ];
    for (const assignment of toolAssignments) {
      await db.run('INSERT OR IGNORE INTO tool_compartment_assignments (compartment_id, tool_id) VALUES (?, ?)', assignment);
    }

    await db.exec('COMMIT');
    return true;
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

if (require.main === module) {
  seedDatabase().then((seeded) => console.log(seeded ? 'Database seeded.' : 'Database already contains data.'))
    .catch((error) => { console.error('Database seed failed:', error); process.exitCode = 1; });
}

module.exports = { seedDatabase };
