import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { 
  Eye, EyeOff, ShieldAlert, Sun, Moon, 
  CheckCircle2
} from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const { theme, toggleTheme } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Extract reset token from URL
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Password reset token is missing. Please request a new link.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        new_password: password
      });
      setSuccess(res.data.detail || 'Password reset successfully.');
      showToast('Password has been reset successfully!', 'success');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link may have expired.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setSubmitting(false);
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
        
        {/* Form Card */}
        <div className={`flex flex-col relative ${shake ? 'animate-shake' : ''}`}>
          
          {/* Centered Brand Logo */}
          <img 
            src="/logo.png" 
            alt="Tekquora Logo" 
            className="w-20 h-20 mx-auto rounded-full object-contain bg-white shadow-lg mb-4" 
          />

          {/* Header Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Reset Password
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Tekquora Management System
            </p>
          </div>

          {/* Display Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 flex items-start text-red-700 text-sm">
              <ShieldAlert size={18} className="shrink-0 mr-2 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Display Success Alert */}
          {success && (
            <div className="mb-6 p-4 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
              <div className="flex items-start space-x-2">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-650" />
                <div>
                  <span className="font-bold">{success}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">
                    Redirecting you to the login page shortly...
                  </p>
                </div>
              </div>
            </div>
          )}

          {!token ? (
            <div className="text-center space-y-4">
              <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                No password reset token was detected in the URL. Please return to the login screen and request a reset email link.
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-brand-600 hover:text-brand-500"
              >
                Go to Login Page
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password Input Group */}
              <div>
                <label htmlFor="reset-password-field" className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1">
                  New Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    id="reset-password-field"
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

              {/* Confirm Password Input Group */}
              <div>
                <label htmlFor="confirm-password-field" className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1">
                  Confirm New Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    id="confirm-password-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-slate-800 dark:text-white sm:text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-500"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Reset Button */}
              <button
                type="submit"
                disabled={submitting || !!success}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-full shadow-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all uppercase tracking-wider mt-6"
              >
                {submitting ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span>Update Password</span>
                )}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-brand-600 hover:text-brand-500"
                >
                  Cancel and Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
