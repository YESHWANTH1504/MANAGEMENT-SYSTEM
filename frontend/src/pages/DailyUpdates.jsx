import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  FileText, Calendar, Filter, Users, MessageSquare, 
  Send, FileDown, Eye, Image as ImageIcon, Volume2, Video, Search, Clock, AlertCircle, CheckCircle2 
} from 'lucide-react';

const DailyUpdates = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [replyText, setReplyText] = useState({});
  const [openComments, setOpenComments] = useState({});
  const token = localStorage.getItem('access_token');

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Fetch all reports
      const res = await api.get('/reports/');
      setReports(res.data);
    } catch (err) {
      console.error('Failed to fetch reports feed', err);
      showToast('Failed to load daily updates feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handlePostComment = async (reportId) => {
    const text = replyText[reportId] || '';
    if (!text.trim()) return;

    try {
      const res = await api.post(`/reports/${reportId}/comments`, {
        comments: text
      });
      showToast('Comment posted successfully', 'success');
      // Update local report feedbacks
      setReports(prev => prev.map(r => {
        if (r.id === reportId) {
          return { ...r, feedbacks: [...(r.feedbacks || []), res.data] };
        }
        return r;
      }));
      setReplyText(prev => ({ ...prev, [reportId]: '' }));
    } catch (err) {
      console.error('Failed to post comment', err);
      showToast('Failed to post comment feedback', 'error');
    }
  };

  const getFileUrl = (attachmentId) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    return `${API_URL}/media/download/${attachmentId}?token=${token}`;
  };

  // Filter reports
  const filteredReports = reports.filter(r => {
    // 1. Search text (matches user name, task title, technologies)
    const matchesSearch = 
      (r.user_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (r.task_title || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (r.technologies_used || '').toLowerCase().includes(searchText.toLowerCase());
    
    // 2. Date filter
    const matchesDate = !filterDate || r.date === filterDate;

    // 3. Role filter (Intern vs Employee)
    const matchesRole = filterRole === 'all' || r.user_role === filterRole;

    return matchesSearch && matchesDate && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* 🔍 SEARCH AND FILTERS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Workspace Activity Log</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">All submissions are visible to everyone for collaboration</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search name, task or stack..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="text-xs pl-9 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Date Picker */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Calendar size={14} />
            </span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs pl-9 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Filter size={14} />
            </span>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="text-xs pl-9 pr-8 py-2.5 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 text-slate-900 dark:text-white appearance-none"
            >
              <option value="all" className="bg-white dark:bg-slate-955 text-slate-900 dark:text-white">All Roles</option>
              <option value="intern" className="bg-white dark:bg-slate-955 text-slate-900 dark:text-white">Interns Only</option>
              <option value="employee" className="bg-white dark:bg-slate-955 text-slate-900 dark:text-white">Employees Only</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchText || filterDate || filterRole !== 'all') && (
            <button
              onClick={() => {
                setSearchText('');
                setFilterDate('');
                setFilterRole('all');
              }}
              className="text-xs text-brand-500 hover:text-brand-600 font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 📱 DAILY REPORTS LIST FEED */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-500">
            <FileText className="mx-auto text-slate-400 mb-3" size={36} />
            <p className="text-sm font-semibold">No daily activity reports found.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the filters or check back later.</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="glass-card p-6 hover-lift transition-all space-y-4">
              
              {/* Header profile details */}
              <div className="flex justify-between items-start flex-wrap gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center font-bold text-brand-500 border border-brand-500/20">
                    {(report.user_name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      {report.user_name || 'System User'}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5 flex items-center space-x-1.5">
                      <span className="font-semibold text-brand-500 uppercase">{report.user_role || 'member'} update</span>
                      <span>•</span>
                      <span className="flex items-center"><Calendar size={10} className="mr-1" /> {report.date}</span>
                      <span>•</span>
                      <span className="flex items-center"><Clock size={10} className="mr-1" /> {report.hours_worked} Hours</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Task Title and Details */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  Task: {report.task_title}
                </h3>
                
                {report.technologies_used && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {report.technologies_used.split(',').map(tech => (
                      <span key={tech} className="text-[9px] font-bold bg-white/10 dark:bg-black/25 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-xs text-slate-650 dark:text-slate-350 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 mt-3">
                  <p className="font-bold text-slate-850 dark:text-white mb-1.5">Summary of Work Completed:</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{report.description}</p>
                  
                  {report.challenges_faced && (
                    <div className="mt-3.5 border-t border-slate-200/30 pt-3">
                      <p className="font-bold text-yellow-600 dark:text-yellow-450 flex items-center">
                        <AlertCircle size={12} className="mr-1.5" />
                        <span>Challenges / Blockers Faced:</span>
                      </p>
                      <p className="italic text-slate-600 dark:text-slate-400 mt-0.5">"{report.challenges_faced}"</p>
                    </div>
                  )}

                  {report.learning_outcomes && (
                    <div className="mt-3.5 border-t border-slate-200/30 pt-3">
                      <p className="font-bold text-emerald-600 dark:text-emerald-450 flex items-center">
                        <CheckCircle2 size={12} className="mr-1.5" />
                        <span>Learning Outcomes:</span>
                      </p>
                      <p className="text-slate-650 dark:text-slate-350 mt-0.5">{report.learning_outcomes}</p>
                    </div>
                  )}

                  {report.tomorrow_plan && (
                    <div className="mt-3.5 border-t border-slate-200/30 pt-3">
                      <p className="font-bold text-brand-500 flex items-center">
                        <Calendar size={12} className="mr-1.5" />
                        <span>Plan for Tomorrow:</span>
                      </p>
                      <p className="text-slate-650 dark:text-slate-350 mt-0.5">{report.tomorrow_plan}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments evidence files */}
              {report.attachments && report.attachments.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Submissions Media Proof</p>
                  <div className="grid grid-cols-1 gap-3">
                    {report.attachments.map((att) => {
                      const fileUrl = getFileUrl(att.id);
                      return (
                        <div key={att.id}>
                          {att.file_type === 'image' && (
                            <div className="relative group/img max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                              <img 
                                src={fileUrl} 
                                alt={att.file_name} 
                                className="max-h-48 object-cover w-full transition-transform duration-300 hover:scale-105"
                              />
                            </div>
                          )}
                          {att.file_type === 'audio' && (
                            <div className="bg-slate-100/50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 max-w-md">
                              <p className="text-[10px] text-slate-500 mb-1.5 flex items-center space-x-1">
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
                            <div className="bg-slate-100/50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 max-w-lg">
                              <p className="text-[10px] text-slate-500 mb-1.5 flex items-center space-x-1">
                                <Video size={12} className="text-brand-500" />
                                <span className="font-semibold truncate">{att.file_name}</span>
                              </p>
                              <video 
                                src={fileUrl} 
                                controls 
                                className="w-full rounded-lg max-h-64 border border-slate-200 dark:border-slate-800" 
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
                              <FileDown size={14} />
                              <span>{att.file_name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({(att.file_size / (1024*1024)).toFixed(2)} MB)</span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Collapsible Discussion Chat comments section */}
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={() => setOpenComments(prev => ({ ...prev, [report.id]: !prev[report.id] }))}
                  className="flex items-center space-x-1.5 text-xs font-bold text-brand-500 hover:text-brand-600"
                >
                  <MessageSquare size={14} />
                  <span>Discussion Chat ({report.feedbacks?.length || 0} messages)</span>
                </button>

                {openComments[report.id] && (
                  <div className="mt-4 space-y-4 bg-slate-100/50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {(!report.feedbacks || report.feedbacks.length === 0) ? (
                        <p className="text-[11px] text-slate-500 italic py-2">No discussion messages yet. Type below to send.</p>
                      ) : (
                        report.feedbacks.map(fb => (
                          <div key={fb.id} className="text-xs">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                              <span className="font-bold text-brand-500">{fb.reviewer_name || 'System User'}</span>
                              <span>{new Date(fb.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/20 dark:border-slate-800/20">{fb.comments}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Quick message reply form */}
                    {(user?.role === 'admin' || report.user_id === user?.id) ? (
                      <div className="flex space-x-2 mt-2 pt-2 border-t border-slate-200/30">
                        <input
                          type="text"
                          placeholder="Type collaboration comments..."
                          value={replyText[report.id] || ''}
                          onChange={(e) => setReplyText(prev => ({ ...prev, [report.id]: e.target.value }))}
                          className="flex-1 text-xs px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white outline-none focus:border-brand-500"
                        />
                        <button
                          onClick={() => handlePostComment(report.id)}
                          className="p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors flex items-center justify-center"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic mt-2 pt-2 border-t border-slate-200/30 text-center">
                        Review feedback is read-only.
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DailyUpdates;
