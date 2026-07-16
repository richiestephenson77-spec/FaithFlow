import axios from 'axios';

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
    // No response = network failure (offline, DNS, timeout). Swap axios's raw
    // "Network Error" for a friendly message so callers that surface err.message
    // don't show internals. A `isOffline` flag lets callers special-case it.
    if (!err.response) {
      err.isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      err.friendlyMessage = err.isOffline
        ? "You're offline — check your connection and try again."
        : "Couldn't reach the server. Please try again.";
      err.message = err.friendlyMessage;
    }
    return Promise.reject(err);
  }
);

export default api;
