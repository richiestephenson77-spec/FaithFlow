import axios from 'axios';

console.log('API baseURL:', process.env.REACT_APP_API_URL || 'FALLBACK-USED');

// Absolute fallback (not the relative '/api') so the native Capacitor app —
// which has no web host to resolve a relative path against — always has a real
// backend to reach. Vercel builds still use REACT_APP_API_URL when it's set.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://faithflow-production.up.railway.app/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
