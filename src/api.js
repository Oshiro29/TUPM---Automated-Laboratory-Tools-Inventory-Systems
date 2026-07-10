const apiBase = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const { method = 'GET', body, token } = options;
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `API error ${response.status}`);
  }

  return data;
}

export const api = {
  login(studentId, pin) {
    return request('/auth/login', { method: 'POST', body: { studentId, pin } });
  },
  loginAdmin(accessCode) {
    return request('/admin/login', { method: 'POST', body: { accessCode } });
  },
  scan(qrData) {
    return request('/scan', { method: 'POST', body: { qrData } });
  },
  getCurrentStudent(token) {
    return request('/student/me', { token });
  },
  getTools(token) {
    return request('/tools', { token });
  },
  borrow(toolId, compartmentId, token) {
    return request('/borrow', { method: 'POST', body: { toolId, compartmentId }, token });
  },
  getActiveTransactions(token) {
    return request('/transactions/active', { token });
  },
  getAdminSummary(token) {
    return request('/admin/summary', { token });
  },
  openCompartment(compartmentId, token) {
    return request('/open', { method: 'POST', body: { compartmentId }, token });
  },
  returnTransaction(transactionId, compartmentId, token) {
    return request('/return', { method: 'POST', body: { transactionId, compartmentId }, token });
  },
};
