import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Fetch logged in profile details
  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      setUser(null);
      localStorage.removeItem('access_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }

    // Capture Session Expired Event from Axios interceptor
    const handleSessionExpired = () => {
      setUser(null);
      sessionStorage.setItem('session_expired_toast', 'true');
      window.location.href = '/login';
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    return () => window.removeEventListener('auth_session_expired', handleSessionExpired);
  }, []);

  // Sync Dark/Light class onto document element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      // Use standard JSON post login route
      const res = await api.post('/auth/login-json', { email, password });
      localStorage.setItem('access_token', res.data.access_token);
      localStorage.setItem('user_role', res.data.role);
      
      // Load full user details
      const profileRes = await api.get('/auth/me');
      setUser(profileRes.data);
      setLoading(false);
      return { success: true, role: res.data.role };
    } catch (err) {
      setLoading(false);
      
      // Check if it is a connection / network error (server is offline)
      if (!err.response) {
        return { 
          success: false, 
          error: 'Cannot connect to backend server. Please verify that FastAPI is running on http://localhost:8000 (python -m uvicorn app.main:app --reload).' 
        };
      }
      
      const detail = err.response?.data?.detail || 'Login failed. Please check credentials.';
      return { success: false, error: detail };
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_role');
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
