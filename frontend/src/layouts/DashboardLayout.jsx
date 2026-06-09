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
  const { user, logout, theme, toggleTheme } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [notifications, setNotifications] = useState([]);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

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
        <div className="absolute top-[-10%] left-[-15%] w-[450px] h-[450px] rounded-full bg-blue-500/10 dark:bg-blue-500/15 blur-[40px] pointer-events-none animate-morph-1"></div>
        <div className="absolute bottom-[-10%] right-[-15%] w-[550px] h-[550px] rounded-full bg-sky-500/8 dark:bg-sky-500/10 blur-[50px] pointer-events-none animate-morph-2"></div>
        <div className="absolute top-[35%] left-[25%] w-[350px] h-[350px] rounded-full bg-indigo-500/8 dark:bg-indigo-500/10 blur-[30px] pointer-events-none animate-morph-1"></div>
        <div className="absolute bottom-[30%] left-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/5 dark:bg-blue-600/8 blur-[40px] pointer-events-none animate-morph-2"></div>
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
 
      {/* SIDEBAR - Desktop & Mobile */}
      <aside className={`fixed inset-y-0 left-0 z-40 sidebar-transition ${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white/60 dark:bg-slate-950/40 backdrop-blur-xl border-r border-slate-200/50 dark:border-white/10 text-slate-800 dark:text-white/90 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200/50 dark:border-white/10">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white shadow-lg animate-pulse-slow shrink-0">M</div>
            <span className={`font-bold text-lg text-slate-800 dark:text-white tracking-wider transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 w-0 scale-90 pointer-events-none' : 'opacity-100'}`}>MCC PANEL</span>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={toggleSidebarCollapse} 
              className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500 dark:text-slate-355 hover:text-slate-800 dark:hover:text-white">
              <X size={20} />
            </button>
          </div>
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
                className={`flex items-center ${sidebarCollapsed ? 'md:justify-center md:space-x-0' : 'space-x-3'} px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] page-fade-in stagger-${(index % 5) + 1} ${
                  isActive 
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-500 dark:from-brand-700 dark:to-indigo-600 text-white shadow-lg shadow-brand-500/25 scale-[1.02] border-r-4 border-indigo-400' 
                    : 'text-slate-600 dark:text-slate-350 hover:bg-slate-100/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white nav-link-underline'
                }`}
                title={sidebarCollapsed ? item.name : ''}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                <span className={`transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 w-0 scale-90 overflow-hidden pointer-events-none ml-0' : 'opacity-100 ml-3'}`}>{item.name}</span>
                {isActive && !sidebarCollapsed && <ChevronRight size={14} className="ml-auto text-white/60" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 flex flex-col space-y-3">
          <div className="flex items-center space-x-3 px-2 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 overflow-hidden shrink-0">
              {user?.profile?.profile_photo ? (
                <img src={user.profile.profile_photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle size={24} />
              )}
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 w-0 scale-90 pointer-events-none' : 'opacity-100'}`}>
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user?.profile?.full_name || user?.email?.split('@')[0] || ''}</p>
              <p className="text-xs text-slate-550 dark:text-slate-400 capitalize">{user?.role} Account</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className={`flex items-center space-x-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors ${sidebarCollapsed ? 'md:justify-center' : ''}`}
            title="Sign Out"
          >
            <LogOut size={18} />
            <span className={sidebarCollapsed ? 'md:hidden' : ''}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className={`flex-1 main-content-transition ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} flex flex-col min-w-0`}>
        {/* TOPBAR */}
        <header className="h-16 flex items-center justify-between px-6 bg-white/45 dark:bg-slate-950/20 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 p-2 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-extrabold text-lg text-slate-800 dark:text-white capitalize">
              {location.pathname.replace('/', '').replace('-', ' ') || 'Overview'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 p-2 rounded-lg transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications Trigger */}
            <div className="relative">
              <button 
                onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
                className={`text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 p-2 rounded-lg relative transition-colors ${unreadNotifCount > 0 ? 'animate-bell-ring' : ''}`}
              >
                <Bell size={18} />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900"></span>
                )}
              </button>
            </div>

            {/* Profile Detail Badge */}
            <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-white/10 pl-4">
              <span className="text-sm font-semibold text-slate-700 dark:text-white hidden sm:inline-block">
                {user?.profile?.full_name || user?.email?.split('@')[0] || ''}
              </span>
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white font-bold border border-slate-200 dark:border-white/25">
                {(user?.profile?.full_name || user?.email || 'U')[0].toUpperCase()}
              </div>
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
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-205 dark:border-white/10 px-3 py-2 rounded-2xl shadow-xl text-[10px] font-semibold text-slate-700 dark:text-slate-200 animate-slide-up flex items-center space-x-2 relative pr-7 animate-float z-40">
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
          className="w-14 h-14 bg-gradient-to-tr from-brand-600 via-purple-500 to-fuchsia-500 hover:from-brand-500 hover:to-fuchsia-400 text-white rounded-full shadow-2xl shadow-brand-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:rotate-12 group relative border border-white/25 dark:border-white/10"
        >
          <Sparkles size={24} className="group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-teal-500"></span>
          </span>
        </button>
      </div>

      {/* Slide-out Drawer Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-96 max-w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-l border-slate-205 dark:border-white/10 shadow-2xl flex flex-col ${chatOpen ? 'translate-x-0 spring-drawer' : 'translate-x-full duration-300'}`}>
        
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
      <div className={`fixed inset-y-0 right-0 z-50 w-96 max-w-full bg-white/85 dark:bg-slate-950/85 backdrop-blur-2xl border-l border-slate-200/50 dark:border-white/10 shadow-2xl flex flex-col ${notifDrawerOpen ? 'translate-x-0 spring-drawer' : 'translate-x-full duration-300'}`}>
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-650 flex items-center justify-center text-white">
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
                    : 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/10 dark:border-indigo-500/20 text-slate-800 dark:text-slate-200'
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
                    className="text-[9px] font-bold text-indigo-650 dark:text-indigo-405 hover:underline"
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
    </div>
  );

};

export default DashboardLayout;
