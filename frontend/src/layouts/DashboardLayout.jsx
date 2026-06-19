import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  LayoutDashboard, Users, Clock, ClipboardList, LogOut, 
  Menu, X, Sun, Moon, Bell, ChevronRight, ChevronLeft, UserCircle, RefreshCcw,
  Sparkles, Send, AlertTriangle, Command, Search
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { user, login, logout, theme, toggleTheme } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [notifications, setNotifications] = useState([]);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [profileImageError, setProfileImageError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setProfileImageError(false);
  }, [user]);

  const getProfilePhotoUrl = (photoName) => {
    if (!photoName) return '';
    if (photoName.startsWith('http://') || photoName.startsWith('https://')) return photoName;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const BASE_URL = API_URL.replace('/api/v1', '');
    return `${BASE_URL}/static/uploads/${photoName}`;
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      // Create custom endpoint or simply fetch recent activity / notification mock
      const res = await api.get('/reports/me'); // fallback or just empty list if none
      // Realistically we can query our notifications endpoint:
      // Let's implement a quick list fetch or mock details if API hasn't loaded them
      // We will call a generic notification route, but to ensure safety, let's catch failure gracefully
      try {
        const notifRes = await api.get('/attendance/statistics'); // dummy to check server
        // Let's populate mock notification list for testing in UI:
        setNotifications([
          { id: 1, title: 'Welcome to IMMS', message: 'Set up your profile details and technology details.', is_read: false, created_at: new Date().toISOString() },
          { id: 2, title: 'Attendance Cut-off', message: 'Check-in cut-off is strictly 10:00 AM.', is_read: false, created_at: new Date().toISOString() }
        ]);
      } catch (err) {
        setNotifications([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [user]);

  // AI assistant states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'model', text: `Hi! I am your AI Workspace Assistant. How can I help you today?` }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSandbox, setChatSandbox] = useState(false);
  const chatEndRef = React.useRef(null);

  const canvasRef = React.useRef(null);
  const [showHelperBubble, setShowHelperBubble] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHelperBubble(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const mouse = { x: null, y: null, radius: 140 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.35;
        this.speedY = (Math.random() - 0.5) * 0.35;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = Math.random() * 10 + 2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            const directionX = (dx / distance) * force * this.density;
            const directionY = (dy / distance) * force * this.density;
            this.x -= directionX * 0.4;
            this.y -= directionY * 0.4;
          }
        }
      }

      draw() {
        ctx.fillStyle = theme === 'dark' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(37, 99, 235, 0.04)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    const particleCount = Math.floor((width * height) / 20000);
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            const opacity = (100 - dist) / 100 * (theme === 'dark' ? 0.04 : 0.015);
            ctx.strokeStyle = theme === 'dark' ? `rgba(99, 102, 241, ${opacity})` : `rgba(37, 99, 235, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading, chatOpen]);

  const handleSendChat = async (messageText) => {
    const textToSend = messageText || chatInput;
    if (!textToSend.trim()) return;

    // Append user message
    const newHistory = [...chatHistory, { role: 'user', text: textToSend }];
    setChatHistory(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const apiHistory = chatHistory.map(h => ({
        role: h.role,
        text: h.text
      }));

      const res = await api.post('/ai/chat', {
        message: textToSend,
        history: apiHistory
      });

      setChatHistory(prev => [...prev, { role: 'model', text: res.data.reply }]);
      setChatSandbox(res.data.sandbox);
    } catch (err) {
      setChatHistory(prev => [...prev, { 
        role: 'model', 
        text: 'Sorry, I encountered an error communicating with the AI server. Please verify the backend is active.' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const quickPrompts = user?.role === 'admin' 
    ? [
        { label: '📊 Summary Stats', text: 'Give me a brief summary of the workspace attendance and pending reports statistics today.' },
        { label: '⏳ Pending Reviews', text: 'How many reports are pending review evaluation, and what is our current task volume?' },
        { label: '⚙️ System Health', text: 'Check the database status and report on current active system logs.' }
      ]
    : [
        { label: '📝 Daily Report Draft', text: 'Help me draft my daily work report log summarizing my frontend React development.' },
        { label: '🎯 Tomorrow Plan', text: 'Draft a tomorrow plan outlining backend router integrations.' },
        { label: '🐛 React Hook Bug', text: 'How do I resolve a React hook dependency loop bug?' }
      ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Define navigation lists based on role
  const currentNavItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Daily Updates', path: '/daily-updates', icon: ClipboardList },
    { name: "Today's Update", path: '/todays-update', icon: ClipboardList },
    { name: 'View Updates', path: '/view-updates', icon: ClipboardList },
    { name: 'Intern Profiles', path: '/intern-profiles', icon: Users },
    { name: 'Employee Profiles', path: '/employee-profiles', icon: Users },
    { name: 'Manage Interns', path: '/intern-management', icon: Users },
    { name: 'Manage Employees', path: '/employee-management', icon: Users },
  ];

  const filteredNavItems = currentNavItems.filter(item => {
    if (user?.role === 'admin') {
      // Admin sees Overview, View Updates, Profiles, Management
      // Admin does NOT see Daily Updates and Today's Update submission pages
      if (item.path === '/daily-updates' || item.path === '/todays-update') {
        return false;
      }
    } else {
      // Non-admins see Overview, Daily Updates, Today's Update, Profiles
      // Non-admins do NOT see View Updates, Manage Interns, Manage Employees
      if (item.path === '/view-updates' || item.path === '/intern-management' || item.path === '/employee-management') {
        return false;
      }
      if (user?.role === 'intern' && item.path === '/employee-profiles') {
        return false;
      }
      if (user?.role === 'employee' && item.path === '/intern-profiles') {
        return false;
      }
    }
    return true;
  });

  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (chatOpen) setNotifDrawerOpen(false);
  }, [chatOpen]);

  useEffect(() => {
    if (notifDrawerOpen) setChatOpen(false);
  }, [notifDrawerOpen]);

  const allPaletteActions = [
    ...filteredNavItems.map(item => ({
      name: `Go to ${item.name}`,
      description: `Navigate to ${item.name} screen`,
      icon: item.icon,
      action: () => { navigate(item.path); setCommandPaletteOpen(false); }
    })),
    {
      name: 'Toggle Light/Dark Theme',
      description: 'Switch application color scheme',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => { toggleTheme(); setCommandPaletteOpen(false); }
    },
    {
      name: 'Open AI Assistant',
      description: 'Ask questions or draft messages using Gemini intelligence',
      icon: Sparkles,
      action: () => { setChatOpen(true); setCommandPaletteOpen(false); }
    },
    {
      name: 'Sign Out / Logout',
      description: 'Safely sign out of your user account',
      icon: LogOut,
      action: () => { handleLogout(); setCommandPaletteOpen(false); }
    }
  ];

  const filteredPaletteActions = allPaletteActions.filter(act => 
    act.name.toLowerCase().includes(paletteSearch.toLowerCase()) || 
    act.description.toLowerCase().includes(paletteSearch.toLowerCase())
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [paletteSearch, commandPaletteOpen]);

  const handlePaletteKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredPaletteActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredPaletteActions.length) % Math.max(1, filteredPaletteActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPaletteActions[selectedIndex]) {
        filteredPaletteActions[selectedIndex].action();
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-transparent transition-colors duration-300 relative overflow-hidden">
      {/* SVG Liquid Morphing Background Blobs */}
      <div style={{ filter: 'url(#liquid-goo)' }} className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-15%] w-[450px] h-[450px] rounded-full bg-brand-500/10 dark:bg-brand-500/15 blur-[40px] pointer-events-none animate-morph-1"></div>
        <div className="absolute bottom-[-10%] right-[-15%] w-[550px] h-[550px] rounded-full bg-brand-300/8 dark:bg-brand-300/10 blur-[50px] pointer-events-none animate-morph-2"></div>
        <div className="absolute top-[35%] left-[25%] w-[350px] h-[350px] rounded-full bg-brand-400/8 dark:bg-brand-400/10 blur-[30px] pointer-events-none animate-morph-1"></div>
        <div className="absolute bottom-[30%] left-[-10%] w-[400px] h-[400px] rounded-full bg-brand-600/5 dark:bg-brand-600/8 blur-[40px] pointer-events-none animate-morph-2"></div>
      </div>
      
      {/* Background Interactive Faint Constellation Network */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />
      
      {/* Hidden Liquid Filter Definition */}
      <svg className="absolute w-0 h-0" style={{ pointerEvents: 'none' }}>
        <defs>
          <filter id="liquid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
 
      <aside className={`fixed inset-y-0 left-0 z-40 sidebar-transition w-64 ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'} sidebar-custom bg-brand-600 dark:bg-brand-900 border-r border-brand-700/30 dark:border-white/10 text-white/80 dark:text-white/90 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-center px-4 border-b border-brand-700/40 dark:border-white/10 relative">
          <div className="flex items-center justify-center space-x-3 overflow-hidden">
            <img 
              src="/logo.png" 
              alt="Tekquora Logo" 
              onClick={() => setPreviewImageUrl('/logo.png')}
              className="w-12 h-12 rounded-full object-contain bg-white shadow-md shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform" 
            />
            <span className={`font-extrabold text-2xl text-white dark:text-white tracking-wider transition-all duration-300 ${sidebarCollapsed ? 'md:opacity-0 md:w-0 md:scale-90 md:pointer-events-none' : 'opacity-100'}`}>Tekquora</span>
          </div>
          <button 
            onClick={toggleSidebarCollapse} 
            className="hidden md:flex absolute right-4 p-1.5 rounded-lg text-brand-200 hover:text-white hover:bg-brand-700/50 transition-colors"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden absolute right-4 text-brand-200 hover:text-white">
            <X size={20} />
          </button>
        </div>
 
        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center ${sidebarCollapsed ? 'md:justify-center md:space-x-0' : 'space-x-3'} px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] page-fade-in group stagger-${(index % 5) + 1} ${
                  isActive 
                    ? 'bg-brand-200 text-brand-600 shadow-md scale-[1.02]' 
                    : 'text-brand-100 hover:bg-brand-700/60 hover:text-white'
                }`}
                title={sidebarCollapsed ? item.name : ''}
              >
                <Icon size={18} className={isActive ? 'text-brand-600' : 'text-brand-200'} />
                <span className={`transition-all duration-300 ${sidebarCollapsed ? 'md:opacity-0 md:w-0 md:scale-90 md:overflow-hidden md:pointer-events-none md:ml-0' : 'opacity-100 ml-3'}`}>{item.name}</span>
                {isActive && <ChevronRight size={14} className={`ml-auto text-white/60 ${sidebarCollapsed ? 'md:hidden' : ''}`} />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-brand-700/40 dark:border-white/10 flex flex-col space-y-3">
          <div className="flex items-center space-x-3 px-2 overflow-hidden">
            <div className="w-11 h-11 rounded-full bg-brand-700/50 dark:bg-white/10 flex items-center justify-center text-brand-100 dark:text-white border-2 border-white/20 dark:border-white/10 overflow-hidden shrink-0 shadow-md">
              {user?.profile?.profile_photo ? (
                <img 
                  src={getProfilePhotoUrl(user.profile.profile_photo)} 
                  alt="Profile" 
                  onClick={() => setPreviewImageUrl(getProfilePhotoUrl(user.profile.profile_photo))}
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                  onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.querySelector('.fallback-icon')?.classList.remove('hidden'); }}
                />
              ) : (
                <UserCircle size={24} />
              )}
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'md:opacity-0 md:w-0 md:scale-90 md:pointer-events-none' : 'opacity-100'}`}>
              <p className="text-sm font-bold text-white dark:text-white truncate">{user?.profile?.full_name || user?.email?.split('@')[0] || ''}</p>
              <p className="text-xs text-brand-200/80 dark:text-slate-400 capitalize">{user?.role} Account</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className={`flex items-center space-x-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-red-200 hover:bg-red-900/30 hover:text-red-100 transition-colors ${sidebarCollapsed ? 'md:justify-center' : ''}`}
            title="Sign Out"
          >
            <LogOut size={18} />
            <span className={sidebarCollapsed ? 'md:hidden' : ''}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Main Container */}
      <div className={`flex-1 main-content-transition ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} flex flex-col min-w-0`}>
        {/* TOPBAR */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white/20 dark:bg-brand-900/10 backdrop-blur-md border-b border-white/25 dark:border-white/5 sticky top-0 z-30">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-brand-600 dark:text-white hover:bg-white/20 p-2 rounded-lg shrink-0"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-extrabold text-base sm:text-lg text-brand-600 dark:text-white capitalize truncate max-w-[140px] sm:max-w-none">
              {location.pathname.replace('/', '').replace('-', ' ') || 'Overview'}
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="text-brand-600 dark:text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications Trigger */}
            <div className="relative">
              <button 
                onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
                className={`text-brand-600 dark:text-white hover:bg-white/20 p-2 rounded-lg relative transition-colors ${unreadNotifCount > 0 ? 'animate-bell-ring' : ''}`}
              >
                <Bell size={18} />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-brand-200 dark:ring-brand-900"></span>
                )}
              </button>
            </div>

            {/* Profile Detail Badge and Dropdown Menu */}
            <div className="relative border-l border-white/30 dark:border-white/10 pl-2.5 sm:pl-4">
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-1.5 sm:space-x-2 focus:outline-none transition-opacity hover:opacity-80"
              >
                <span className="text-sm font-semibold text-brand-600 dark:text-white hidden sm:inline-block">
                  {user?.profile?.full_name || user?.email?.split('@')[0] || ''}
                </span>
                {user?.profile?.profile_photo && !profileImageError ? (
                  <img 
                    src={getProfilePhotoUrl(user.profile.profile_photo)} 
                    alt={user.profile.full_name} 
                    className="w-8 h-8 rounded-full object-cover border border-white/40 dark:border-white/25 transition-transform hover:scale-105"
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-brand-800 flex items-center justify-center text-brand-600 dark:text-white font-bold border border-white/40 dark:border-white/25 transition-transform hover:scale-105">
                    {(user?.profile?.full_name || user?.email || 'U')[0].toUpperCase()}
                  </div>
                )}
              </button>

              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-scale-up origin-top-right">
                    {user?.profile?.profile_photo && (
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setPreviewImageUrl(getProfilePhotoUrl(user.profile.profile_photo));
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left font-semibold border-b border-slate-100 dark:border-slate-800"
                      >
                        <UserCircle size={16} className="mr-2" />
                        View Profile Photo
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left font-semibold"
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Panel */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto page-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* AI ASSISTANT CHAT DRAWER */}
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-2">
        {showHelperBubble && (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-white/10 px-3 py-2 rounded-2xl shadow-xl text-[10px] font-semibold text-slate-700 dark:text-slate-200 animate-slide-up flex items-center space-x-2 relative pr-7 animate-float z-40">
            <span>Need assistance? Ask me! 🤖</span>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowHelperBubble(false); }}
              className="absolute right-2 top-2 text-slate-450 hover:text-slate-650 dark:hover:text-white"
            >
              <X size={10} />
            </button>
          </div>
        )}
        <button 
          onClick={() => { setChatOpen(!chatOpen); setShowHelperBubble(false); }}
          className="w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-2xl shadow-brand-600/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:rotate-12 group relative border border-white/25 dark:border-white/10"
        >
          <Sparkles size={24} className="group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-teal-500"></span>
          </span>
        </button>
      </div>

      {/* Slide-out Drawer Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-96 max-w-full drawer-custom bg-[#0f3a48] border-l border-[#0f3a48]/20 shadow-2xl flex flex-col ${chatOpen ? 'translate-x-0 spring-drawer' : 'translate-x-full duration-300'}`}>
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">AI Workspace Assistant</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Powered by Google Gemini</p>
            </div>
          </div>
          <button 
            onClick={() => setChatOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Container Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 select-text">
          {chatSandbox && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] rounded-xl p-3 flex items-start space-x-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                <strong>Sandbox Simulation Mode:</strong> Backend GEMINI_API_KEY environment variable is not configured. Ask anything to see mock examples.
              </span>
            </div>
          )}

          {chatHistory.map((chat, idx) => {
            const isUser = chat.role === 'user';
            return (
              <div key={idx} className={`flex flex-col animate-fade-in ${isUser ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-slate-400 mb-0.5 px-1">{isUser ? 'You' : 'Assistant'}</span>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs shadow-sm leading-relaxed animate-slide-up ${
                  isUser 
                    ? 'bg-brand-600 text-white rounded-tr-none' 
                    : 'bg-slate-100/70 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/50 dark:border-slate-800/50'
                }`}>
                  <p className="whitespace-pre-line">{chat.text}</p>
                </div>
              </div>
            );
          })}
          
          {chatLoading && (
            <div className="flex flex-col items-start">
              <span className="text-[9px] text-slate-400 mb-0.5 px-1">Assistant</span>
              <div className="bg-slate-100/70 dark:bg-slate-800/80 p-3.5 rounded-2xl rounded-tl-none border border-slate-200/50 dark:border-slate-800/50 flex space-x-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Panel */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-1.5 bg-slate-50/20 dark:bg-slate-900/10">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              disabled={chatLoading}
              onClick={() => handleSendChat(p.text)}
              className="text-[9px] px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-white/5 rounded-lg text-slate-650 dark:text-slate-300 font-semibold transition-colors disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Form Input Area */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
          className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-950 flex space-x-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={chatLoading}
            placeholder="Ask me anything..."
            className="flex-1 text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className="p-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl shadow-sm flex items-center justify-center transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

      {/* COMMAND PALETTE (Ctrl+K) */}
      {commandPaletteOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-white/10 overflow-hidden flex flex-col scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center px-4 py-3 border-b border-slate-200/50 dark:border-white/10">
              <Search className="text-slate-400 mr-3 shrink-0" size={18} />
              <input 
                type="text" 
                placeholder="Search actions, pages, and tools... (e.g. Overview, theme)" 
                className="w-full bg-transparent text-sm text-slate-800 dark:text-white border-0 outline-none focus:ring-0 placeholder-slate-400" 
                value={paletteSearch} 
                onChange={e => setPaletteSearch(e.target.value)} 
                onKeyDown={handlePaletteKeyDown}
                autoFocus 
              />
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded border border-slate-200/50 dark:border-slate-800">ESC</span>
            </div>

            {/* Actions List */}
            <div className="max-h-[300px] overflow-y-auto p-2">
              {filteredPaletteActions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-400">
                  No matches found for <span className="font-semibold text-slate-700 dark:text-slate-200">"{paletteSearch}"</span>
                </div>
              ) : (
                filteredPaletteActions.map((act, index) => {
                  const Icon = act.icon;
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={index}
                      onClick={() => act.action()}
                      className={`w-full flex items-center px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                        isSelected 
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg mr-3 shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{act.name}</p>
                        <p className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-400'}`}>{act.description}</p>
                      </div>
                      {isSelected && <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-md animate-scale-up">Enter</span>}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-400">
              <div className="flex items-center space-x-3">
                <span>↑↓ to navigate</span>
                <span>↵ to select</span>
              </div>
              <span>Press <kbd className="font-semibold bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded border border-slate-200/50 dark:border-white/10">Ctrl+K</kbd> to toggle</span>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS DRAWER */}
      <div className={`fixed inset-y-0 right-0 z-50 w-96 max-w-full drawer-custom bg-[#0f3a48] border-l border-[#0f3a48]/20 shadow-2xl flex flex-col ${notifDrawerOpen ? 'translate-x-0 spring-drawer' : 'translate-x-full duration-300'}`}>
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <Bell size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Workspace Alerts</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Activity and system notifications</p>
            </div>
          </div>
          <button 
            onClick={() => setNotifDrawerOpen(false)}
            className="text-slate-400 hover:text-slate-650 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Container Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 select-text">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-450 text-xs space-y-2">
              <Bell size={32} className="opacity-40" />
              <span>No notifications yet.</span>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-3.5 rounded-xl border transition-all text-xs ${
                  notif.is_read 
                    ? 'bg-slate-50/40 dark:bg-slate-900/20 border-slate-100/50 dark:border-white/5 text-slate-500 dark:text-slate-400' 
                    : 'bg-brand-500/5 dark:bg-brand-500/10 border-brand-500/10 dark:border-brand-500/20 text-slate-850 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold">{notif.title}</span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="leading-relaxed mb-2">{notif.message}</p>
                {!notif.is_read && (
                  <button 
                    onClick={() => {
                      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                    }}
                    className="text-[9px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Action Panel */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-slate-200/50 dark:border-white/10 bg-slate-50 dark:bg-slate-950 flex justify-end">
            <button
              onClick={() => {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
              }}
              className="text-[10px] px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-white/5 rounded-lg text-slate-650 dark:text-slate-300 font-semibold transition-colors"
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>

      {/* Photo/Logo Lightbox Modal */}
      {previewImageUrl && (
        <div 
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md cursor-zoom-out p-4 page-fade-in"
        >
          <div 
            className="relative max-w-2xl w-full bg-white/5 border border-white/10 p-2 rounded-3xl pop-bounce shadow-2xl overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md"
            >
              <X size={18} />
            </button>
            <img 
              src={previewImageUrl} 
              alt="Preview" 
              className={`w-full h-auto max-h-[80vh] object-contain rounded-2xl ${previewImageUrl === '/logo.png' ? 'bg-white p-6' : 'bg-slate-950 p-2'}`}
            />
          </div>
        </div>
      )}
    </div>
  );

};

export default DashboardLayout;
