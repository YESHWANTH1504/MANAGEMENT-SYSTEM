import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Eye, EyeOff, ShieldAlert, Sun, Moon } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('admin@imms.com');
  const [password, setPassword] = useState('AdminPassword123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Forgot Password States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLink, setForgotLink] = useState('');

  const { login, theme, toggleTheme } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setForgotSuccess('');
    setForgotLink('');
    
    if (!forgotEmail) {
      setError('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess(response.data.detail || 'Reset link sent successfully.');
      if (response.data.reset_link) {
        setForgotLink(response.data.reset_link);
      }
      showToast('Reset link generated successfully.', 'success');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request password reset.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('session_expired_toast') === 'true') {
      showToast('Your login session has expired. Please sign in again.', 'error');
      sessionStorage.removeItem('session_expired_toast');
    }
  }, [showToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      if (result.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/intern-dashboard');
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4 py-8 relative">
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={toggleTheme}
          className="p-2.5 bg-white/75 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-full shadow-md transition-all hover:scale-105 active:scale-95"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-md glass-card p-8 sm:p-10 relative z-10">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <img 
            src="/logo.png" 
            alt="Tekquora Logo" 
            className="w-20 h-20 mx-auto rounded-full object-contain bg-white shadow-lg mb-4" 
          />
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {isForgotPassword ? 'Reset Password' : 'Sign in to your account'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Tekquora Management System
          </p>
        </div>

        {/* Display Error */}
        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 flex items-start text-red-700 text-sm">
            <ShieldAlert size={18} className="shrink-0 mr-2 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                id="forgot-email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-slate-800 dark:text-white sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-full shadow-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all uppercase tracking-wider"
            >
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </button>

            {forgotSuccess && (
              <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                <p>{forgotSuccess}</p>
                {forgotLink && (
                  <a href={forgotLink} className="mt-2 block font-medium underline text-emerald-700">
                    Simulated Reset Link
                  </a>
                )}
              </div>
            )}

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                }}
                className="text-sm font-medium text-brand-600 hover:text-brand-500"
              >
                Back to Sign in
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-slate-800 dark:text-white sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-slate-800 dark:text-white sm:text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900 dark:text-slate-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="font-medium text-brand-600 hover:text-brand-500"
                >
                  Forgot your password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-full shadow-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all uppercase tracking-wider"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:text-brand-500">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
