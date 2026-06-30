// frontend/src/api/axiosConfig.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',  // ← VACÍO, porque los endpoints ya incluyen /api/
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para agregar credenciales a todas las peticiones
api.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
});

export default api;