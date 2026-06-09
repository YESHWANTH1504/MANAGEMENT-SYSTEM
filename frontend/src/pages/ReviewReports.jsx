import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Check, X, FileText, Calendar, Filter, 
  MessageSquare, FileDown, Eye, Image as ImageIcon, Volume2, Video 
} from 'lucide-react';

import { useToast } from '../context/ToastContext';

const ReviewReports = () => {
  const { showToast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterDate, setFilterDate] = useState('');
  const [reviewComments, setReviewComments] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [textLoading, setTextLoading] = useState(false);
  const token = localStorage.getItem('access_token');

  const fetchReports = async () => {
    try {
      setLoading(true);
      let url = `/reports/?status=${filterStatus}`;
      if (filterDate) {
        url += `&start_date=${filterDate}&end_date=${filterDate}`;
      }
      const res = await api.get(url);
      setReports(res.data);
    } catch (err) {
      console.error('Failed to fetch reports for review', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterStatus, filterDate]);

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

  const handleReview = async (reportId, status) => {
    const comments = reviewComments[reportId] || '';
    try {
      await api.post(`/reports/${reportId}/review`, { status, comments });
      setReviewComments(prev => ({ ...prev, [reportId]: '' }));
      fetchReports();
      showToast(`Report marked as ${status.toUpperCase()} successfully.`, 'success');
    } catch (err) {
      showToast('Failed to submit report review.', 'error');
    }
  };

  const handleCommentChange = (reportId, val) => {
    setReviewComments(prev => ({ ...prev, [reportId]: val }));
  };

  const getFileUrl = (attachmentId) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    return `${API_URL}/media/download/${attachmentId}?token=${token}`;
  };

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5">
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
              <Filter size={16} />
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved Reports</option>
              <option value="rejected">Rejected Reports</option>
            </select>
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
              <Calendar size={16} />
            </span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Reports Checklist items */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-500">
            <FileText className="mx-auto text-slate-400 mb-3" size={32} />
            <p className="text-sm font-semibold">No daily activity reports found matching filters.</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="glass-card p-6 space-y-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-semibold text-slate-400">Report Date: {report.date}</span>
                    {report.user_name && (
                      <>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] font-bold text-brand-500 dark:text-brand-400">{report.user_name}</span>
                      </>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                    {report.task_title}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Logged: <strong className="text-slate-700 dark:text-slate-350">{report.hours_worked} hrs</strong> • Technologies: {report.technologies_used || 'N/A'}</p>
                </div>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  report.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : report.status === 'rejected' ? 'bg-red-500/10 text-red-605' : 'bg-yellow-500/10 text-yellow-600'
                }`}>
                  {report.status}
                </span>
              </div>

              <div className="text-xs text-slate-650 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-805/50">
                <p className="font-bold text-slate-800 dark:text-white mb-1">Details & Tasks Completed:</p>
                <p className="whitespace-pre-wrap">{report.description}</p>
                
                {report.challenges_faced && (
                  <div className="mt-3">
                    <p className="font-bold text-yellow-600 dark:text-yellow-450">Blockers & Challenges:</p>
                    <p className="italic">"{report.challenges_faced}"</p>
                  </div>
                )}
                {report.learning_outcomes && (
                  <div className="mt-3">
                    <p className="font-bold text-emerald-600 dark:text-emerald-450">Learning Outcomes:</p>
                    <p>{report.learning_outcomes}</p>
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              {report.attachments && report.attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submitted Evidence Attachments</p>
                  <div className="flex flex-wrap gap-2.5 mt-1.5">
                    {report.attachments.map((att) => {
                      const fileUrl = getFileUrl(att.id);
                      const isPreviewable = att.file_type === 'image' || att.file_type === 'audio' || att.file_type === 'video' || (att.file_type === 'document' && (att.file_name.endsWith('.pdf') || att.file_name.endsWith('.txt')));
                      return (
                        <div key={att.id} className="flex items-center justify-between p-3 bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-xl text-xs max-w-xs shrink-0 select-text gap-3">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {att.file_type === 'image' && <ImageIcon size={16} className="text-blue-500 shrink-0" />}
                            {att.file_type === 'audio' && <Volume2 size={16} className="text-purple-500 shrink-0" />}
                            {att.file_type === 'video' && <Video size={16} className="text-rose-500 shrink-0" />}
                            {att.file_type === 'document' && <FileText size={16} className="text-emerald-500 shrink-0" />}
                            {att.file_type === 'archive' && <FileText size={16} className="text-amber-500 shrink-0" />}
                            <div className="truncate">
                              <p className="font-semibold truncate text-slate-800 dark:text-slate-200" title={att.file_name}>{att.file_name}</p>
                              <p className="text-[10px] text-slate-400 font-normal">{(att.file_size / (1024*1024)).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <div className="flex space-x-1 shrink-0">
                            {isPreviewable && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile(att)}
                                className="p-1.5 text-slate-500 hover:text-brand-500 dark:text-slate-450 dark:hover:text-brand-400 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors"
                                title="Preview attachment"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            <a
                              href={fileUrl}
                              download
                              className="p-1.5 text-slate-500 hover:text-brand-500 dark:text-slate-450 dark:hover:text-brand-400 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors flex items-center justify-center"
                              title="Download file"
                            >
                              <FileDown size={14} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inline evaluations forms */}
              {report.status === 'pending' && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row gap-3 items-center">
                  <div className="relative flex-1 w-full">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <MessageSquare size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Add reviewer notes/feedback comment..."
                      value={reviewComments[report.id] || ''}
                      onChange={(e) => handleCommentChange(report.id, e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl placeholder-slate-400 focus:outline-none focus:border-brand-500 dark:text-white"
                    />
                  </div>
                  <div className="flex space-x-2 w-full md:w-auto shrink-0">
                    <button
                      onClick={() => handleReview(report.id, 'approved')}
                      className="flex-1 md:flex-none text-xs px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow shadow-emerald-600/10 active:translate-y-[1px] transition-all flex items-center justify-center space-x-1"
                    >
                      <Check size={14} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReview(report.id, 'rejected')}
                      className="flex-1 md:flex-none text-xs px-4 py-2.5 bg-red-650 hover:bg-red-500 text-white font-bold rounded-xl shadow shadow-red-650/10 active:translate-y-[1px] transition-all flex items-center justify-center space-x-1"
                    >
                      <X size={14} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MEDIA PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative flex flex-col h-[80vh] animate-slide-up z-50">
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

export default ReviewReports;
