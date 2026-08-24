import axios from 'axios';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor: Attach JWT Bearer token if present in localStorage.
 * NOTE: Token stored in localStorage is a development-stage trade-off to survive page refreshes.
 * For production security against XSS, migrate to httpOnly cookies.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('notes_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const register = async (name, email, password) => {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export default api;
