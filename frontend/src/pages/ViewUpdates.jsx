import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Check, X, FileText, Calendar, Filter, Search,
  MessageSquare, FileDown, Eye, Image as ImageIcon, Volume2, Video,
  Clock, AlertCircle, ChevronDown, User, CheckCircle2, XCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const getProfilePhotoUrl = (photoName) => {
  if (!photoName) return '';
  if (photoName.startsWith('http://') || photoName.startsWith('https://')) return photoName;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const BASE_URL = API_URL.replace('/api/v1', '');
  return `${BASE_URL}/static/uploads/${photoName}`;
};

const ViewUpdates = () => {
  const { showToast } = useToast();
  
  // Lists
  const [reports, setReports] = useState([]);
  const [interns, setInterns] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [textLoading, setTextLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState({});

  // Filter states
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'intern', 'employee'
  const [selectedCandidateId, setSelectedCandidateId] = useState('all'); // 'all' or user_id
  const [searchQuery, setSearchQuery] = useState('');
  
  // Review comments mapping
  const [reviewComments, setReviewComments] = useState({});
  
  // Media Preview state
  const [previewFile, setPreviewFile] = useState(null);
  const [textContent, setTextContent] = useState('');
  const token = localStorage.getItem('access_token');

  // Load all candidates and reports
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch interns & employees
      const [internsRes, empsRes, reportsRes] = await Promise.all([
        api.get('/interns/'),
        api.get('/employees/'),
        api.get('/reports/')
      ]);
      setInterns(internsRes.data);
      setEmployees(empsRes.data);
      setReports(reportsRes.data);
    } catch (err) {
      console.error('Failed to load initial workspace updates data', err);
      showToast('Failed to load daily updates list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch report details if previewing text file
  useEffect(() => {
    if (previewFile && previewFile.file_type === 'document' && !previewFile.file_name.endsWith('.pdf')) {
      const fetchText = async () => {
        setTextLoading(true);
        try {
          const fileUrl = getFileUrl(previewFile.id);
          const response = await fetch(fileUrl);
          const text = await response.text();
          setTextContent(text);
        } catch (err) {
          setTextContent('Failed to load text content.');
        } finally {
          setTextLoading(false);
        }
      };
      fetchText();
    } else {
      setTextContent('');
    }
  }, [previewFile]);

  // Handle Review Submission
  const handleReview = async (reportId, status) => {
    const comments = reviewComments[reportId] || '';
    setSubmittingReview(prev => ({ ...prev, [reportId]: true }));
    try {
      await api.post(`/reports/${reportId}/review`, { status, comments });
      setReviewComments(prev => ({ ...prev, [reportId]: '' }));
      showToast(`Report marked as ${status.toUpperCase()} successfully.`, 'success');
      
      // Refresh reports list
      const reportsRes = await api.get('/reports/');
      setReports(reportsRes.data);
    } catch (err) {
      showToast('Failed to submit report review.', 'error');
    } finally {
      setSubmittingReview(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const handleCommentChange = (reportId, val) => {
    setReviewComments(prev => ({ ...prev, [reportId]: val }));
  };

  const getFileUrl = (attachmentId) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    return `${API_URL}/media/download/${attachmentId}?token=${token}`;
  };

  // Helper sets for role-based classification
  const internUserIds = new Set(interns.map(i => i.user_id));
  const employeeUserIds = new Set(employees.map(e => e.user_id));

  // Filtered lists of candidates for dropdown
  const getFilteredCandidates = () => {
    if (filterRole === 'intern') {
      return interns.map(i => ({ user_id: i.user_id, full_name: i.full_name, label: `[Intern] ${i.full_name}`, profile_photo: i.profile_photo }));
    }
    if (filterRole === 'employee') {
      return employees.map(e => ({ user_id: e.user_id, full_name: e.full_name, label: `[Employee] ${e.full_name}`, profile_photo: e.profile_photo }));
    }
    const list = [
      ...interns.map(i => ({ user_id: i.user_id, full_name: i.full_name, label: `[Intern] ${i.full_name}`, profile_photo: i.profile_photo })),
      ...employees.map(e => ({ user_id: e.user_id, full_name: e.full_name, label: `[Employee] ${e.full_name}`, profile_photo: e.profile_photo }))
    ];
    return list.sort((a, b) => a.full_name.localeCompare(b.full_name));
  };

  // Handle role tab switches (resets selected candidate if not present in new list)
  const handleRoleTabChange = (role) => {
    setFilterRole(role);
    setSelectedCandidateId('all');
  };

  // Filtered reports calculation
  const filteredReports = reports.filter(r => {
    // 1. Role Filter
    if (filterRole === 'intern' && !internUserIds.has(r.user_id)) return false;
    if (filterRole === 'employee' && !employeeUserIds.has(r.user_id)) return false;

    // 2. Candidate Filter
    if (selectedCandidateId !== 'all' && r.user_id !== Number(selectedCandidateId)) return false;

    // 3. Keyword Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = r.task_title?.toLowerCase().includes(query);
      const matchDesc = r.description?.toLowerCase().includes(query);
      const matchName = r.user_name?.toLowerCase().includes(query);
      const matchTech = r.technologies_used?.toLowerCase().includes(query);
      if (!matchTitle && !matchDesc && !matchName && !matchTech) return false;
    }

    return true;
  });

  // Build a fast lookup map: user_id -> profile_photo
  const userPhotoMap = {};
  [...interns, ...employees].forEach(p => {
    if (p.user_id && p.profile_photo) {
      userPhotoMap[p.user_id] = p.profile_photo;
    }
  });

  return (
    <div className="space-y-6">
      
      {/* Search and Filter Panel */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Filter Daily Work Updates</h2>
        
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center flex-1">
            
            {/* Candidate Selector Dropdown */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <User size={16} />
              </span>
              <select
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-3 bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white appearance-none font-semibold cursor-pointer"
              >
                <option value="all">All Candidates</option>
                {getFilteredCandidates().map(c => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                <ChevronDown size={14} />
              </span>
            </div>

            {/* Keyword Search Input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, descriptions, or tech..."
                className="w-full text-xs pl-9 pr-4 py-3 bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white font-medium"
              />
            </div>
          </div>

          {/* Segmented Tab Control for Role Selection - Spaced and Aligned Right */}
          <div className="flex gap-3 w-full lg:w-auto justify-end self-stretch lg:self-auto">
            <button
              onClick={() => handleRoleTabChange('all')}
              className={`flex-1 lg:flex-none text-xs px-5 py-2.5 rounded-xl font-bold transition-all border ${
                filterRole === 'all' 
                  ? 'bg-brand-600 dark:bg-brand-500 text-white border-transparent shadow-sm' 
                  : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => handleRoleTabChange('intern')}
              className={`flex-1 lg:flex-none text-xs px-5 py-2.5 rounded-xl font-bold transition-all border ${
                filterRole === 'intern' 
                  ? 'bg-brand-600 dark:bg-brand-500 text-white border-transparent shadow-sm' 
                  : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              Interns
            </button>
            <button
              onClick={() => handleRoleTabChange('employee')}
              className={`flex-1 lg:flex-none text-xs px-5 py-2.5 rounded-xl font-bold transition-all border ${
                filterRole === 'employee' 
                  ? 'bg-brand-600 dark:bg-brand-500 text-white border-transparent shadow-sm' 
                  : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              Employees
            </button>
          </div>
        </div>
      </div>

      {/* Reports Feed Timeline */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center glass-card p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-500 dark:text-slate-400">
            <AlertCircle size={32} className="mx-auto text-slate-400 mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">No updates matching current filters</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try modifying your role filter, selected candidate, or search criteria.</p>
          </div>
        ) : (
          filteredReports.map((report, index) => (
            <div key={report.id} className={`glass-card p-6 border-l-4 border-brand-500 shadow-sm space-y-4 animate-fade-in animate-slide-up hover-lift stagger-${(index % 5) + 1}`}>
              
              {/* Report Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-white/5">
              <div className="flex items-center space-x-3">
                  {userPhotoMap[report.user_id] ? (
                    <img
                      src={getProfilePhotoUrl(userPhotoMap[report.user_id])}
                      alt={report.user_name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/25 flex items-center justify-center font-bold text-sm shrink-0">
                      {(report.user_name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      {report.user_name || 'Anonymous User'}
                    </h3>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        report.user_role === 'employee' 
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {report.user_role === 'employee' ? 'Employee' : 'Intern'}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                        <Calendar size={11} />
                        <span>{report.date}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right sm:mr-3">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Hours Worked</p>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center justify-end space-x-1.5 mt-0.5">
                      <Clock size={14} className="text-slate-500" />
                      <span>{report.hours_worked} hrs</span>
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold capitalize flex items-center space-x-1 ${
                    report.status === 'approved' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                    report.status === 'rejected' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                    'bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse'
                  }`}>
                    {report.status === 'approved' && <CheckCircle2 size={12} />}
                    {report.status === 'rejected' && <XCircle size={12} />}
                    <span>{report.status}</span>
                  </div>
                </div>
              </div>

              {/* Task Details */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-450">Task Focus</h4>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-1 leading-snug">
                    {report.task_title}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-450">Accomplished details</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed select-text font-medium bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
                    {report.description}
                  </p>
                </div>

                {/* Tech Stack used */}
                {report.technologies_used && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-450 mb-1.5">Stack Details</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {report.technologies_used.split(',').map((tech, i) => (
                        <span key={i} className="text-[10px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-slate-650 dark:text-slate-350 font-bold border border-slate-200/40 dark:border-white/5">
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tomorrow plan / blockers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {report.tomorrow_plan && (
                    <div className="p-3 bg-brand-50/10 dark:bg-brand-950/5 border border-brand-500/10 rounded-xl">
                      <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider">Next Milestones</span>
                      <p className="text-xs text-slate-700 dark:text-slate-350 mt-1 whitespace-pre-wrap leading-relaxed font-semibold">
                        {report.tomorrow_plan}
                      </p>
                    </div>
                  )}
                  {report.challenges_faced && (
                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                      <span className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">Blockers / Challenges</span>
                      <p className="text-xs text-slate-750 dark:text-red-300/90 mt-1 whitespace-pre-wrap leading-relaxed font-semibold">
                        {report.challenges_faced}
                      </p>
                    </div>
                  )}
                </div>

                {/* Uploaded Evidence Files */}
                {report.attachments && report.attachments.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-450 mb-2 flex items-center space-x-1.5">
                      <FileText size={14} />
                      <span>Work Evidence & Proofs ({report.attachments.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {report.attachments.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-2.5 bg-slate-100/50 dark:bg-slate-950 border border-slate-200/80 dark:border-white/5 rounded-xl shadow-inner group">
                          <div className="flex items-center space-x-2.5 overflow-hidden">
                            <div className="p-2 bg-brand-500/10 rounded-lg text-brand-500 group-hover:scale-105 transition-transform shrink-0">
                              {file.file_type === 'image' && <ImageIcon size={14} />}
                              {file.file_type === 'video' && <Video size={14} />}
                              {file.file_type === 'audio' && <Volume2 size={14} />}
                              {file.file_type === 'document' && <FileText size={14} />}
                            </div>
                            <div className="overflow-hidden text-left">
                              <p className="text-[10px] font-bold text-slate-800 dark:text-slate-250 truncate" title={file.file_name}>
                                {file.file_name}
                              </p>
                              <p className="text-[8px] text-slate-500 font-medium">
                                {(file.file_size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex space-x-1 shrink-0">
                            {/* If previewable, show Eye Icon */}
                            {['image', 'audio', 'video', 'document'].includes(file.file_type) && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile(file)}
                                className="p-1 text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all"
                                title="Preview File"
                              >
                                <Eye size={12} />
                              </button>
                            )}
                            <a
                              href={getFileUrl(file.id)}
                              download
                              className="p-1 text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all"
                              title="Download File"
                            >
                              <FileDown size={12} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Feedbacks comments history */}
              {report.feedbacks && report.feedbacks.length > 0 && (
                <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 space-y-2 text-left">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1">
                    <MessageSquare size={12} />
                    <span>Reviewer Comments History</span>
                  </span>
                  <div className="space-y-2">
                    {report.feedbacks.map((f) => (
                      <div key={f.id} className="p-3 bg-slate-100/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800 rounded-xl text-xs">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          <span>{f.reviewer_name || 'Admin'}</span>
                          <span className="font-normal text-slate-400">{new Date(f.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-1 text-slate-700 dark:text-slate-350 font-semibold">{f.comments}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Review Action Center */}
              {report.status === 'pending' && (
                <div className="pt-3 border-t border-slate-200/50 dark:border-white/5 text-left space-y-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evaluate Progress Report</span>
                  
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                      <textarea
                        value={reviewComments[report.id] || ''}
                        onChange={(e) => handleCommentChange(report.id, e.target.value)}
                        placeholder="Add review feedback comments..."
                        className="w-full text-xs p-3 bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white font-medium resize-none h-11 focus:h-20 transition-all"
                      />
                    </div>
                    
                    <div className="flex space-x-2 shrink-0 self-start md:self-end">
                      <button
                        onClick={() => handleReview(report.id, 'rejected')}
                        disabled={submittingReview[report.id]}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 active:translate-y-[0.5px] transition-all btn-animate btn-sweep"
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleReview(report.id, 'approved')}
                        disabled={submittingReview[report.id]}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 active:translate-y-[0.5px] transition-all btn-animate btn-sweep"
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MEDIA PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative flex flex-col h-[80vh] pop-bounce">
            <button 
              type="button"
              onClick={() => setPreviewFile(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full z-10 btn-animate"
            >
              <X size={16} />
            </button>
            
            <div className="p-6 pb-3 border-b border-slate-200 dark:border-slate-800 pr-12 text-left">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={previewFile.file_name}>
                Previewing: {previewFile.file_name}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Type: {previewFile.file_type.toUpperCase()} • Size: {(previewFile.file_size / (1024*1024)).toFixed(2)} MB
              </p>
            </div>

            <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center bg-slate-50/50 dark:bg-slate-950/10 min-h-0">
              {previewFile.file_type === 'image' && (
                <img 
                  src={getFileUrl(previewFile.id)} 
                  alt={previewFile.file_name} 
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md border border-slate-200 dark:border-slate-800"
                />
              )}
              {previewFile.file_type === 'audio' && (
                <div className="w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-lg">
                  <Volume2 size={32} className="mx-auto text-purple-500 mb-3 animate-pulse" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 truncate mb-4">{previewFile.file_name}</p>
                  <audio 
                    src={getFileUrl(previewFile.id)} 
                    controls 
                    autoPlay
                    className="w-full"
                  />
                </div>
              )}
              {previewFile.file_type === 'video' && (
                <video 
                  src={getFileUrl(previewFile.id)} 
                  controls 
                  autoPlay
                  className="max-w-full max-h-[60vh] rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
                />
              )}
              {previewFile.file_type === 'document' && previewFile.file_name.endsWith('.pdf') && (
                <iframe 
                  src={getFileUrl(previewFile.id)} 
                  className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800"
                  title={previewFile.file_name}
                />
              )}
              {previewFile.file_type === 'document' && !previewFile.file_name.endsWith('.pdf') && (
                <div className="w-full h-full flex flex-col min-h-0">
                  {textLoading ? (
                    <div className="flex h-40 items-center justify-center flex-1">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                    </div>
                  ) : (
                    <pre className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto text-xs font-mono h-full text-left whitespace-pre-wrap select-text text-slate-800 dark:text-slate-200 flex-1">
                      {textContent}
                    </pre>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end space-x-2">
              <a 
                href={getFileUrl(previewFile.id)}
                download
                className="text-xs px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl btn-animate flex items-center space-x-1.5"
              >
                <FileDown size={14} />
                <span>Download File</span>
              </a>
              <button 
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-xs px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl btn-animate"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewUpdates;
