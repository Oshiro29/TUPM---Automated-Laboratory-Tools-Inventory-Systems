const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeDatabase } = require('./db/database');
const { seedDatabase } = require('./db/seed');
const { createInventoryRepository } = require('./repositories/inventoryRepository');

const adminToken = process.env.ADMIN_ACCESS_TOKEN || 'ADMIN-TUPM-ACCESS';
const borrowDurationMs = 3 * 60 * 60 * 1000;
const sessionTokens = new Map();

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => toCsvValue(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function buildStudentPayload(student) {
  return { id: student.id, name: student.name, email: student.email };
}

function createSessionToken(studentId) {
  const token = `token-${studentId}-${Date.now()}`;
  sessionTokens.set(token, studentId);
  return token;
}

async function createApp() {
  const db = await initializeDatabase();
  await seedDatabase();
  const repository = createInventoryRepository(db);
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  async function authMiddleware(req, res, next) {
    try {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization required.' });
      }
      const token = auth.slice('Bearer '.length).trim();
      if (!token) return res.status(401).json({ message: 'Authorization required.' });
      if (token === adminToken) {
        req.admin = true;
        return next();
      }
      const studentId = sessionTokens.get(token);
      if (!studentId) return res.status(401).json({ message: 'Invalid or expired token.' });
      const student = await repository.findStudentById(studentId);
      if (!student) return res.status(401).json({ message: 'Student not found.' });
      req.student = student;
      req.token = token;
      return next();
    } catch (error) {
      return next(error);
    }
  }

  app.get('/', (req, res) => res.send('Backend is running!'));

  app.post('/api/auth/login', async (req, res) => {
    const { studentId, pin } = req.body;
    if (!studentId || !pin) return res.status(400).json({ message: 'Student ID and PIN are required.' });
    const student = await repository.findStudentById(studentId);
    if (!student || student.pin !== pin) return res.status(401).json({ message: 'Invalid credentials.' });
    return res.json({ token: createSessionToken(student.id), student: buildStudentPayload(student) });
  });

  app.post('/api/admin/login', (req, res) => {
    const { accessCode } = req.body;
    if (!accessCode || accessCode !== adminToken) return res.status(401).json({ message: 'Invalid admin access code.' });
    return res.json({ token: adminToken });
  });

  app.post('/api/scan', async (req, res) => {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ message: 'QR data is required.' });
    const student = await repository.findStudentById(qrData.trim());
    if (!student) return res.status(404).json({ message: 'Student not found by QR code.' });
    return res.json({ token: createSessionToken(student.id), student: buildStudentPayload(student) });
  });

  app.post('/api/validate-qr', async (req, res) => {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ message: 'QR data is required.' });
    const student = await repository.findStudentById(qrData.trim());
    if (!student) return res.status(404).json({ message: 'Student not found by QR code.' });
    return res.json({ student: buildStudentPayload(student) });
  });

  app.get('/api/student/me', authMiddleware, (req, res) => res.json({ student: buildStudentPayload(req.student) }));
  app.get('/api/tools', authMiddleware, async (req, res) => res.json({ tools: await repository.listTools() }));

  app.post('/api/borrow', authMiddleware, async (req, res) => {
    const { toolId, compartmentId } = req.body;
    if (!toolId || !compartmentId) return res.status(400).json({ message: 'Tool ID and compartment ID are required.' });
    const result = await repository.borrowTool({ student: req.student, toolId, compartmentId, dueAt: Date.now() + borrowDurationMs });
    if (result.reason === 'TOOL_NOT_FOUND') return res.status(404).json({ message: 'Tool not found.' });
    if (result.reason === 'TOOL_UNAVAILABLE') return res.status(400).json({ message: 'Tool is not available.' });
    if (result.reason === 'ACTIVE_TRANSACTION') return res.status(400).json({ message: 'Please return the current tool before borrowing another.' });
    return res.json({ transaction: result.transaction });
  });

  app.post('/api/open', authMiddleware, (req, res) => {
    const { compartmentId } = req.body;
    if (!compartmentId) return res.status(400).json({ message: 'Compartment ID is required.' });
    const openCommand = { compartmentId, action: 'open', timestamp: new Date().toISOString() };
    console.log('Hardware open request:', openCommand);
    return res.json({ message: 'Compartment open command sent.', openCommand });
  });

  app.post('/api/return', authMiddleware, async (req, res) => {
    const { transactionId, compartmentId } = req.body;
    if (!transactionId || !compartmentId) return res.status(400).json({ message: 'Transaction ID and compartment ID are required.' });
    const result = await repository.returnTool({ transactionId, compartmentId, studentId: req.student && req.student.id, isAdmin: Boolean(req.admin), returnedAt: Date.now() });
    if (result.reason === 'NOT_FOUND') return res.status(404).json({ message: 'Active transaction not found.' });
    if (result.reason === 'FORBIDDEN') return res.status(403).json({ message: 'You can only return your own active transaction.' });
    if (result.alert) console.log('ALERT:', result.alert.message);
    return res.json({ transaction: result.transaction });
  });

  app.get('/api/transactions/active', authMiddleware, async (req, res) => {
    return res.json({ transactions: await repository.listActiveTransactionsForStudent(req.student.id) });
  });

  app.get('/api/admin/summary', authMiddleware, async (req, res) => {
    if (!req.admin) return res.status(403).json({ message: 'Admin access required.' });
    return res.json(await repository.getAdminSummary(Date.now()));
  });

  app.get('/api/admin/students', authMiddleware, async (req, res) => {
    if (!req.admin) return res.status(403).json({ message: 'Admin access required.' });
    const { search = '', status = 'all' } = req.query;
    return res.json({ students: await repository.listStudents({ search, status }, Date.now()) });
  });

  app.post('/api/admin/students', authMiddleware, async (req, res, next) => {
    if (!req.admin) return res.status(403).json({ message: 'Admin access required.' });
    try {
      const { id, name, pin, email } = req.body;
      if (!id || !name || !pin || !email) {
        return res.status(400).json({ message: 'Student ID, name, PIN, and email are required.' });
      }
      const student = await repository.createStudent({ id: id.trim(), name: name.trim(), pin: pin.trim(), email: email.trim() });
      return res.status(201).json({ student });
    } catch (error) {
      if (error && error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ message: 'Student ID or email already exists.' });
      }
      return next(error);
    }
  });

  app.put('/api/admin/students/:studentId', authMiddleware, async (req, res, next) => {
    if (!req.admin) return res.status(403).json({ message: 'Admin access required.' });
    try {
      const { studentId } = req.params;
      const { name, pin, email } = req.body;
      if (!name || !pin || !email) {
        return res.status(400).json({ message: 'Name, PIN, and email are required.' });
      }
      const student = await repository.updateStudent(studentId.trim(), { name: name.trim(), pin: pin.trim(), email: email.trim() });
      if (!student) {
        return res.status(404).json({ message: 'Student not found.' });
      }
      return res.json({ student });
    } catch (error) {
      if (error && error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ message: 'Email already exists.' });
      }
      return next(error);
    }
  });

  app.get('/api/admin/students/:studentId/history', authMiddleware, async (req, res) => {
    if (!req.admin) return res.status(403).json({ message: 'Admin access required.' });
    const { studentId } = req.params;
    return res.json({ transactions: await repository.getStudentHistory(studentId.trim(), Date.now()) });
  });

  app.get('/api/admin/audit', authMiddleware, async (req, res) => {
    if (!req.admin) return res.status(403).json({ message: 'Admin access required.' });
    const { search = '', status = 'all' } = req.query;
    return res.json({ transactions: await repository.listAuditTransactions({ search, status }, Date.now()) });
  });

  app.get('/api/admin/export', authMiddleware, async (req, res) => {
    if (!req.admin) return res.status(403).json({ message: 'Admin access required.' });
    const { search = '', status = 'all' } = req.query;
    const transactions = await repository.listAuditTransactions({ search, status }, Date.now());
    const rows = transactions.map((transaction) => ({
      id: transaction.id,
      studentId: transaction.studentId,
      studentName: transaction.studentName,
      toolName: transaction.toolName,
      compartmentId: transaction.compartmentId,
      borrowedAt: new Date(transaction.borrowedAt).toISOString(),
      dueAt: new Date(transaction.dueAt).toISOString(),
      returnedAt: transaction.returnedAt ? new Date(transaction.returnedAt).toISOString() : '',
      returnCompartmentId: transaction.returnCompartmentId || '',
      status: transaction.status,
      isOverdue: transaction.isOverdue ? 'YES' : 'NO',
    }));
    const csv = toCsv([
      'id',
      'studentId',
      'studentName',
      'toolName',
      'compartmentId',
      'borrowedAt',
      'dueAt',
      'returnedAt',
      'returnCompartmentId',
      'status',
      'isOverdue',
    ], rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-summary-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  });

  app.get('/api/alerts', authMiddleware, async (req, res) => {
    if (!req.admin) return res.status(403).json({ message: 'Admin access required.' });
    return res.json({ alerts: await repository.listAlerts(Date.now()) });
  });

  app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('Request failed:', error);
    res.status(500).json({ message: 'Internal server error.' });
  });
  return app;
}

async function start() {
  const app = await createApp();
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => console.log(`Backend running on port ${port}`));
}

if (require.main === module) {
  start().catch((error) => { console.error('Backend startup failed:', error); process.exitCode = 1; });
}

module.exports = { createApp, start };
