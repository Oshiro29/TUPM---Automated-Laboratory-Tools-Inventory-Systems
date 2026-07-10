const { randomUUID } = require('crypto');

function mapStudent(row) {
  return row && { id: row.id, name: row.name, pin: row.pin, email: row.email };
}

function mapTool(row) {
  return row && {
    id: row.id,
    name: row.name,
    description: row.description,
    slot: row.slot,
    totalQty: row.total_qty,
    availableQty: row.available_qty,
  };
}

function mapTransaction(row) {
  return row && {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    toolId: row.tool_id,
    toolName: row.tool_name,
    compartmentId: row.compartment_id,
    borrowedAt: row.borrowed_at,
    dueAt: row.due_at,
    returnedAt: row.returned_at,
    ...(row.return_compartment_id ? { returnCompartmentId: row.return_compartment_id } : {}),
  };
}

function mapAlert(row) {
  return row && { id: row.id, message: row.message, createdAt: row.created_at };
}

function createInventoryRepository(db) {
  let writeChain = Promise.resolve();
  const serializeWrite = (operation) => {
    const result = writeChain.then(operation, operation);
    writeChain = result.catch(() => {});
    return result;
  };

  const transactionSelect = `
    SELECT tx.*, students.name AS student_name, tools.name AS tool_name
    FROM transactions tx
    JOIN students ON students.id = tx.student_id
    JOIN tools ON tools.id = tx.tool_id`;

  return {
    async findStudentById(studentId) {
      return mapStudent(await db.get('SELECT id, name, pin, email FROM students WHERE id = ?', [studentId]));
    },

    async listTools() {
      return (await db.all('SELECT * FROM tools ORDER BY id')).map(mapTool);
    },

    async findActiveTransactionByStudentId(studentId) {
      const row = await db.get(`${transactionSelect} WHERE tx.student_id = ? AND tx.returned_at IS NULL`, [studentId]);
      return mapTransaction(row);
    },

    async borrowTool({ student, toolId, compartmentId, dueAt }) {
      return serializeWrite(async () => {
        await db.exec('BEGIN IMMEDIATE');
        try {
          const active = await db.get('SELECT id FROM transactions WHERE student_id = ? AND returned_at IS NULL', [student.id]);
          if (active) {
            await db.exec('ROLLBACK');
            return { reason: 'ACTIVE_TRANSACTION' };
          }

          const tool = await db.get('SELECT id FROM tools WHERE id = ?', [toolId]);
          if (!tool) {
            await db.exec('ROLLBACK');
            return { reason: 'TOOL_NOT_FOUND' };
          }

          const claimed = await db.run(
            'UPDATE tools SET available_qty = available_qty - 1 WHERE id = ? AND available_qty > 0',
            [toolId],
          );
          if (claimed.changes === 0) {
            await db.exec('ROLLBACK');
            return { reason: 'TOOL_UNAVAILABLE' };
          }

          const borrowedAt = Date.now();
          const id = `tx-${randomUUID()}`;
          await db.run(`INSERT INTO transactions
            (id, student_id, tool_id, compartment_id, borrowed_at, due_at, returned_at, return_compartment_id)
            VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
          [id, student.id, toolId, compartmentId, borrowedAt, dueAt]);
          const row = await db.get(`${transactionSelect} WHERE tx.id = ?`, [id]);
          await db.exec('COMMIT');
          return { transaction: mapTransaction(row) };
        } catch (error) {
          await db.exec('ROLLBACK');
          throw error;
        }
      });
    },

    async returnTool({ transactionId, compartmentId, studentId, isAdmin, returnedAt }) {
      return serializeWrite(async () => {
        await db.exec('BEGIN IMMEDIATE');
        try {
          const row = await db.get(`${transactionSelect} WHERE tx.id = ? AND tx.returned_at IS NULL`, [transactionId]);
          if (!row) {
            await db.exec('ROLLBACK');
            return { reason: 'NOT_FOUND' };
          }
          if (!isAdmin && row.student_id !== studentId) {
            await db.exec('ROLLBACK');
            return { reason: 'FORBIDDEN' };
          }

          const wasOverdue = returnedAt > row.due_at;
          await db.run('UPDATE transactions SET returned_at = ?, return_compartment_id = ? WHERE id = ?', [returnedAt, compartmentId, transactionId]);
          await db.run('UPDATE tools SET available_qty = available_qty + 1 WHERE id = ?', [row.tool_id]);

          let alert;
          if (wasOverdue) {
            alert = {
              id: `alert-${randomUUID()}`,
              message: `Return overdue: ${row.student_id} ${row.tool_name}`,
              createdAt: new Date().toISOString(),
            };
            await db.run('INSERT INTO alerts (id, message, created_at) VALUES (?, ?, ?)', [alert.id, alert.message, alert.createdAt]);
          }
          const updated = await db.get(`${transactionSelect} WHERE tx.id = ?`, [transactionId]);
          await db.exec('COMMIT');
          return { transaction: mapTransaction(updated), alert };
        } catch (error) {
          await db.exec('ROLLBACK');
          throw error;
        }
      });
    },

    async listActiveTransactionsForStudent(studentId) {
      const rows = await db.all(`${transactionSelect} WHERE tx.student_id = ? AND tx.returned_at IS NULL ORDER BY tx.borrowed_at DESC`, [studentId]);
      return rows.map(mapTransaction);
    },

    async getAdminSummary(now) {
      const rows = await db.all(`${transactionSelect} WHERE tx.returned_at IS NULL ORDER BY tx.borrowed_at DESC`);
      const transactions = rows.map(mapTransaction);
      const overdueTransactions = transactions.filter((transaction) => now > transaction.dueAt);
      const summaryTransaction = (transaction) => ({
        id: transaction.id,
        studentId: transaction.studentId,
        toolName: transaction.toolName,
        dueAt: transaction.dueAt,
        compartmentId: transaction.compartmentId,
      });
      return {
        activeCount: transactions.length,
        overdueCount: overdueTransactions.length,
        activeTransactions: transactions.map(summaryTransaction),
        overdueTransactions: overdueTransactions.map(summaryTransaction),
      };
    },

    async listAlerts() {
      return (await db.all('SELECT id, message, created_at FROM alerts ORDER BY created_at DESC')).map(mapAlert);
    },
  };
}

module.exports = { createInventoryRepository };
