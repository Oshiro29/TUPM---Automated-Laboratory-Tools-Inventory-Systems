const { initializeDatabase } = require('./database');

const students = [
  ['TUPM-23-1111', 'Maria Santos', '4321', 'maria.santos@tupm.edu.ph'],
  ['TUPM-23-1112', 'Jerome Cruz', '1234', 'jerome.cruz@tupm.edu.ph'],
];

const tools = [
  ['tool-1', 'Scientific Calculator', 'It solves complex mathematical, scientific, and engineering equations.', 'C-03', 5, 3],
  ['tool-2', 'Wire Stripper', 'It cuts and removes plastic insulation from electrical wires safely.', 'C-05', 4, 2],
  ['tool-3', 'Dual Screwdriver', 'It features interchangeable, double-sided tips to drive multiple screw types.', 'C-07', 2, 1],
  ['tool-4', 'Combination Pliers', 'It grips, bends, twists, and cuts heavy wires or fasteners.', 'C-09', 8, 6],
];

async function seedDatabase() {
  const db = await initializeDatabase();
  const existing = await db.get('SELECT COUNT(*) AS count FROM students');
  if (existing.count > 0) return false;

  await db.exec('BEGIN');
  try {
    for (const student of students) {
      await db.run('INSERT INTO students (id, name, pin, email) VALUES (?, ?, ?, ?)', student);
    }
    for (const tool of tools) {
      await db.run('INSERT INTO tools (id, name, description, slot, total_qty, available_qty) VALUES (?, ?, ?, ?, ?, ?)', tool);
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
