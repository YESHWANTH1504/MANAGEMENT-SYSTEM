import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { 
  Eye, EyeOff, Lock, Mail, ShieldAlert, Sun, Moon, 
  Activity, Cpu, Sparkles, ChevronRight, User 
} from 'lucide-react';
import { launchConfetti } from '../utils/confetti';
import HaloButton from '../components/HaloButton';

const Login = () => {
  const [email, setEmail] = useState('admin@imms.com');
  const [password, setPassword] = useState('AdminPassword123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  // Forgot Password States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLink, setForgotLink] = useState('');

  const { login, theme, toggleTheme } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

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

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setForgotSuccess('');
    setForgotLink('');
    
    if (!forgotEmail) {
      setError('Please enter your email address.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
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
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setSubmitting(false);
    }
  };

  const taglines = [
    "Empowering career growth through seamless tracking.",
    "Real-time collaboration for employees and interns.",
    "Your gateway to professional development.",
    "Unified workspace monitoring made simple."
  ];
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % taglines.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [taglines.length]);

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
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      launchConfetti();
      if (result.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/intern-dashboard');
      }
    } else {
      setError(result.error);
      setShake(true);
      setTimeout(() => setShake(false), 500);
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
          className="p-2.5 bg-white/75 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Main Single Card Container */}
      <div className="w-full max-w-md relative mt-12 pop-bounce z-10">
        
        {/* Glassmorphic Form Card */}
        <div className={`login-glass-card rounded-[32px] px-8 pt-10 pb-10 flex flex-col relative ${shake ? 'animate-shake' : ''}`}>
          
          {/* Centered Avatar Badge with vertical spacing */}
          <div className="mx-auto w-20 h-20 rounded-full bg-brand-600 border-4 border-white/90 shadow-xl flex items-center justify-center text-white animate-float mb-6 mt-4">
            <User size={36} strokeWidth={1.5} />
          </div>

          {/* Header Title */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-snug">
              {isForgotPassword ? 'Reset Password Request' : 'MCC MRF Innovation park Management system'}
            </h2>
            {isForgotPassword && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Enter your email address to receive a simulated reset link.
              </p>
            )}
          </div>

          {/* Display Error Alert */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/35 text-red-700 dark:text-white text-xs rounded-xl p-3 flex items-start space-x-2.5 mb-6 animate-fade-in">
              <ShieldAlert size={16} className="text-red-655 dark:text-red-300 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
              {/* Email Input Group */}
              <div className="floating-label-wrapper login-input-group flex items-center h-14 shadow-inner relative z-10">
                <div className="px-3.5 flex items-center justify-center text-slate-400">
                  <Mail size={18} />
                </div>
                <div className="h-6 border-r border-slate-200"></div>
                <input
                  type="email"
                  required
                  id="forgot-email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder=" "
                  className="floating-label-input flex-1 px-4 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-white font-medium focus:ring-0"
                />
                <label htmlFor="forgot-email" className="transition-all left-[3.5rem]">Registered Email Address</label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-sm font-bold text-white rounded-xl shadow-lg active:translate-y-[0.5px] transition-all btn-animate btn-sweep flex items-center justify-center uppercase tracking-wider"
              >
                {submitting ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              {forgotSuccess && (
                <div className="bg-emerald-500/20 border border-emerald-500/35 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl p-3 flex flex-col space-y-2 animate-fade-in">
                  <span>{forgotSuccess}</span>
                  {forgotLink && (
                    <a 
                      href={forgotLink}
                      className="mt-1 text-brand-600 dark:text-brand-300 font-extrabold hover:underline break-all block text-center bg-white/20 p-2 rounded-lg"
                    >
                      👉 Click here to simulate password reset
                    </a>
                  )}
                </div>
              )}

              {/* Back to Login link */}
              <div className="text-center px-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError('');
                    setForgotSuccess('');
                    setForgotLink('');
                  }}
                  className="text-xs text-slate-600 dark:text-slate-350 hover:underline hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username/Email Input Group */}
              <div className="floating-label-wrapper login-input-group flex items-center h-14 shadow-inner relative z-10">
                <div className="px-3.5 flex items-center justify-center text-slate-400">
                  <User size={18} />
                </div>
                <div className="h-6 border-r border-slate-200"></div>
                <input
                  type="email"
                  required
                  id="username-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className="floating-label-input flex-1 px-4 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-white font-medium focus:ring-0"
                />
                <label htmlFor="username-email" className="transition-all left-[3.5rem]">Username / Email Address</label>
              </div>

              {/* Password Input Group */}
              <div className="floating-label-wrapper login-input-group flex items-center h-14 shadow-inner relative z-10">
                <div className="px-3.5 flex items-center justify-center text-slate-400">
                  <Lock size={18} />
                </div>
                <div className="h-6 border-r border-slate-200"></div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="password-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="floating-label-input flex-1 px-4 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-white font-medium focus:ring-0"
                />
                <label htmlFor="password-field" className="transition-all left-[3.5rem]">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3 text-slate-400 hover:text-slate-650 transition-colors z-10"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

                {/* Login Button */}
                <HaloButton
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-sm font-bold text-white rounded-xl shadow-lg active:translate-y-[0.5px] transition-all btn-animate btn-sweep flex items-center justify-center uppercase tracking-wider"
                >
                  {submitting ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span>LOGIN</span>
                  )}
                </HaloButton>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between text-[11px] text-slate-650 dark:text-slate-350 font-medium px-1">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-white/10 text-cyan-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError('');
                    setForgotSuccess('');
                    setForgotLink('');
                  }}
                  className="hover:underline hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              
              {/* Corporate Notice */}
              <div className="text-center bg-slate-100/50 border border-slate-200/60 dark:bg-white/5 dark:border-white/10 rounded-xl p-2.5 text-[9px] font-semibold text-slate-500 dark:text-cyan-100 animate-pulse-slow">
                ✨ Click "LOGIN" to access the shared administrator terminal
              </div>
            </form>
          )}

          {/* Divider line */}
          <div className="mt-8 border-t border-slate-200 dark:border-white/10"></div>
        </div>

        {/* Register Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            Don't have an account ?{' '}
            <Link to="/register" className="text-slate-800 dark:text-white font-extrabold hover:underline uppercase tracking-wide">
              REGISTER HERE
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
