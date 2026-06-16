import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { 
  Search, User, MapPin, Mail, Phone, Calendar, BookOpen, 
  Briefcase, Code, PlusCircle, CheckCircle2, AlertTriangle, Send,
  FileText, Image as ImageIcon, Video, Music, Paperclip, ArrowLeft, Shield, Sparkles, RefreshCw, AlertCircle, Clock, Camera, X
} from 'lucide-react';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, BarChart, Bar 
} from 'recharts';


const EmployeeProfiles = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance');
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [weeklySummaryLoading, setWeeklySummaryLoading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Form state
  const [reportForm, setReportForm] = useState({
    date: new Date().toISOString().split('T')[0],
    task_title: '',
    description: '',
    hours_worked: 8,
    technologies_used: '',
    challenges_faced: '',
    learning_outcomes: '',
    tomorrow_plan: '',
    additional_notes: ''
  });

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees/');
      setEmployees(res.data);
    } catch (err) {
      showToast('Failed to load employees.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (userId) => {
    setReportsLoading(true);
    try {
      const res = await api.get(`/reports/?intern_id=${userId}`);
      setReports(res.data);
    } catch (err) {
      console.error(err);
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchAttendanceRecords = async (userId) => {
    setIsAttendanceLoading(true);
    try {
      const res = await api.get('/attendance/', { params: { intern_id: userId } });
      setAttendanceRecords(res.data);
    } catch (err) {
      console.error('Failed to load attendance records', err);
      setAttendanceRecords([]);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const fetchWeeklySummary = async (userId) => {
    setWeeklySummary(null);
    try {
      const res = await api.get(`/analytics/weekly-summary/${userId}`);
      setWeeklySummary(res.data);
    } catch (err) {
      console.log('No cached weekly summary found', err);
      setWeeklySummary(null);
    }
  };

  const generateWeeklySummary = async (userId) => {
    setWeeklySummaryLoading(true);
    try {
      const res = await api.post(`/analytics/weekly-summary/${userId}/generate`);
      setWeeklySummary(res.data);
      showToast('Weekly summary generated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || 'Failed to generate weekly summary.', 'error');
    } finally {
      setWeeklySummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const getProfilePhotoUrl = (photoName) => {
    if (!photoName) return '';
    if (photoName.startsWith('http://') || photoName.startsWith('https://')) return photoName;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const BASE_URL = API_URL.replace('/api/v1', '');
    return `${BASE_URL}/static/uploads/${photoName}`;
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload an image (JPG, PNG, WEBP, or GIF)', 'error');
      return;
    }
    
    const formData = new FormData();
    formData.append('user_id', selectedEmployee.user_id);
    formData.append('file', file);
    
    try {
      const res = await api.post('/media/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const newPhoto = res.data.profile_photo;
      setSelectedEmployee(prev => ({ ...prev, profile_photo: newPhoto }));
      setEmployees(prev => prev.map(e => e.id === selectedEmployee.id ? { ...e, profile_photo: newPhoto } : e));
      showToast('Profile photo updated successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to upload profile photo.', 'error');
    }
  };

  const handleGenerateReport = async () => {
    try {
      showToast('Generating report...', 'info');
      const response = await api.get(`/reports/user/${selectedEmployee.user_id}/download-pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Accomplishment_Report_${selectedEmployee.full_name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Report downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate report.', 'error');
    }
  };

  useEffect(() => {
    if (selectedEmployee) {
      fetchReports(selectedEmployee.user_id);
      fetchAttendanceRecords(selectedEmployee.user_id);
      fetchWeeklySummary(selectedEmployee.user_id);
      setActiveTab('attendance');
    }
  }, [selectedEmployee]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setReportForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePostActivity = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSubmitting(true);
    try {
      // 1. Submit text report data
      const res = await api.post('/reports/', {
        ...reportForm,
        user_id: selectedEmployee.user_id
      });
      const reportId = res.data.id;

      // 2. Upload files if selected
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('report_id', reportId);
          formData.append('file', file);
          try {
            await api.post('/media/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
          } catch (uploadErr) {
            showToast(`Failed to upload attachment '${file.name}': ${uploadErr.response?.data?.detail || 'Size too large or invalid format'}`, 'warning');
          }
        }
      }

      showToast('Daily activity logged successfully!', 'success');
      
      // Reset form and files
      setReportForm({
        date: new Date().toISOString().split('T')[0],
        task_title: '',
        description: '',
        hours_worked: 8,
        technologies_used: '',
        challenges_faced: '',
        learning_outcomes: '',
        tomorrow_plan: '',
        additional_notes: ''
      });
      setSelectedFiles([]);
      
      // Refresh reports history
      fetchReports(selectedEmployee.user_id);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to submit daily report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
    (emp.designation && emp.designation.toLowerCase().includes(searchText.toLowerCase())) ||
    (emp.department && emp.department.toLowerCase().includes(searchText.toLowerCase())) ||
    (emp.employee_id && emp.employee_id.toLowerCase().includes(searchText.toLowerCase()))
  );

  // --- SCREEN 1: LIST DIRECTORY VIEW ---
  if (!selectedEmployee) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Search Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Employees Directory</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Explore full-time employees and manage their biodata, assignments, and daily log posts.</p>
          </div>
          <div className="relative md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by name, designation, ID or department..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-white/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className="glass-card overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/40 dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/80 text-xs font-bold text-slate-500">
                  <th className="px-6 py-4">Employee ID</th>
                  <th className="px-6 py-4">Name / Contact</th>
                  <th className="px-6 py-4">Designation / Department</th>
                  <th className="px-6 py-4">Current Project</th>
                  <th className="px-6 py-4">Joining Date</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-500">No employee records found.</td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-6 py-4 font-mono font-bold text-purple-600 dark:text-purple-400">{emp.employee_id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {emp.profile_photo ? (
                            <img 
                              src={getProfilePhotoUrl(emp.profile_photo)} 
                              alt={emp.full_name} 
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-purple-500/10 dark:bg-purple-550/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm border border-purple-500/20">
                              {emp.full_name[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white">{emp.full_name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{emp.mobile_number || 'No phone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-850 dark:text-white">{emp.designation}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Dept: {emp.department}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium truncate max-w-xs">{emp.project_name || 'Unassigned'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium">{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                          (emp.employment_status || '').toLowerCase() === 'active'
                            ? 'status-badge-active'
                            : 'status-badge-inactive'
                        }`}>
                          {emp.employment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="text-xs px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-md transition-all active:translate-y-[0.5px]"
                        >
                          View Activities & Submit Report
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- SCREEN 2: PROFILE DETAILS & LOG SUBMISSION SCREEN ---
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedEmployee(null)}
          className="flex items-center space-x-2 text-xs font-bold text-slate-655 hover:text-slate-800 dark:text-slate-350 dark:hover:text-white bg-white/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={14} />
          <span>Back to Employees Directory</span>
        </button>

        <button
          onClick={handleGenerateReport}
          className="flex items-center space-x-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl shadow-md transition-all active:translate-y-[0.5px] hover:scale-105 active:scale-95"
        >
          <FileText size={14} />
          <span>Generate Report</span>
        </button>
      </div>

      {/* Identity Banner */}
      <div className="relative overflow-hidden welcome-hero-banner bg-brand-600 dark:bg-brand-900 text-white rounded-3xl p-6 shadow-xl">
        <div className="relative z-10 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-lg md:text-xl font-black">{selectedEmployee.full_name}</h2>
            <p className="text-xs text-purple-100 font-semibold mt-1">
              {selectedEmployee.designation} • Department: <span className="text-yellow-350 font-bold">{selectedEmployee.department}</span>
            </p>
            <p className="text-[10px] text-purple-200 mt-1">
              Employee ID: <span className="font-mono font-bold text-white">{selectedEmployee.employee_id}</span>
            </p>
            <span className={`inline-block text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full mt-2 ${
              (selectedEmployee.employment_status || '').toLowerCase() === 'active'
                ? 'status-badge-active'
                : 'status-badge-inactive'
            }`}>
              {selectedEmployee.employment_status}
            </span>
          </div>
          <div className="relative group w-32 h-32 shrink-0 mx-auto sm:mx-0">
            {selectedEmployee.profile_photo ? (
              <img 
                src={getProfilePhotoUrl(selectedEmployee.profile_photo)} 
                alt={selectedEmployee.full_name} 
                onClick={() => setPreviewPhoto(getProfilePhotoUrl(selectedEmployee.profile_photo))}
                className="w-32 h-32 rounded-full object-cover border-2 border-white/25 shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform"
                onError={(e) => { e.target.src = ''; }}
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center font-extrabold text-3xl border-2 border-white/25 text-white shadow-lg">
                {selectedEmployee.full_name[0].toUpperCase()}
              </div>
            )}
            
            {/* Show edit/upload overlay if user is admin or viewing own profile */}
            {user && (user.role === 'admin' || user.id === selectedEmployee.user_id) && (
              <label className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[10px] font-bold">
                <Camera size={18} className="mb-1" />
                <span>Change Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details (Bio-Data & Project Assignment) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bio Data Card */}
        <div className="glass-card p-6 hover-lift">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-purple-500/10 flex items-center space-x-1.5">
            <Shield size={14} className="text-violet-500" />
            <span>Employee Bio Data</span>
          </h4>
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-100/50 dark:border-slate-800/50">
              <span className="text-slate-700 dark:text-slate-200 font-semibold">Department</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-right">{selectedEmployee.department || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100/50 dark:border-slate-800/50">
              <span className="text-slate-700 dark:text-slate-200 font-semibold">Designation</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-right">{selectedEmployee.designation || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100/50 dark:border-slate-800/50">
              <span className="text-slate-700 dark:text-slate-200 font-semibold">Mobile Number</span>
              <span className="font-extrabold text-slate-900 dark:text-white flex items-center justify-end space-x-1">
                <Phone size={12} className="text-brand-500" />
                <span>{selectedEmployee.mobile_number || 'N/A'}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100/50 dark:border-slate-800/50">
              <span className="text-slate-700 dark:text-slate-200 font-semibold">Gender</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-right capitalize">{selectedEmployee.gender || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-700 dark:text-slate-200 font-semibold">Joining Date</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {selectedEmployee.joining_date ? new Date(selectedEmployee.joining_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Current Project Card */}
        <div className="glass-card p-6 hover-lift">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-purple-500/10 flex items-center space-x-1.5">
            <Briefcase size={14} className="text-pink-500" />
            <span>Current Project Assignment</span>
          </h4>
          <div className="space-y-3.5 text-xs">
            <div className="py-1 border-b border-slate-100/50 dark:border-slate-800/50">
              <p className="text-slate-700 dark:text-slate-200 font-semibold mb-1">Project Assigned</p>
              <span className="font-extrabold text-slate-900 dark:text-white capitalize">{selectedEmployee.project_name || 'No Project Assigned'}</span>
            </div>
            {selectedEmployee.project_description && (
              <div className="py-1 border-b border-slate-100/50 dark:border-slate-800/50">
                <p className="text-slate-700 dark:text-slate-200 font-semibold mb-1">Project Description</p>
                <p className="text-slate-900 dark:text-white italic text-[11px] leading-relaxed">
                  "{selectedEmployee.project_description}"
                </p>
              </div>
            )}
            <div className="py-1">
              <p className="text-slate-700 dark:text-slate-200 font-semibold mb-1.5">Assigned Tech Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedEmployee.programming_languages && selectedEmployee.programming_languages.trim() ? selectedEmployee.programming_languages.split(',').map((l, i) => (
                  <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 capitalize">{l.trim()}</span>
                )) : null}
                {selectedEmployee.frameworks && selectedEmployee.frameworks.trim() ? selectedEmployee.frameworks.split(',').map((f, i) => (
                  <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded bg-pink-500/10 text-pink-700 dark:text-pink-300 capitalize">{f.trim()}</span>
                )) : null}
                {(!selectedEmployee.programming_languages || !selectedEmployee.programming_languages.trim()) && (!selectedEmployee.frameworks || !selectedEmployee.frameworks.trim()) && <span className="text-slate-700 dark:text-slate-300">N/A</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Sections Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 mb-6">

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-1 ${
            activeTab === 'attendance'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Attendance Ledger Grid
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-1 ${
            activeTab === 'analytics'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          AI Summary & Analytics
        </button>
      </div>

      {/* Attendance Ledger Tab */}
      {activeTab === 'attendance' && (
        <AttendanceCalendar 
          attendanceRecords={attendanceRecords}
          startDate={selectedEmployee.joining_date}
          isLoading={isAttendanceLoading}
        />
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* AI Weekly Summary Card */}
          <div className="glass-card p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-150 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">AI-Generated Weekly Performance Summary</h4>
                  <p className="text-[10px] text-slate-550 dark:text-slate-400">Contextual evaluation of daily reports and punctuality trends</p>
                </div>
              </div>
              <button
                onClick={() => generateWeeklySummary(selectedEmployee.user_id)}
                disabled={weeklySummaryLoading}
                className="flex items-center space-x-1.5 text-xs font-bold px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl shadow-md transition-all active:translate-y-[0.5px] btn-animate self-start"
              >
                <RefreshCw size={14} className={weeklySummaryLoading ? 'animate-spin' : ''} />
                <span>{weeklySummaryLoading ? 'Generating Summary...' : 'Generate/Refresh AI Summary'}</span>
              </button>
            </div>

            {weeklySummaryLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                <p className="text-xs text-slate-555 dark:text-slate-400 animate-pulse">Consulting AI Model for contextual performance analysis...</p>
              </div>
            ) : weeklySummary ? (
              <div className="pt-5 space-y-5 select-text">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Summary Text Panel */}
                  <div className="md:col-span-2 space-y-3.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-455 block mb-1">Key Achievements & Progress</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/50 p-4 rounded-xl">
                        {weeklySummary.summary_text}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-455 block mb-1">Weekly Blockers / Technical Challenges</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/50 p-4 rounded-xl">
                        {weeklySummary.blockers || "None reported."}
                      </p>
                    </div>
                  </div>

                  {/* Summary Sidebar Status Indicators */}
                  <div className="space-y-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-2xl h-fit">
                    <div className="pb-3.5 border-b border-slate-200/50 dark:border-slate-850/50 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-455 block">Sentiment Analysis</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white capitalize">{weeklySummary.sentiment || 'neutral'}</span>
                      </div>
                      <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-extrabold uppercase ${
                        weeklySummary.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-500' :
                        weeklySummary.sentiment === 'stressed' ? 'bg-yellow-500/10 text-yellow-500' :
                        weeklySummary.sentiment === 'frustrated' ? 'bg-red-500/10 text-red-500' :
                        'bg-slate-200/50 dark:bg-slate-800 text-slate-650'
                      }`}>
                        {weeklySummary.sentiment || 'neutral'}
                      </span>
                    </div>

                    {weeklySummary.blocker_detected ? (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-305 text-xs rounded-xl p-3.5 flex items-start space-x-2.5">
                        <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={16} />
                        <div>
                          <p className="font-bold">Active Blocker Detected</p>
                          <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5">Manager intervention or tech support is recommended to resolve this blocker.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-305 text-xs rounded-xl p-3.5 flex items-start space-x-2.5">
                        <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                        <div>
                          <p className="font-bold">No Active Blockers</p>
                          <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5">The candidate is progressing without critical bottlenecks.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center space-y-2">
                <Sparkles size={28} className="text-purple-500 opacity-60 animate-pulse" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-350">No weekly AI analysis cached</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[280px]">
                  Click the generate button above to compile this week's reports, working hours, and check-in logs into an AI review.
                </p>
              </div>
            )}
          </div>

          {/* GitHub-Style Contribution Heatmap */}
          <div className="glass-card p-6">
            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-1.5">
              <Calendar size={15} className="text-emerald-500" />
              <span>180-Day Attendance & Activity Heatmap</span>
            </h4>
            
            <div className="flex flex-col space-y-3">
              <p className="text-[10px] text-slate-550 dark:text-slate-400">Visualizes daily hours worked and attendance records (green density scale represents logged workload intensity)</p>
              
              <div className="overflow-x-auto pb-2 scrollbar-thin">
                <div className="flex gap-1 min-w-[700px] select-none">
                  {(() => {
                    const heatmapData = (() => {
                      const data = {};
                      for (let i = 182; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        const dateStr = d.toISOString().split('T')[0];
                        data[dateStr] = { date: dateStr, hours: 0, present: false };
                      }
                      reports.forEach(r => {
                        if (data[r.date]) {
                          data[r.date].hours += r.hours_worked;
                        }
                      });
                      attendanceRecords.forEach(a => {
                        if (data[a.date]) {
                          data[a.date].present = a.status === 'present' || a.status === 'late';
                        }
                      });
                      return Object.values(data);
                    })();

                    const weeks = [];
                    for (let i = 0; i < heatmapData.length; i += 7) {
                      weeks.push(heatmapData.slice(i, i + 7));
                    }

                    return weeks.map((week, wIdx) => (
                      <div className="flex flex-col gap-1" key={wIdx}>
                        {week.map((day, dIdx) => {
                          const dateObj = new Date(day.date + "T00:00:00");
                          const label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                          let colorClass = "bg-slate-100 dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/5";
                          
                          if (day.hours > 8) {
                            colorClass = "bg-emerald-600 border border-emerald-700 text-white";
                          } else if (day.hours > 4) {
                            colorClass = "bg-emerald-500/70 border border-emerald-600/50 text-white";
                          } else if (day.hours > 0) {
                            colorClass = "bg-emerald-500/35 border border-emerald-500/40";
                          } else if (day.present) {
                            colorClass = "bg-emerald-500/10 border border-emerald-500/15";
                          }

                          return (
                            <div 
                              key={day.date}
                              title={`${label}: ${day.hours} hrs logged ${day.present ? '(Present)' : '(No check-in)'}`}
                              className={`w-3.5 h-3.5 rounded-[3px] transition-all hover:scale-125 hover:ring-2 hover:ring-brand-500 cursor-pointer ${colorClass}`}
                            />
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center justify-end space-x-1.5 text-[9px] text-slate-455 pt-2 font-bold uppercase tracking-wide">
                <span>Less</span>
                <div className="w-3 h-3 rounded-[2px] bg-slate-100 dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/5" />
                <div className="w-3 h-3 rounded-[2px] bg-emerald-500/10 border border-emerald-500/15" />
                <div className="w-3 h-3 rounded-[2px] bg-emerald-500/35 border border-emerald-500/40" />
                <div className="w-3 h-3 rounded-[2px] bg-emerald-500/70 border border-emerald-600/50" />
                <div className="w-3 h-3 rounded-[2px] bg-emerald-600 border border-emerald-700" />
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hours worked Area Chart */}
            <div className="glass-card p-6">
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-1.5">
                <Briefcase size={15} className="text-violet-500" />
                <span>Workload Trend (Last 15 Log Entries)</span>
              </h4>
              <div className="h-60 w-full text-xs">
                {(() => {
                  const hoursTrend = reports.slice(-15).map(r => ({
                    date: new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    hours: r.hours_worked
                  }));

                  if (hoursTrend.length === 0) {
                    return <p className="text-slate-500 text-center py-20 font-semibold">No report data available to plot chart.</p>;
                  }

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hoursTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorHoursEmp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/40" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} dy={10} stroke="#94a3b8" />
                        <YAxis tickLine={false} axisLine={false} dx={-5} stroke="#94a3b8" domain={[0, 12]} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.95)' }} />
                        <Area type="monotone" dataKey="hours" name="Hours Worked" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHoursEmp)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

            {/* Arrival times Bar Chart */}
            <div className="glass-card p-6">
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-1.5">
                <Clock size={15} className="text-pink-500" />
                <span>Punctuality Arrival Time Distribution</span>
              </h4>
              <div className="h-60 w-full text-xs">
                {(() => {
                  const arrivalData = (() => {
                    const bins = {
                      'Before 9 AM': 0,
                      '9:00-9:30 AM': 0,
                      '9:30-10:00 AM': 0,
                      'After 10 AM': 0
                    };
                    attendanceRecords.forEach(a => {
                      if (a.check_in_time) {
                        const checkInDate = new Date(a.check_in_time);
                        const hrs = checkInDate.getHours();
                        const mins = checkInDate.getMinutes();
                        const timeVal = hrs * 60 + mins;
                        if (timeVal < 9 * 60) {
                          bins['Before 9 AM']++;
                        } else if (timeVal <= 9 * 60 + 30) {
                          bins['9:00-9:30 AM']++;
                        } else if (timeVal <= 10 * 60) {
                          bins['9:30-10:00 AM']++;
                        } else {
                          bins['After 10 AM']++;
                        }
                      }
                    });
                    return Object.keys(bins).map(key => ({ name: key, count: bins[key] }));
                  })();

                  const totalCheckins = attendanceRecords.filter(a => a.check_in_time).length;
                  if (totalCheckins === 0) {
                    return <p className="text-slate-550 text-center py-20 font-semibold">No arrival records available to plot chart.</p>;
                  }

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={arrivalData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/40" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} dy={10} stroke="#94a3b8" />
                        <YAxis tickLine={false} axisLine={false} dx={-5} stroke="#94a3b8" allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.95)' }} cursor={{ fill: 'rgba(241,245,249,0.5)' }} />
                        <Bar dataKey="count" name="Check-in Count" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={35} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Photo Preview Modal Lightbox */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md cursor-zoom-out p-4 page-fade-in"
        >
          <div 
            className="relative max-w-2xl w-full bg-white/5 border border-white/10 p-2 rounded-3xl pop-bounce shadow-2xl overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md"
            >
              <X size={18} />
            </button>
            <img 
              src={previewPhoto} 
              alt="Profile Full Preview" 
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl bg-slate-950 p-2"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfiles;
