import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { 
  Eye, EyeOff, Lock, ShieldAlert, Sun, Moon, 
  User, CheckCircle2, Check, AlertTriangle
} from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const canvasRef = React.useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Set sizing
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Mouse coords
    let mouse = { x: null, y: null, radius: 120 };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    // Particles array
    const particles = [];
    const particleCount = 60;
    
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 25) + 10;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.speedY = Math.random() * 0.4 - 0.2;
      }
      
      draw() {
        ctx.fillStyle = theme === 'dark' ? 'rgba(167, 139, 250, 0.35)' : 'rgba(124, 58, 237, 0.2)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.x < 0 || this.x > canvas.width) this.speedX = -this.speedX;
        if (this.y < 0 || this.y > canvas.height) this.speedY = -this.speedY;
        
        if (mouse.x !== null && mouse.y !== null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.hypot(dx, dy);
          if (distance < mouse.radius) {
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            let maxDistance = mouse.radius;
            let force = (maxDistance - distance) / maxDistance;
            let directionX = forceDirectionX * force * this.density;
            let directionY = forceDirectionY * force * this.density;
            this.x -= directionX * 0.1;
            this.y -= directionY * 0.1;
          }
        }
      }
    }
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

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

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
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
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4 py-8 md:p-0 relative overflow-hidden select-none">
      {/* Colorful Mesh Gradient Background Blobs */}
      <div className="absolute top-[-10%] left-[-15%] w-[450px] h-[450px] rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-[120px] pointer-events-none animate-morph-1"></div>
      <div className="absolute bottom-[-10%] right-[-15%] w-[550px] h-[550px] rounded-full bg-fuchsia-500/8 dark:bg-fuchsia-500/10 blur-[140px] pointer-events-none animate-morph-2"></div>
      <div className="absolute top-[35%] left-[25%] w-[350px] h-[350px] rounded-full bg-indigo-500/8 dark:bg-indigo-500/10 blur-[100px] pointer-events-none animate-morph-1"></div>
      <div className="absolute bottom-[30%] left-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/5 dark:bg-violet-600/8 blur-[110px] pointer-events-none animate-morph-2"></div>

      {/* Canvas Interactive Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={toggleTheme}
          className="p-2.5 bg-white/70 dark:bg-slate-900/35 backdrop-blur-md border border-slate-200/50 dark:border-white/10 text-slate-800 dark:text-white rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Main Single Card Container */}
      <div className="w-full max-w-md relative mt-12 pop-bounce z-10">
        
        {/* Glassmorphic Form Card */}
        <div className={`login-glass-card rounded-[32px] px-8 pt-10 pb-10 flex flex-col relative ${shake ? 'animate-shake' : ''}`}>
          
          {/* Centered Avatar Badge */}
          <div className="mx-auto w-20 h-20 rounded-full bg-brand-600 border-4 border-white/90 shadow-xl flex items-center justify-center text-white animate-float mb-6 mt-4">
            <Lock size={36} strokeWidth={1.5} />
          </div>

          {/* Header Title */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-snug">
              Reset Your Password
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Please enter your new credentials below.
            </p>
          </div>

          {/* Display Error Alert */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/35 text-red-700 dark:text-white text-xs rounded-xl p-3 flex items-start space-x-2.5 mb-6 animate-fade-in">
              <ShieldAlert size={16} className="text-red-655 dark:text-red-300 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Display Success Alert */}
          {success && (
            <div className="bg-emerald-500/20 border border-emerald-500/35 text-emerald-800 dark:text-emerald-350 text-xs rounded-xl p-3 flex items-start space-x-2.5 mb-6 animate-fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{success}</span>
                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1">
                  Redirecting you to the login page shortly...
                </p>
              </div>
            </div>
          )}

          {!token ? (
            <div className="text-center space-y-4">
              <div className="bg-amber-500/20 border border-amber-500/35 text-amber-800 dark:text-amber-300 text-xs rounded-xl p-4">
                No password reset token was detected in the URL. Please return to the login screen and request a reset email link.
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
              >
                Go to Login Page
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Password Input Group */}
              <div className="floating-label-wrapper login-input-group flex items-center h-14 shadow-inner relative z-10">
                <div className="px-3.5 flex items-center justify-center text-slate-400">
                  <Lock size={18} />
                </div>
                <div className="h-6 border-r border-slate-200"></div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="reset-password-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="floating-label-input flex-1 px-4 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-white font-medium focus:ring-0"
                />
                <label htmlFor="reset-password-field" className="transition-all left-[3.5rem]">New Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3 text-slate-400 hover:text-slate-655 transition-colors z-10"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Confirm Password Input Group */}
              <div className="floating-label-wrapper login-input-group flex items-center h-14 shadow-inner relative z-10">
                <div className="px-3.5 flex items-center justify-center text-slate-400">
                  <Lock size={18} />
                </div>
                <div className="h-6 border-r border-slate-200"></div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="confirm-password-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder=" "
                  className="floating-label-input flex-1 px-4 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-white font-medium focus:ring-0"
                />
                <label htmlFor="confirm-password-field" className="transition-all left-[3.5rem]">Confirm New Password</label>
              </div>

              {/* Password Checklist */}
              {password && (
                <div className="bg-slate-50 dark:bg-slate-950/45 p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-1.5 text-left text-[10px] animate-fade-in z-10 relative">
                  <p className="font-bold text-slate-500 dark:text-slate-400 mb-1">Password Requirements:</p>
                  <div className={`flex items-center space-x-2 transition-all duration-300 ${password.length >= 8 ? 'text-emerald-500 scale-105 font-bold' : 'text-slate-500'}`}>
                    <Check size={12} className={password.length >= 8 ? 'text-emerald-500' : 'text-slate-400'} />
                    <span>Minimum 8 characters</span>
                  </div>
                  <div className={`flex items-center space-x-2 transition-all duration-300 ${/\d/.test(password) ? 'text-emerald-500 scale-105 font-bold' : 'text-slate-500'}`}>
                    <Check size={12} className={/\d/.test(password) ? 'text-emerald-500' : 'text-slate-400'} />
                    <span>Contains at least one number</span>
                  </div>
                  <div className={`flex items-center space-x-2 transition-all duration-300 ${( /[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password) ) ? 'text-emerald-500 scale-105 font-bold' : 'text-slate-500'}`}>
                    <Check size={12} className={( /[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password) ) ? 'text-emerald-500' : 'text-slate-400'} />
                    <span>Contains uppercase or special character</span>
                  </div>
                </div>
              )}

              {/* Submit Reset Button */}
              <button
                type="submit"
                disabled={submitting || !!success}
                className="w-full h-12 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-sm font-bold text-white rounded-xl shadow-lg active:translate-y-[0.5px] transition-all btn-animate btn-sweep flex items-center justify-center uppercase tracking-wider"
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-xs text-slate-650 dark:text-slate-350 hover:underline hover:text-slate-900 dark:hover:text-white font-medium"
                >
                  Cancel and Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Divider line */}
          <div className="mt-8 border-t border-slate-200 dark:border-white/10"></div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
