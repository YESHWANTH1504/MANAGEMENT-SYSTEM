import axios from 'axios';

// Dynamically resolve the backend URL based on the browser's current host.
// This allows the app to work from any device (localhost, LAN IP, domain, etc.)
let API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api/v1`;
if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.endsWith('/api/v1')) {
  API_URL = `${import.meta.env.VITE_API_URL}/api/v1`;
}
const api = axios.create({
  baseURL: API_URL,
});

// Request Interceptor: Inject JWT token + ngrok bypass header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Required to bypass ngrok's free-tier browser warning interstitial
    config.headers['ngrok-skip-browser-warning'] = 'true';
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto refresh token or logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and request wasn't already retried
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login') {
      originalRequest._retry = true;
      try {
        // Request token renewal
        const res = await axios.post(`${API_URL}/auth/refresh`, {});
        if (res.data.access_token) {
          localStorage.setItem('access_token', res.data.access_token);
          originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Session completely expired, log out
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        window.dispatchEvent(new Event('auth_session_expired'));
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
