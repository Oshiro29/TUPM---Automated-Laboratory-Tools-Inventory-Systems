const apiBase = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const { method = 'GET', body, token } = options;
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.debug('API request', { path, method, token: token ? 'REDACTED' : null, body });
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try {
    data = await response.json();
  } catch (err) {
    // non-json response
    data = {};
  }
  console.debug('API response', { path, status: response.status, ok: response.ok, data });
  if (!response.ok) {
    throw new Error(data.message || `API error ${response.status}`);
  }

  return data;
}

async function download(path, options = {}) {
  const { token } = options;
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}${path}`, { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `API error ${response.status}`);
  }

  return response.blob();
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
  validateQr(qrData) {
    return request('/validate-qr', { method: 'POST', body: { qrData } });
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
  getAdminStudents(token, params = {}) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return request(`/admin/students${query ? `?${query}` : ''}`, { token });
  },
  createAdminStudent(student, token) {
    return request('/admin/students', { method: 'POST', body: student, token });
  },
  updateAdminStudent(studentId, student, token) {
    return request(`/admin/students/${encodeURIComponent(studentId)}`, { method: 'PUT', body: student, token });
  },
  deleteAdminStudent(studentId, token) {
    return request(`/admin/students/${encodeURIComponent(studentId)}`, { method: 'DELETE', token });
  },
  getAdminStudentHistory(studentId, token) {
    return request(`/admin/students/${encodeURIComponent(studentId)}/history`, { token });
  },
  getAuditTransactions(token, params = {}) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return request(`/admin/audit${query ? `?${query}` : ''}`, { token });
  },
  exportAuditReport(token, params = {}) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return download(`/admin/export${query ? `?${query}` : ''}`, { token });
  },
  getAlerts(token) {
    return request('/alerts', { token });
  },
  assignCompartmentTool(token, compartmentId, toolId) {
    return request(`/admin/compartments/${encodeURIComponent(compartmentId)}/assign`, { method: 'PUT', body: { toolId }, token });
  },
  openCompartment(compartmentId, token) {
    return request('/open', { method: 'POST', body: { compartmentId }, token });
  },
  returnTransaction(transactionId, compartmentId, token) {
    return request('/return', { method: 'POST', body: { transactionId, compartmentId }, token });
  },
};
