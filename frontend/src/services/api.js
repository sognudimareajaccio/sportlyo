import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Events API
export const eventsApi = {
  getAll: (params) => api.get('/events', { params }),
  getFeatured: () => api.get('/events/featured'),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  getOrganizerEvents: () => api.get('/organizer/events')
};

// Registrations API
export const registrationsApi = {
  create: (data) => api.post('/registrations', data),
  getAll: () => api.get('/registrations'),
  getById: (id) => api.get(`/registrations/${id}`),
  getEventRegistrations: (eventId) => api.get(`/organizer/registrations/${eventId}`)
};

// Payments API
export const paymentsApi = {
  process: (data) => api.post('/payments/process', data)
};

// Chat API
export const chatApi = {
  sendMessage: (message, sessionId) => api.post('/chat', { message, session_id: sessionId })
};

// Recommendations API
export const recommendationsApi = {
  get: () => api.get('/recommendations')
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get('/categories')
};

// Auth API
export const authApi = {
  processSession: (sessionId) => api.post('/auth/session', { session_id: sessionId }),
  updateProfile: (data) => api.put('/auth/profile', data),
  upgradeRole: (data) => api.put('/auth/role', data)
};

// Admin API
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
  getPayments: (params) => api.get('/admin/payments', { params })
};

export default api;
