import axios from 'axios';

// Update base URL to point to correct auth endpoint parent
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false // Do not send cookies, use only API key
});

// Request interceptor to add API Key
api.interceptors.request.use(
  (config) => {
    // Check if we are in mock mode
    if (localStorage.getItem('auth_mode') === 'mock') {
        return config;
    }
    
    // Attach the API Key
    const apiKey = import.meta.env.VITE_API_ACCESS_KEY;
    if (apiKey) {
      config.headers['x-api-key'] = apiKey;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // Check if we should fallback to mock mode? 
      // For now, just clear storage and let AuthContext handle redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
