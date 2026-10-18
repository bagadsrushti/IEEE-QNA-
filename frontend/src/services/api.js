import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cluster_ai_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle auth expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized on protected route, clear token
      if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('cluster_ai_token');
        localStorage.removeItem('cluster_ai_admin');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export const questionAPI = {
  submit: (data) => api.post('/questions/submit', data),
  getAll: (params) => api.get('/questions', { params }),
};

export const clusterAPI = {
  getRanked: (params) => api.get('/clusters', { params }),
  getDetails: (id) => api.get(`/clusters/${id}`),
  updateTitle: (id, data) => api.patch(`/clusters/${id}/title`, data),
  merge: (data) => api.post('/clusters/merge', data),
  moveQuestion: (data) => api.post('/clusters/move-question', data),
  recluster: (threshold) => api.post('/clusters/recluster', { threshold }),
  getExportUrl: () => '/api/clusters/export/csv'
};

export const statsAPI = {
  getOverview: () => api.get('/stats/overview'),
  getQRCode: () => api.get('/stats/qr')
};

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me')
};

export default api;
