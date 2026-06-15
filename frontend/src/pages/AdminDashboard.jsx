import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Users, CheckCircle, Clock, FileText, AlertCircle, XCircle, 
  Send, FileDown, Play, Image as ImageIcon, Volume2, Video, X, MessageSquare, Mail, RefreshCw, Database, Terminal, CheckCircle2, ChevronRight, ChevronLeft, Search 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';

const COLORS = ['#2563eb', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState({
    total_interns: 0, active_interns: 0, completed_internships: 0,
    total_employees: 0, active_employees: 0,
    present_today: 0, absent_today: 0, late_arrivals: 0,
    reports_submitted_today: 0, pending_reviews: 0, approved_reports: 0, rejected_reports: 0,
    interns_present_today: 0, interns_absent_today: 0
  });
  
  const [charts, setCharts] = useState({
    domain_distribution: [], college_distribution: [],
    designation_distribution: [],
    technology_stats: [], attendance_trends: []
  });
  
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [mediaPreview, setMediaPreview] = useState(null); // { url, type, name }
  const [activeChatReport, setActiveChatReport] = useState(null);
  const [chatComments, setChatComments] = useState([]);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [emailLogs, setEmailLogs] = useState([]);
  const [simulatingCron, setSimulatingCron] = useState(false);
  const [mongoCollection, setMongoCollection] = useState('users');
  const [mongoDocs, setMongoDocs] = useState([]);
  const [mongoLoading, setMongoLoading] = useState(false);
  const [mongoError, setMongoError] = useState('');
  const [mongoSearchText, setMongoSearchText] = useState('');
  
  const [kpiOrder, setKpiOrder] = useState(() => {
    const saved = localStorage.getItem('kpiCardOrder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length === 5) return parsed;
      } catch (e) {}
    }
    return ['total_interns', 'total_employees', 'present', 'absent', 'submitted'];
  });

  const moveKpi = (index, direction) => {
    const newOrder = [...kpiOrder];
    const targetIndex = index + direction;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      setKpiOrder(newOrder);
      localStorage.setItem('kpiCardOrder', JSON.stringify(newOrder));
      showToast('KPI cards reordered', 'success');
    }
  };
  
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [checkingInOut, setCheckingInOut] = useState(false);
  
  const token = localStorage.getItem('access_token');

  // Load Dashboard Data
  const loadDashboardData = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [statsRes, chartsRes, feedRes] = await Promise.all([
        api.get('/analytics/admin-stats'),
        api.get('/analytics/charts'),
        api.get('/analytics/feed')
      ]);
      setStats(statsRes.data);
      setCharts(chartsRes.data);
      setFeed(feedRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const [internsRes, employeesRes] = await Promise.all([
        api.get('/interns/'),
        api.get('/employees/')
      ]);
      const internsList = internsRes.data.map(i => ({
        id: i.user_id,
        name: i.full_name,
        role: 'intern',
        identifier: i.internship_id,
        profile_photo: i.profile_photo || null
      }));
      const employeesList = employeesRes.data.map(e => ({
        id: e.user_id,
        name: e.full_name,
        role: 'employee',
        identifier: e.employee_id,
        profile_photo: e.profile_photo || null
      }));
      setProfiles([...internsList, ...employeesList]);
    } catch (err) {
      console.error('Failed to load profiles for check-in workspace', err);
    }
  };

  const fetchTodayAttendance = async (userId) => {
    setAttendanceLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await api.get('/attendance/', {
        params: {
          date: todayStr,
          intern_id: userId
        }
      });
      if (res.data && res.data.length > 0) {
        setTodayAttendance(res.data[0]);
      } else {
        setTodayAttendance(null);
      }
    } catch (err) {
      console.error('Failed to fetch today attendance for selected user', err);
      showToast("Failed to check today's presence logs", 'error');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckInSelected = async () => {
    if (!selectedProfileId) return;
    setCheckingInOut(true);
    try {
      await api.post('/attendance/check-in', {
        user_id: parseInt(selectedProfileId)
      });
      showToast('Checked in successfully', 'success');
      fetchTodayAttendance(selectedProfileId);
      loadDashboardData();
    } catch (err) {
      console.error('Check-in failed', err);
      showToast(err.response?.data?.detail || 'Check-in failed', 'error');
    } finally {
      setCheckingInOut(false);
    }
  };

  const handleCheckOutSelected = async () => {
    if (!selectedProfileId) return;
    setCheckingInOut(true);
    try {
      await api.post(`/attendance/check-out?user_id=${selectedProfileId}`);
      showToast('Checked out successfully', 'success');
      fetchTodayAttendance(selectedProfileId);
      loadDashboardData();
    } catch (err) {
      console.error('Check-out failed', err);
      showToast(err.response?.data?.detail || 'Check-out failed', 'error');
    } finally {
      setCheckingInOut(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    fetchEmailLogs();
    loadProfiles();
    const interval = setInterval(() => {
      loadDashboardData(true);
      fetchEmailLogs();
    }, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedProfileId) {
      setTodayAttendance(null);
      return;
    }
    fetchTodayAttendance(selectedProfileId);
  }, [selectedProfileId]);

  const fetchEmailLogs = async () => {
    try {
      const res = await api.get('/attendance/email-logs');
      setEmailLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to load email logs', err);
    }
  };

  const fetchMongoData = async (collection) => {
    setMongoLoading(true);
    setMongoError('');
    try {
      const res = await api.get(`/analytics/mongo-data/${collection}`);
      setMongoDocs(res.data);
    } catch (err) {
      setMongoError(err.response?.data?.detail || 'Failed to query MongoDB database.');
      setMongoDocs([]);
    } finally {
      setMongoLoading(false);
    }
  };

  useEffect(() => {
    fetchMongoData(mongoCollection);
  }, [mongoCollection]);

  const handleSimulateCron = async () => {
    setSimulatingCron(true);
    try {
      const res = await api.post('/attendance/simulate-cron');
      showToast(`Scan complete. Sent ${res.data.alerted_count} check-in email alerts.`, 'success');
      fetchEmailLogs();
      loadDashboardData();
    } catch (err) {
      showToast('Failed to trigger check-in scan.', 'error');
    } finally {
      setSimulatingCron(false);
    }
  };

  const handleOpenChat = async (reportId) => {
    try {
      const res = await api.get(`/reports/${reportId}`);
      setActiveChatReport(res.data);
      setChatComments(res.data.feedbacks || []);
      setAdminReplyText('');
    } catch (err) {
      showToast('Failed to load report discussion thread.', 'error');
    }
  };

  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeChatReport) return;
    try {
      const res = await api.post(`/reports/${activeChatReport.id}/comments`, {
        comments: adminReplyText
      });
      setChatComments(prev => [...prev, res.data]);
      setAdminReplyText('');
      showToast('Reply comment posted.', 'success');
      loadDashboardData();
    } catch (err) {
      showToast('Failed to send comment reply.', 'error');
    }
  };

  // Handle report approval/rejection
  const handleReviewReport = async (reportId, status) => {
    const comments = commentInputs[reportId] || '';
    try {
      await api.post(`/reports/${reportId}/review`, { status, comments });
      
      // Clear comment input
      setCommentInputs(prev => ({ ...prev, [reportId]: '' }));
      
      // Reload stats and feed
      loadDashboardData();
      showToast(`Report ${status.toUpperCase()} successfully.`, 'success');
    } catch (err) {
      showToast('Failed to submit report review.', 'error');
    }
  };

  const handleCommentChange = (reportId, value) => {
    setCommentInputs(prev => ({ ...prev, [reportId]: value }));
  };

  // Helper to format file download URLs
  const getFileUrl = (attachmentId) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    return `${API_URL}/media/download/${attachmentId}?token=${token}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Shimmer Hero Banner */}
        <div className="h-32 w-full rounded-xl animate-shimmer border border-rose-150/10"></div>

        {/* Shimmer KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-xl animate-shimmer border border-rose-150/10"></div>
          ))}
        </div>

        {/* Shimmer Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-xl animate-shimmer border border-rose-150/10"></div>
          <div className="h-96 rounded-xl animate-shimmer border border-rose-150/10"></div>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6 relative">
      {(isRefreshing || checkingInOut || simulatingCron || attendanceLoading) && (
        <div className="progress-loader-bar">
          <div className="progress-loader-bar-fill"></div>
        </div>
      )}

      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden welcome-hero-banner bg-brand-600 dark:bg-brand-900 text-white rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100 C 20 80, 40 80, 60 100 C 80 120, 100 100, 100 100 L 100 0 L 0 0 Z" fill="white"/>
          </svg>
        </div>
        <div className="relative z-10">
          <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold mt-3">{getGreeting()}, {user?.profile?.full_name || 'Administrator'}!</h2>
          <p className="text-xs text-brand-100 mt-1 max-w-xl">
            Welcome to the IMMS Enterprise Management Suite. You have {stats.pending_reviews} reports pending evaluation comments.
          </p>
        </div>
      </div>

      {/* 🚀 METRICS KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {kpiOrder.map((key, idx) => {
          if (key === 'total_interns') {
            return (
              <div key="total_interns" className="dashboard-card hover-lift transition-all animate-fade-in animate-slide-up stagger-1 relative group">
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10">
                  <button onClick={() => moveKpi(idx, -1)} disabled={idx === 0} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-700 disabled:opacity-30 shadow-sm border border-slate-200 dark:border-slate-750">
                    <ChevronLeft size={10} />
                  </button>
                  <button onClick={() => moveKpi(idx, 1)} disabled={idx === kpiOrder.length - 1} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-700 disabled:opacity-30 shadow-sm border border-slate-200 dark:border-slate-750">
                    <ChevronRight size={10} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Interns</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">{stats.total_interns}</h3>
                  </div>
                  <div className="p-3 bg-brand-500/10 rounded-xl text-brand-600 dark:text-brand-400">
                    <Users size={20} />
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-slate-500 flex items-center space-x-1.5">
                  <span className="text-emerald-500 font-bold">{stats.active_interns} Active</span>
                  <span>•</span>
                  <span>{stats.completed_internships} Completed</span>
                </div>
              </div>
            );
          }
          if (key === 'total_employees') {
            return (
              <div key="total_employees" className="dashboard-card hover-lift transition-all animate-fade-in animate-slide-up stagger-2 relative group">
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10">
                  <button onClick={() => moveKpi(idx, -1)} disabled={idx === 0} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-700 disabled:opacity-30 shadow-sm border border-slate-200 dark:border-slate-750">
                    <ChevronLeft size={10} />
                  </button>
                  <button onClick={() => moveKpi(idx, 1)} disabled={idx === kpiOrder.length - 1} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-700 disabled:opacity-30 shadow-sm border border-slate-200 dark:border-slate-750">
                    <ChevronRight size={10} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Employees</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">{stats.total_employees || 0}</h3>
                  </div>
                  <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Users size={20} />
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-slate-500 flex items-center space-x-1.5">
                  <span className="text-emerald-500 font-bold">{stats.active_employees || 0} Active</span>
                  <span>•</span>
                  <span>{((stats.total_employees || 0) - (stats.active_employees || 0)) || 0} Inactive</span>
                </div>
              </div>
            );
          }
          if (key === 'present') {
            return (
              <div key="present" className="dashboard-card hover-lift transition-all animate-fade-in animate-slide-up stagger-3 relative group">
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10">
                  <button onClick={() => moveKpi(idx, -1)} disabled={idx === 0} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-700 disabled:opacity-30 shadow-sm border border-slate-200 dark:border-slate-750">
                    <ChevronLeft size={10} />
                  </button>
                  <button onClick={() => moveKpi(idx, 1)} disabled={idx === kpiOrder.length - 1} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-700 disabled:opacity-30 shadow-sm border border-slate-200 dark:border-slate-750">
                    <ChevronRight size={10} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Interns Present</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">{stats.interns_present_today || 0}</h3>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={20} />
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-slate-500 flex items-center space-x-1.5">
                  <span className="text-emerald-500 font-bold">Present today</span>
                </div>
              </div>
            );
          }
          if (key === 'absent') {
            return (
              <div key="absent" className="dashboard-card hover-lift transition-all animate-fade-in animate-slide-up stagger-4 relative group">
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10">
                  <button onClick={() => moveKpi(idx, -1)} disabled={idx === 0} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-700 disabled:opacity-30 shadow-sm border border-slate-200 dark:border-slate-750">
                    <ChevronLeft size={10} />
                  </button>
                  <button onClick={() => moveKpi(idx, 1)} disabled={idx === kpiOrder.length - 1} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-700 disabled:opacity-30 shadow-sm border border-slate-200 dark:border-slate-750">
                    <ChevronRight size={10} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Interns Absent</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">{stats.interns_absent_today || 0}</h3>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-xl text-red-600 dark:text-red-400 animate-alert-wiggle">
                    <AlertCircle size={20} />
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-slate-500 flex items-center space-x-1.5">
                  <span className="text-red-500 font-bold">Absent today</span>
                </div>
              </div>
            );
          }
          if (key === 'submitted') {
            return (
              <div key="submitted" className="dashboard-card hover-lift transition-all animate-fade-in animate-slide-up stagger-5 relative group">
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10">
                  <button onClick={() => moveKpi(idx, -1)} disabled={idx === 0} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-700 disabled:opacity-30 shadow-sm border border-slate-200 dark:border-slate-750">
                    <ChevronLeft size={10} />
                  </button>
                  <button onClick={() => moveKpi(idx, 1)} disabled={idx === kpiOrder.length - 1} className="p-1 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-700 disabled:opacity-30 shadow-sm border border-slate-200 dark:border-slate-750">
                    <ChevronRight size={10} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Submitted Today</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">{stats.reports_submitted_today || 0}</h3>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                    <FileText size={20} />
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-slate-500 flex items-center space-x-1.5">
                  <span className="text-brand-500 font-bold">{stats.pending_reviews || 0} Pending Review</span>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* 🏢 DAILY PRESENCE CHECK-IN WORKSPACE */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-150 dark:border-slate-850">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-brand-500/10 rounded-xl text-brand-500">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Daily Presence Workspace</h3>
              <p className="text-[10px] text-slate-505 dark:text-slate-400 mt-0.5">Mark daily check-in / check-out logs for interns & employees</p>
            </div>
          </div>
          {selectedProfileId && (() => {
            const selProfile = profiles.find(p => p.id.toString() === selectedProfileId.toString());
            return selProfile ? (
              <div className="flex items-center space-x-2">
                {selProfile.profile_photo ? (
                  <img
                    src={(() => {
                      const photo = selProfile.profile_photo;
                      if (!photo) return '';
                      if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
                      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
                      return `${API_URL.replace('/api/v1', '')}/static/uploads/${photo}`;
                    })()}
                    alt={selProfile.name}
                    className="w-8 h-8 rounded-xl object-cover border border-brand-500/30 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-sm">
                    {selProfile.name[0].toUpperCase()}
                  </div>
                )}
                <div className="text-[10px] font-bold px-3 py-1 bg-brand-500/10 text-brand-500 rounded-full">
                  {selProfile.name} ({selProfile.role.toUpperCase()})
                </div>
              </div>
            ) : null;
          })()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Profile Dropdown Selection */}
          <div className="md:col-span-6 space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select User Profile</label>
            <div className="relative">
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-white/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300 appearance-none font-medium"
              >
                <option value="">-- Choose Intern or Employee --</option>
                {profiles.map((profile) => (
                  <option key={`${profile.role}-${profile.id}`} value={profile.id}>
                    {profile.role.toUpperCase()}: {profile.name} ({profile.identifier})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>

          {/* Action and status workspace */}
          <div className="md:col-span-6 flex flex-col justify-center bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-2xl min-h-[96px] relative overflow-hidden">
            {selectedProfileId ? (
              attendanceLoading ? (
                <div className="flex items-center justify-center space-x-2 text-slate-500 text-xs py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500"></div>
                  <span>Checking attendance status...</span>
                </div>
              ) : (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {/* Status description */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's Status</span>
                    {todayAttendance ? (
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          todayAttendance.status === 'late' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {todayAttendance.status.toUpperCase()}
                        </span>
                        <div className="text-xs text-slate-650 dark:text-slate-350 mt-1 font-semibold">
                          Checked-in: {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {todayAttendance.check_out_time && (
                            <span> | Checked-out: {new Date(todayAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-350 mt-1">
                        NOT CHECKED IN
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center space-x-2.5 shrink-0">
                    {!todayAttendance ? (
                      <button
                        onClick={handleCheckInSelected}
                        disabled={checkingInOut}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-xs font-bold text-white rounded-full shadow-md active:translate-y-[1px] transition-all flex items-center space-x-1"
                      >
                        <CheckCircle size={14} />
                        <span>Check In</span>
                      </button>
                    ) : !todayAttendance.check_out_time ? (
                      <button
                        onClick={handleCheckOutSelected}
                        disabled={checkingInOut}
                        className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-xs font-bold text-white rounded-full shadow-md active:translate-y-[1px] transition-all flex items-center space-x-1"
                      >
                        <XCircle size={14} />
                        <span>Check Out</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-1.5 text-emerald-500 text-xs font-bold bg-emerald-500/10 px-3.5 py-2 rounded-full">
                        <CheckCircle2 size={16} />
                        <span>Checked out for today</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <p className="text-xs text-slate-450 dark:text-slate-500 text-center py-2">
                👈 Please select a profile from the dropdown to manage daily presence check-in.
              </p>
            )}
          </div>
        </div>
      </div>


      {/* 📊 CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trends */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Attendance Trends (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.attendance_trends}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="present" stroke="#10b981" fillOpacity={1} fill="url(#presentGrad)" />
                <Area type="monotone" dataKey="late" stroke="#f59e0b" fillOpacity={1} fill="url(#lateGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Domain Distribution Pie Chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Internship Domain Distribution</h3>
          <div className="h-64 flex flex-col md:flex-row items-center justify-between">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.domain_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {charts.domain_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-2 mt-4 md:mt-0">
              {charts.domain_distribution.map((entry, idx) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-white">{entry.value} Interns</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Designation Distribution Pie Chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Employee Designation Distribution</h3>
          <div className="h-64 flex flex-col md:flex-row items-center justify-between">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.designation_distribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(charts.designation_distribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-2 mt-4 md:mt-0 max-h-60 overflow-y-auto pr-1">
              {(charts.designation_distribution || []).map((entry, idx) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    <span className="text-slate-600 dark:text-slate-400 font-medium truncate max-w-[100px]">{entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-white">{entry.value} Employees</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tech Usage Stats */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Top Technology Stack Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.technology_stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]}>
                  {charts.technology_stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* College distribution */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">College-Wise Representation</h3>
          <div className="h-64 overflow-y-auto pr-2 space-y-3">
            {(charts.college_distribution || []).length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No data recorded.</p>
            ) : (
              (charts.college_distribution || []).map((col) => (
                <div key={col.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-xs">{col.name}</span>
                    <span className="text-slate-800 dark:text-white">{col.value}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-brand-500 h-full rounded-full" 
                      style={{ width: `${(col.value / (stats.total_interns || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 📱 TODAY'S WORK FEED (CENTRAL TIMELINE) */}
      <div className="glass-card p-6">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Today's Work Feed</h3>
        <div className="relative timeline-line pl-10 space-y-8">
          {feed.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No reports or actions logged today yet.</p>
          ) : (
            feed.map((card) => {
              // Extract details for reports
              const isReport = card.activity_type === 'report_submit';
              const isCheckIn = card.activity_type === 'check_in';
              const isCheckOut = card.activity_type === 'check_out';
              
              // Load attached file references if activity logs attachments
              // Note: Details of checkin or reports are returned inside card.details
              return (
                <div key={card.id} className="relative group">
                  {/* Timeline icon indicator */}
                  <div className={`absolute -left-10 top-1 w-10 h-10 rounded-full border-4 border-slate-50 dark:border-slate-950 flex items-center justify-center text-white shadow ${
                    isCheckIn ? 'bg-emerald-500' : isCheckOut ? 'bg-indigo-500' : 'bg-brand-500'
                  }`}>
                    {isCheckIn ? '✓' : isCheckOut ? '✗' : '📝'}
                  </div>

                  {/* Feed Card Body */}
                  <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 md:p-6 shadow-sm">
                    {/* User profile tags */}
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center font-bold text-brand-600 dark:text-brand-400">
                          {(card.user_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white">{card.user_name}</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {card.college_name} • <span className="font-semibold text-brand-500">{card.internship_domain}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(card.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Timeline Action details */}
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {card.details}
                      </p>
                    </div>

                    {/* Render Report Attachments if present */}
                    {card.attachments && card.attachments.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        {card.attachments.map((att) => {
                          const fileUrl = getFileUrl(att.id);
                          return (
                            <div key={att.id} className="mt-1">
                              {att.file_type === 'image' && (
                                <div className="relative group/img max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-zoom-in">
                                  <img 
                                    src={fileUrl} 
                                    alt={att.file_name} 
                                    className="max-h-48 object-cover w-full transition-transform duration-300 group-hover/img:scale-105"
                                    onClick={() => setMediaPreview({ url: fileUrl, type: 'image', name: att.file_name })}
                                  />
                                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full flex items-center space-x-1">
                                      <ImageIcon size={14} />
                                      <span>Click to Zoom</span>
                                    </span>
                                  </div>
                                </div>
                              )}
                              {att.file_type === 'audio' && (
                                <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-850 max-w-md">
                                  <p className="text-[10px] text-slate-500 mb-1 flex items-center space-x-1">
                                    <Volume2 size={12} className="text-brand-500" />
                                    <span className="font-semibold truncate">{att.file_name}</span>
                                  </p>
                                  <audio 
                                    src={fileUrl} 
                                    controls 
                                    className="w-full h-8 mt-1" 
                                    preload="metadata"
                                  />
                                </div>
                              )}
                              {att.file_type === 'video' && (
                                <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-850 max-w-lg">
                                  <p className="text-[10px] text-slate-500 mb-1.5 flex items-center space-x-1">
                                    <Video size={12} className="text-brand-500" />
                                    <span className="font-semibold truncate">{att.file_name}</span>
                                  </p>
                                  <video 
                                    src={fileUrl} 
                                    controls 
                                    className="w-full rounded-lg max-h-64 border border-slate-100 dark:border-slate-800" 
                                    preload="metadata"
                                  />
                                </div>
                              )}
                              {att.file_type !== 'image' && att.file_type !== 'audio' && att.file_type !== 'video' && (
                                <a 
                                  href={fileUrl}
                                  download
                                  className="inline-flex items-center space-x-1.5 text-xs text-brand-600 hover:text-brand-500 font-bold bg-brand-50/50 dark:bg-brand-950/10 border border-brand-200/50 dark:border-brand-900/50 px-3.5 py-2 rounded-xl transition-all"
                                >
                                  <FileText size={14} />
                                  <span>{att.file_name}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">({(att.file_size / (1024*1024)).toFixed(2)} MB)</span>
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Report Review Form */}
                    {isReport && (
                      <div className="mt-5 border-t border-slate-200/80 dark:border-slate-800/85 pt-4 space-y-4">
                        {/* Inline Review comment input */}
                        <div className="flex flex-col md:flex-row gap-3 items-center">
                          <input
                            type="text"
                            placeholder="Add evaluation comments/feedback here..."
                            value={commentInputs[card.ref_id] || ''}
                            onChange={(e) => handleCommentChange(card.ref_id, e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl placeholder-slate-400 focus:outline-none focus:border-brand-500 dark:text-white"
                          />
                          <div className="flex space-x-2 w-full md:w-auto shrink-0">
                            <button
                              onClick={() => handleOpenChat(card.ref_id)}
                              className="flex-1 md:flex-none text-xs px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-200 font-bold rounded-full active:translate-y-[1px] transition-all flex items-center justify-center space-x-1"
                            >
                              <MessageSquare size={14} className="text-brand-500" />
                              <span>Discussion Chat</span>
                            </button>
                            <button
                              onClick={() => handleReviewReport(card.ref_id, 'approved')}
                              className="flex-1 md:flex-none text-xs px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full shadow shadow-emerald-600/10 active:translate-y-[1px] transition-all flex items-center justify-center space-x-1"
                            >
                              <CheckCircle size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReviewReport(card.ref_id, 'rejected')}
                              className="flex-1 md:flex-none text-xs px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full shadow shadow-red-600/10 active:translate-y-[1px] transition-all flex items-center justify-center space-x-1"
                            >
                              <XCircle size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 📹 MEDIA PREVIEW MODAL */}
      {mediaPreview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative pop-bounce">
            <button 
              onClick={() => setMediaPreview(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-850 p-1.5 rounded-full"
            >
              <X size={16} />
            </button>
            <div className="p-6">
              <h3 className="text-sm font-bold text-white mb-4 truncate">{mediaPreview.name}</h3>
              <div className="flex items-center justify-center bg-slate-950 rounded-2xl overflow-hidden min-h-[300px] border border-slate-850">
                {mediaPreview.type === 'image' && (
                  <img src={mediaPreview.url} alt="Preview" className="max-h-[50vh] object-contain" />
                )}
                {mediaPreview.type === 'video' && (
                  <video src={mediaPreview.url} controls className="w-full max-h-[50vh]" autoPlay />
                )}
                {mediaPreview.type === 'audio' && (
                  <audio src={mediaPreview.url} controls className="w-4/5 my-12" autoPlay />
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <a 
                  href={mediaPreview.url} 
                  download 
                  className="text-xs px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg flex items-center space-x-1.5 font-semibold"
                >
                  <FileDown size={14} />
                  <span>Download File</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 💬 REPORT CHAT MODAL OVERLAY */}
      {activeChatReport && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col h-[550px] pop-bounce">
            <button 
              onClick={() => setActiveChatReport(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full"
            >
              <X size={16} />
            </button>
            <div className="p-6 pb-3 border-b border-slate-150 dark:border-slate-800 pr-12">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">Report Chat Thread</h3>
              <p className="text-[10px] text-slate-450 mt-1 truncate">
                Submission Date: {activeChatReport.date} • Task: "{activeChatReport.task_title}"
              </p>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-4 select-text">
              {chatComments.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-12">No discussion messages. Type a comment reply below to send.</p>
              ) : (
                chatComments.map(cmt => {
                  const isMe = cmt.reviewer_id === user?.id;
                  return (
                    <div key={cmt.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9px] text-slate-400 mb-0.5 px-1">{cmt.reviewer_name || 'System'}</span>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-xs shadow-sm leading-relaxed ${
                        isMe 
                          ? 'bg-brand-600 text-white rounded-tr-none' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/50 dark:border-slate-800/50'
                      }`}>
                        <p>{cmt.comments}</p>
                      </div>
                      <span className="text-[8px] text-slate-400/80 mt-1 px-1">
                        {new Date(cmt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendAdminReply} className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex space-x-2">
              <input
                type="text"
                value={adminReplyText}
                onChange={(e) => setAdminReplyText(e.target.value)}
                placeholder="Type feedback reply message..."
                className="flex-1 text-xs px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
              />
              <button
                type="submit"
                className="p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-sm flex items-center justify-center"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
