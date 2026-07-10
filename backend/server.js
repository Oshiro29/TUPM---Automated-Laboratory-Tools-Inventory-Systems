const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { students, tools, transactions, alerts } = require('./data');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const adminToken = 'ADMIN-TUPM-ACCESS';
const sessionTokens = new Map();
const borrowDurationMs = 3 * 60 * 60 * 1000;

function findStudent(studentId) {
  return students.find((student) => student.id === studentId);
}

function buildStudentPayload(student) {
  return { id: student.id, name: student.name, email: student.email };
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ message: 'Authorization required.' });
  }

  const token = auth.replace('Bearer ', '').trim();
  if (token === adminToken) {
    req.admin = true;
    return next();
  }

  const studentId = sessionTokens.get(token);
  if (!studentId) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  const student = findStudent(studentId);
  if (!student) {
    return res.status(401).json({ message: 'Student not found.' });
  }

  req.student = student;
  req.token = token;
  next();
}

function findTool(toolId) {
  return tools.find((tool) => tool.id === toolId);
}

function findActiveTransaction(studentId) {
  return transactions.find((tx) => tx.studentId === studentId && tx.returnedAt === null);
}

function checkOverdue(transaction) {
  if (!transaction || transaction.returnedAt) {
    return false;
  }
  return Date.now() > transaction.dueAt;
}

function createSessionToken(studentId) {
  const token = `token-${studentId}-${Date.now()}`;
  sessionTokens.set(token, studentId);
  return token;
}

function logTransaction(transaction) {
  transactions.push(transaction);
}

function buildSummary() {
  const activeTransactions = transactions.filter((tx) => tx.returnedAt === null);
  const overdueTransactions = activeTransactions.filter((tx) => checkOverdue(tx));

  return {
    activeCount: activeTransactions.length,
    overdueCount: overdueTransactions.length,
    activeTransactions: activeTransactions.map((tx) => ({
      id: tx.id,
      studentId: tx.studentId,
      toolName: tx.toolName,
      dueAt: tx.dueAt,
      compartmentId: tx.compartmentId,
    })),
    overdueTransactions: overdueTransactions.map((tx) => ({
      id: tx.id,
      studentId: tx.studentId,
      toolName: tx.toolName,
      dueAt: tx.dueAt,
      compartmentId: tx.compartmentId,
    })),
  };
}

function sendAlert(message) {
  const alert = { id: `alert-${Date.now()}`, message, createdAt: new Date().toISOString() };
  alerts.push(alert);
  console.log('ALERT:', message);
}

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.post('/api/auth/login', (req, res) => {
  const { studentId, pin } = req.body;
  if (!studentId || !pin) {
    return res.status(400).json({ message: 'Student ID and PIN are required.' });
  }

  const student = findStudent(studentId);
  if (!student || student.pin !== pin) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = createSessionToken(student.id);
  res.json({ token, student: buildStudentPayload(student) });
});

app.post('/api/scan', (req, res) => {
  const { qrData } = req.body;
  if (!qrData) {
    return res.status(400).json({ message: 'QR data is required.' });
  }

  const student = findStudent(qrData.trim());
  if (!student) {
    return res.status(404).json({ message: 'Student not found by QR code.' });
  }

  const token = createSessionToken(student.id);
  res.json({ token, student: buildStudentPayload(student) });
});

app.get('/api/student/me', authMiddleware, (req, res) => {
  res.json({ student: buildStudentPayload(req.student) });
});

app.get('/api/tools', authMiddleware, (req, res) => {
  res.json({ tools });
});

app.post('/api/borrow', authMiddleware, (req, res) => {
  const { toolId, compartmentId } = req.body;
  if (!toolId || !compartmentId) {
    return res.status(400).json({ message: 'Tool ID and compartment ID are required.' });
  }

  const tool = findTool(toolId);
  if (!tool) {
    return res.status(404).json({ message: 'Tool not found.' });
  }

  if (tool.availableQty <= 0) {
    return res.status(400).json({ message: 'Tool is not available.' });
  }

  const existing = findActiveTransaction(req.student.id);
  if (existing) {
    return res.status(400).json({ message: 'Please return the current tool before borrowing another.' });
  }

  tool.availableQty -= 1;
  const dueAt = Date.now() + borrowDurationMs;
  const transaction = {
    id: `tx-${Date.now()}`,
    studentId: req.student.id,
    studentName: req.student.name,
    toolId: tool.id,
    toolName: tool.name,
    compartmentId,
    borrowedAt: Date.now(),
    dueAt,
    returnedAt: null,
  };

  logTransaction(transaction);
  res.json({ transaction });
});

app.post('/api/open', authMiddleware, (req, res) => {
  const { compartmentId } = req.body;
  if (!compartmentId) {
    return res.status(400).json({ message: 'Compartment ID is required.' });
  }

  const openCommand = {
    compartmentId,
    action: 'open',
    timestamp: new Date().toISOString(),
  };

  console.log('Hardware open request:', openCommand);
  res.json({ message: 'Compartment open command sent.', openCommand });
});

app.post('/api/return', authMiddleware, (req, res) => {
  const { transactionId, compartmentId } = req.body;
  if (!transactionId || !compartmentId) {
    return res.status(400).json({ message: 'Transaction ID and compartment ID are required.' });
  }

  const transaction = transactions.find((tx) => tx.id === transactionId && tx.returnedAt === null);
  if (!transaction) {
    return res.status(404).json({ message: 'Active transaction not found.' });
  }

  transaction.returnedAt = Date.now();
  transaction.returnCompartmentId = compartmentId;

  const tool = findTool(transaction.toolId);
  if (tool) {
    tool.availableQty += 1;
  }

  if (checkOverdue(transaction)) {
    sendAlert(`Return overdue: ${transaction.studentId} ${transaction.toolName}`);
  }

  res.json({ transaction });
});

app.get('/api/transactions/active', authMiddleware, (req, res) => {
  const active = transactions.filter((tx) => tx.studentId === req.student.id && tx.returnedAt === null);
  res.json({ transactions: active });
});

app.get('/api/admin/summary', authMiddleware, (req, res) => {
  if (!req.admin) {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  res.json(buildSummary());
});

app.get('/api/alerts', authMiddleware, (req, res) => {
  if (!req.admin) {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  res.json({ alerts });
});

app.listen(5000, () => {
  console.log('Backend running on port 5000');
});
