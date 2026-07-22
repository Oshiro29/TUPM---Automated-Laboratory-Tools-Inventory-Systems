const { randomUUID } = require('crypto');

function mapStudent(row) {
  return row && { id: row.id, name: row.name, pin: row.pin, email: row.email };
}

function mapTool(row) {
  const compartments = row?.compartment_ids ? row.compartment_ids.split(',').filter(Boolean) : (row?.slot ? [row.slot] : []);
  return row && {
    id: row.id,
    name: row.name,
    description: row.description,
    slot: row.primary_compartment_id || row.slot || compartments[0] || '',
    totalQty: row.total_qty,
    availableQty: row.available_qty,
    compartments,
  };
}

function mapTransaction(row, now = Date.now()) {
  const isReturned = Boolean(row && row.returned_at);
  const isOverdue = Boolean(row && !isReturned && now > row.due_at);
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
    status: isReturned ? 'returned' : (isOverdue ? 'overdue' : 'active'),
    isOverdue,
  };
}

function mapAlert(row) {
  return row && {
    id: row.id,
    message: row.message,
    createdAt: row.created_at,
    transactionId: row.transaction_id,
    type: row.alert_type,
    resolvedAt: row.resolved_at,
    ...(row.student_id ? { studentId: row.student_id } : {}),
    ...(row.tool_name ? { toolName: row.tool_name } : {}),
    ...(row.due_at ? { dueAt: row.due_at } : {}),
  };
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

  function normalizeSearch(search) {
    return `%${String(search || '').trim().replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
  }

  async function syncOverdueAlerts(now) {
    return serializeWrite(async () => {
      const overdueRows = await db.all(`${transactionSelect}
        WHERE tx.returned_at IS NULL AND tx.due_at < ?`, [now]);

      for (const row of overdueRows) {
        const id = `alert-${randomUUID()}`;
        const createdAt = new Date(now).toISOString();
        const message = `Overdue tool: ${row.tool_name} borrowed by ${row.student_id}`;
        await db.run(`INSERT OR IGNORE INTO alerts
          (id, message, created_at, transaction_id, alert_type, resolved_at)
          VALUES (?, ?, ?, ?, 'OVERDUE', NULL)`,
        [id, message, createdAt, row.id]);
      }
    });
  }

  return {
    async findStudentById(studentId) {
      return mapStudent(await db.get('SELECT id, name, pin, email FROM students WHERE id = ?', [studentId]));
    },

    async listStudents({ search = '', status = 'all' } = {}, now = Date.now()) {
      await syncOverdueAlerts(now);
      const rows = await db.all(
        `SELECT s.id, s.name, s.pin, s.email,
          COALESCE(active_counts.active_count, 0) AS active_count,
          COALESCE(overdue_counts.overdue_count, 0) AS overdue_count,
          last_borrow.last_borrowed_at AS last_borrowed_at
        FROM students s
        LEFT JOIN (
          SELECT student_id, COUNT(*) AS active_count
          FROM transactions
          WHERE returned_at IS NULL
          GROUP BY student_id
        ) AS active_counts ON active_counts.student_id = s.id
        LEFT JOIN (
          SELECT student_id, COUNT(*) AS overdue_count
          FROM transactions
          WHERE returned_at IS NULL AND due_at < ?
          GROUP BY student_id
        ) AS overdue_counts ON overdue_counts.student_id = s.id
        LEFT JOIN (
          SELECT student_id, MAX(borrowed_at) AS last_borrowed_at
          FROM transactions
          GROUP BY student_id
        ) AS last_borrow ON last_borrow.student_id = s.id
        WHERE s.id LIKE ? ESCAPE '\\' OR s.name LIKE ? ESCAPE '\\' OR s.email LIKE ? ESCAPE '\\'
        ORDER BY s.name COLLATE NOCASE ASC`,
        [now, normalizeSearch(search), normalizeSearch(search), normalizeSearch(search)],
      );

      return rows
        .map((student) => ({
          ...mapStudent(student),
          activeBorrowCount: student.active_count,
          overdueBorrowCount: student.overdue_count,
          lastBorrowedAt: student.last_borrowed_at,
        }))
        .filter((student) => {
          if (status === 'active') return student.activeBorrowCount > 0;
          if (status === 'overdue') return student.overdueBorrowCount > 0;
          if (status === 'inactive') return student.activeBorrowCount === 0;
          return true;
        });
    },

    async createStudent({ id, name, pin, email }) {
      return serializeWrite(async () => {
        await db.run('INSERT INTO students (id, name, pin, email) VALUES (?, ?, ?, ?)', [id, name, pin, email]);
        return mapStudent(await db.get('SELECT id, name, pin, email FROM students WHERE id = ?', [id]));
      });
    },

    async updateStudent(studentId, { name, pin, email }) {
      return serializeWrite(async () => {
        await db.run('UPDATE students SET name = ?, pin = ?, email = ? WHERE id = ?', [name, pin, email, studentId]);
        return mapStudent(await db.get('SELECT id, name, pin, email FROM students WHERE id = ?', [studentId]));
      });
    },

    async deleteStudent(studentId) {
      return serializeWrite(async () => {
        const result = await db.run('DELETE FROM students WHERE id = ?', [studentId]);
        return result.changes > 0 ? { deleted: true } : null;
      });
    },

    async getStudentHistory(studentId, now = Date.now()) {
      await syncOverdueAlerts(now);
      const rows = await db.all(`${transactionSelect} WHERE tx.student_id = ? ORDER BY tx.borrowed_at DESC`, [studentId]);
      return rows.map((row) => mapTransaction(row, now));
    },

    async listAuditTransactions({ search = '', status = 'all' } = {}, now = Date.now()) {
      await syncOverdueAlerts(now);
      const rows = await db.all(
        `${transactionSelect}
         WHERE tx.id LIKE ? ESCAPE '\\'
            OR tx.student_id LIKE ? ESCAPE '\\'
            OR students.name LIKE ? ESCAPE '\\'
            OR tools.name LIKE ? ESCAPE '\\'
         ORDER BY tx.borrowed_at DESC`,
        [normalizeSearch(search), normalizeSearch(search), normalizeSearch(search), normalizeSearch(search)],
      );

      return rows
        .map((row) => mapTransaction(row, now))
        .filter((transaction) => {
          if (status === 'active') return transaction.status === 'active';
          if (status === 'returned') return transaction.status === 'returned';
          if (status === 'overdue') return transaction.status === 'overdue';
          return true;
        });
    },

    async listTools() {
      const rows = await db.all(`
        SELECT t.id, t.name, t.description, t.slot,
               COUNT(tca.compartment_id) AS total_qty,
               COUNT(tca.compartment_id) - COALESCE(active_counts.active_count, 0) AS available_qty,
               GROUP_CONCAT(tca.compartment_id, ',') AS compartment_ids,
               MIN(tca.compartment_id) AS primary_compartment_id
        FROM tools t
        LEFT JOIN tool_compartment_assignments tca ON tca.tool_id = t.id
        LEFT JOIN (
          SELECT tool_id, COUNT(*) AS active_count
          FROM transactions
          WHERE returned_at IS NULL
          GROUP BY tool_id
        ) AS active_counts ON active_counts.tool_id = t.id
        GROUP BY t.id, t.name, t.description, t.slot
        ORDER BY t.id
      `);
      return rows.map(mapTool);
    },

    async assignCompartmentTool({ compartmentId, toolId }) {
      return serializeWrite(async () => {
        await db.exec('BEGIN IMMEDIATE');
        try {
          const tool = await db.get('SELECT id FROM tools WHERE id = ?', [toolId]);
          if (!tool) {
            await db.exec('ROLLBACK');
            return { reason: 'TOOL_NOT_FOUND' };
          }

          await db.run('DELETE FROM tool_compartment_assignments WHERE compartment_id = ?', [compartmentId]);
          await db.run('INSERT INTO tool_compartment_assignments (compartment_id, tool_id) VALUES (?, ?)', [compartmentId, toolId]);
          await db.exec('COMMIT');
          return { compartmentId, toolId };
        } catch (error) {
          await db.exec('ROLLBACK');
          throw error;
        }
      });
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
          const assignedCompartments = (await db.all('SELECT compartment_id FROM tool_compartment_assignments WHERE tool_id = ? ORDER BY compartment_id', [toolId])).map((row) => row.compartment_id);
          const requestedCompartmentId = compartmentId && assignedCompartments.includes(compartmentId) ? compartmentId : null;
          const occupiedRows = assignedCompartments.length
            ? await db.all(`SELECT compartment_id FROM transactions WHERE returned_at IS NULL AND compartment_id IN (${assignedCompartments.map(() => '?').join(',')})`, assignedCompartments)
            : [];
          const occupiedCompartmentIds = new Set(occupiedRows.map((row) => row.compartment_id));
          const assignedCompartmentId = requestedCompartmentId && !occupiedCompartmentIds.has(requestedCompartmentId)
            ? requestedCompartmentId
            : (assignedCompartments.find((id) => !occupiedCompartmentIds.has(id)) || assignedCompartments[0]);
          const id = `tx-${randomUUID()}`;
          await db.run(`INSERT INTO transactions
            (id, student_id, tool_id, compartment_id, borrowed_at, due_at, returned_at, return_compartment_id)
            VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
          [id, student.id, toolId, assignedCompartmentId, borrowedAt, dueAt]);
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
          const returnCompartmentId = compartmentId || row.compartment_id;
          await db.run('UPDATE transactions SET returned_at = ?, return_compartment_id = ? WHERE id = ?', [returnedAt, returnCompartmentId, transactionId]);
          await db.run('UPDATE tools SET available_qty = available_qty + 1 WHERE id = ?', [row.tool_id]);
          await db.run(`UPDATE alerts SET resolved_at = ?
            WHERE transaction_id = ? AND alert_type = 'OVERDUE' AND resolved_at IS NULL`,
          [new Date(returnedAt).toISOString(), transactionId]);

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
      await syncOverdueAlerts(now);
      const rows = await db.all(`${transactionSelect} WHERE tx.returned_at IS NULL ORDER BY tx.borrowed_at DESC`);
      const transactions = rows.map((row) => mapTransaction(row, now));
      const overdueTransactions = transactions.filter((transaction) => now > transaction.dueAt);
      const summaryTransaction = (transaction) => ({
        id: transaction.id,
        studentId: transaction.studentId,
        toolName: transaction.toolName,
        borrowedAt: transaction.borrowedAt,
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

    async listAlerts(now = Date.now()) {
      await syncOverdueAlerts(now);
      const rows = await db.all(`SELECT alerts.*, tx.student_id, tx.due_at, tools.name AS tool_name
        FROM alerts
        JOIN transactions tx ON tx.id = alerts.transaction_id
        JOIN tools ON tools.id = tx.tool_id
        WHERE alerts.alert_type = 'OVERDUE' AND alerts.resolved_at IS NULL AND tx.returned_at IS NULL
        ORDER BY alerts.created_at DESC`);
      return rows.map(mapAlert);
    },
  };
}

module.exports = { createInventoryRepository };
