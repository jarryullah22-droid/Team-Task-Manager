import axios from 'axios';

// Same-origin by default so the HTTP-only session cookie is sent automatically.
// In dev, Vite proxies /auth, /teams and /tasks to the Express server.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const teamsApi = {
  list: () => api.get('/teams').then((r) => r.data),
  create: (payload) => api.post('/teams', payload).then((r) => r.data),
  addMember: (teamId, payload) =>
    api.post(`/teams/${teamId}/members`, payload).then((r) => r.data),
  removeMember: (teamId, userId) =>
    api.delete(`/teams/${teamId}/members/${userId}`).then((r) => r.data),
  remove: (teamId) => api.delete(`/teams/${teamId}`).then((r) => r.data),
};

export const tasksApi = {
  list: (params = {}) => api.get('/tasks', { params }).then((r) => r.data),
  create: (payload) => api.post('/tasks', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/tasks/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
};

// When a request comes back 401 the session is gone (expired, cookie not
// accepted, or the server restarted). Tell the app so it can send the user
// back to the login screen instead of leaving them on a dead dashboard.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error?.config?.url || '';
    const isAuthProbe =
      url.includes('/auth/me') || url.includes('/auth/login') || url.includes('/auth/register');

    if (error?.response?.status === 401 && !isAuthProbe) {
      window.dispatchEvent(new Event('ttm:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// Turns any axios/validation error into a single readable message.
export function getErrorMessage(err) {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.errors?.[0]?.message ||
    err?.message ||
    'Something went wrong'
  );
}

export default api;
