export class ApiError extends Error {
  constructor(message, status, details = null) { super(message); this.name = "ApiError"; this.status = status; this.details = details; }
}

export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-taskflow-client": "web", ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.details ? Object.values(payload.details)[0] : payload.error || "Request failed.", response.status, payload.details);
  return payload.data;
}

export const authApi = {
  register: (input) => api("/api/auth/register", { method: "POST", body: JSON.stringify(input) }),
  login: (input) => api("/api/auth/login", { method: "POST", body: JSON.stringify(input) }),
  me: () => api("/api/auth/me"),
  logout: () => api("/api/auth/logout", { method: "POST" }),
  forgotPassword: (email) => api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
};

export const tasksApi = {
  list: (filters = {}) => api(`/api/tasks?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value))}`),
  statistics: () => api("/api/tasks/statistics"),
  get: (id) => api(`/api/tasks/${encodeURIComponent(id)}`),
  create: (input) => api("/api/tasks", { method: "POST", body: JSON.stringify(input) }),
  update: (id, input) => api(`/api/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  move: (id, status) => api(`/api/tasks/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  delete: (id) => api(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" }),
  reset: () => api("/api/tasks/reset", { method: "POST" }),
};

export const teamsApi = {
  list: () => api("/api/teams"),
  get: (id) => api(`/api/teams/${encodeURIComponent(id)}`),
  create: (name) => api("/api/teams", { method: "POST", body: JSON.stringify({ name }) }),
  rename: (id, name) => api(`/api/teams/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  delete: (id) => api(`/api/teams/${encodeURIComponent(id)}`, { method: "DELETE" }),
  addMember: (id, email) => api(`/api/teams/${encodeURIComponent(id)}/members`, { method: "POST", body: JSON.stringify({ email }) }),
  removeMember: (id, userId) => api(`/api/teams/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" }),
};

export const metaApi = { get: () => api("/api/meta") };
