import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { triggerConfetti } from '../utils/confetti';
import { 
  Users, CheckCircle2, Clock, FileText, Send, 
  Paperclip, Briefcase, Eye, FileDown, Volume2, Video, Image, Trash2, X, PlusCircle, AlertCircle,
  Mic, MicOff
} from 'lucide-react';

const TodaysUpdate = () => {
  const { user } = useAuth();
  const { showToast, confirm } = useToast();
  
  // Combobox/Profiles States
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  
  // Reports states for selected profile
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  
  // Logging Form State
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
  
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Lightbox Media Preview States
  const [previewFile, setPreviewFile] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [textLoading, setTextLoading] = useState(false);
  
  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState(null);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      setIsListening(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast('Speech recognition is not supported in this browser. Please use Chrome or Edge.', 'warning');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Microphone listening... Speak now.', 'success');
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'network') {
          showToast('Speech recognition requires a stable internet connection to contact Chrome/Edge servers, or local Speech services are offline. Verify your connection or try Microsoft Edge.', 'warning');
        } else if (event.error === 'not-allowed') {
          showToast('Microphone access denied. Please click the camera/mic icon in the browser address bar to grant access.', 'warning');
        } else if (event.error === 'no-speech') {
          showToast('No speech detected. Please try speaking clearly into your microphone.', 'warning');
        } else {
          showToast(`Speech recognition error: ${event.error}`, 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setReportForm(prev => ({
            ...prev,
            description: prev.description ? `${prev.description} ${finalTranscript.trim()}` : finalTranscript.trim()
          }));
        }
      };

      recognition.start();
      setRecognitionInstance(recognition);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [recognitionInstance]);

  // Fetch all profiles (combining interns and employees)
  const fetchProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const [internsRes, employeesRes] = await Promise.all([
        api.get('/interns/'),
        api.get('/employees/')
      ]);
      
      const combined = [
        ...internsRes.data.map(i => ({
          user_id: i.user_id,
          name: i.full_name,
          role: 'intern',
          identifier: i.internship_id || 'Intern'
        })),
        ...employeesRes.data.map(e => ({
          user_id: e.user_id,
          name: e.full_name,
          role: 'employee',
          identifier: e.employee_id || 'Employee'
        }))
      ];
      
      setProfiles(combined);
      
      // Auto-select logged-in user if they are in the list
      const me = combined.find(p => p.user_id === user?.id);
      if (me) {
        setSelectedProfileId(me.user_id.toString());
      } else if (combined.length > 0) {
        setSelectedProfileId(combined[0].user_id.toString());
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load user profiles.', 'error');
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const getFileUrl = (attachmentId) => {
    const token = localStorage.getItem('access_token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    return `${API_URL}/media/download/${attachmentId}?token=${token}`;
  };

  // Fetch reports timeline for the selected profile
  const fetchReports = async (profileId) => {
    if (!profileId) return;
    setReportsLoading(true);
    try {
      const pidInt = parseInt(profileId);
      let res;
      if (pidInt === user?.id) {
        // Fallback for self
        res = await api.get('/reports/me');
      } else {
        res = await api.get(`/reports/?intern_id=${pidInt}`);
      }
      setReports(res.data);
    } catch (err) {
      console.error(err);
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProfileId) {
      fetchReports(selectedProfileId);
    }
  }, [selectedProfileId]);

  // Fetch text file preview
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
    if (!selectedProfileId) {
      showToast('Please select a profile first.', 'warning');
      return;
    }
    
    // Get button position or click coordinates for confetti effect
    let x = e.clientX || (e.nativeEvent && e.nativeEvent.clientX);
    let y = e.clientY || (e.nativeEvent && e.nativeEvent.clientY);
    if (!x && !y) {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      } else {
        x = window.innerWidth / 2;
        y = window.innerHeight / 2;
      }
    }

    setSubmitting(true);
    try {
      // 1. Submit report data
      const res = await api.post('/reports/', {
        ...reportForm,
        user_id: parseInt(selectedProfileId)
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
            showToast(`Failed to upload attachment '${file.name}': ${uploadErr.response?.data?.detail || 'Size too large or unsupported format'}`, 'warning');
          }
        }
      }

      showToast('Daily update report submitted successfully!', 'success');
      triggerConfetti(x, y);
      
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
      
      // Refresh timeline logs
      fetchReports(selectedProfileId);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to submit report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    const isConfirmed = await confirm('Are you sure you want to delete this file attachment?', {
      title: 'Delete Attachment',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/media/${attachmentId}`);
      showToast('Attachment deleted successfully.', 'success');
      fetchReports(selectedProfileId);
    } catch (err) {
      showToast('Failed to delete attachment.', 'error');
    }
  };

  const getSelectedProfileName = () => {
    const selected = profiles.find(p => p.user_id.toString() === selectedProfileId);
    return selected ? selected.name : '';
  };

  const selectedProfile = profiles.find(p => p.user_id.toString() === selectedProfileId);
  const canEdit = user?.role === 'admin' || selectedProfileId === user?.id?.toString();

  return (
    <div className="space-y-6">
      {/* 👤 PROFILE SELECTOR BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5">
        <div>
          <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Today's Update Portal</h3>
          <p className="text-[10px] text-slate-550 mt-0.5">Select your name from the directory list below to submit today's work report.</p>
        </div>
        
        <div className="relative md:w-80">
          <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Select Profile Name</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
              <Users size={16} />
            </span>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              disabled={loadingProfiles}
              className="w-full text-xs pl-10 pr-8 py-2.5 bg-slate-100/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 text-slate-900 dark:text-white appearance-none"
            >
              {loadingProfiles ? (
                <option value="">Loading profiles...</option>
              ) : (
                profiles.map(p => (
                  <option key={p.user_id} value={p.user_id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {p.name} ({p.role.toUpperCase()} - {p.identifier})
                  </option>
                ))
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
      </div>

      {selectedProfileId ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
          {/* Daily Report Input Form */}
          {canEdit ? (
            <div className="glass-card p-6 h-fit">
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-5 flex items-center space-x-1.5 border-b border-slate-150 dark:border-slate-800 pb-3">
                <PlusCircle size={15} className="text-violet-500" />
                <span>Submit Report Log: {getSelectedProfileName()}</span>
              </h4>
            
            <form onSubmit={handlePostActivity} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-655 dark:text-slate-350">Submission Date</label>
                  <input 
                    type="date"
                    name="date"
                    required
                    value={reportForm.date}
                    onChange={handleFormChange}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-655 dark:text-slate-350">Hours Worked ({reportForm.hours_worked} hrs)</label>
                  <input 
                    type="range"
                    name="hours_worked"
                    min="1"
                    max="12"
                    step="0.5"
                    value={reportForm.hours_worked}
                    onChange={handleFormChange}
                    className="w-full accent-brand-500 mt-2"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-655 dark:text-slate-355">Task Title / Main Objective</label>
                <input 
                  type="text"
                  name="task_title"
                  required
                  placeholder="E.g. Audio capture layouts, video player templates"
                  value={reportForm.task_title}
                  onChange={handleFormChange}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-655 dark:text-slate-355">Description of Accomplished Work</label>
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all duration-300 shadow-sm ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse shadow-red-500/20 border border-red-400'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 border border-slate-200/50 dark:border-slate-700/50'
                    }`}
                    title={isListening ? 'Stop listening' : 'Translate speech to text'}
                  >
                    {isListening ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        <MicOff size={11} />
                        <span>Stop Listening</span>
                      </>
                    ) : (
                      <>
                        <Mic size={11} className="text-brand-500" />
                        <span>Dictate Update</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea 
                  name="description"
                  required
                  rows={3}
                  placeholder="Briefly describe the task achievements, bugs fixed, or features built..."
                  value={reportForm.description}
                  onChange={handleFormChange}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-655 dark:text-slate-355">Stack Utilized</label>
                  <input 
                    type="text"
                    name="technologies_used"
                    placeholder="React, CSS, SQLite"
                    value={reportForm.technologies_used}
                    onChange={handleFormChange}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-655 dark:text-slate-355">Tomorrow's Milestone Plan</label>
                  <input 
                    type="text"
                    name="tomorrow_plan"
                    placeholder="Run API integration tests, setup SSL keys"
                    value={reportForm.tomorrow_plan}
                    onChange={handleFormChange}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
                  />
                </div>
              </div>

              {/* File Upload Section supporting all formats */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-655 dark:text-slate-355 uppercase">Proof Attachments (Supports Audio, Video, Image, Docs)</label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500/80 rounded-2xl p-5 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-955/20 relative">
                  <input 
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  />
                  <Paperclip size={18} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-xs text-slate-650 dark:text-slate-400 font-bold">Drag & drop files or click to browse</p>
                  <p className="text-[9px] text-slate-450 mt-1">Supports PNG, JPG, MP3, WAV, MP4, WEBM, PDF, Word, Zip (Max 16MB)</p>
                </div>

                {/* Selected Files Queue */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[9px] bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded uppercase font-bold">
                            {file.type.split('/')[0] || 'file'}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveFile(idx)} 
                            className="text-red-500 hover:text-red-700 font-bold px-1.5"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md btn-animate flex items-center justify-center space-x-1.5 pulse-halo"
              >
                <Send size={12} />
                <span>{submitting ? 'Posting Log & Uploading...' : 'Submit Today\'s Report'}</span>
              </button>
            </form>
          </div>
          ) : (
            <div className="glass-card p-6 h-fit space-y-6">
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-5 flex items-center space-x-1.5 border-b border-slate-150 dark:border-slate-800 pb-3">
                <Eye size={15} className="text-violet-500" />
                <span>Read-Only Profile View: {getSelectedProfileName()}</span>
              </h4>
              
              {selectedProfile && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
                      {selectedProfile.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-800 dark:text-white">{selectedProfile.name}</h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize font-medium mt-0.5">
                        Role: {selectedProfile.role.toUpperCase()} • ID: {selectedProfile.identifier}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs rounded-2xl p-4 flex items-start space-x-2.5">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <p className="font-bold">Viewing Portfolio Timeline</p>
                      <p className="text-[10px] text-slate-550 dark:text-slate-400 leading-relaxed mt-1">
                        You are currently viewing {selectedProfile.name}'s daily activity history in read-only mode. Adding new daily reports or editing/deleting evidence attachments is restricted to the account owner.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity History Logs (Timeline) */}
          <div className="glass-card p-6 flex flex-col h-[560px] md:h-[650px] overflow-hidden">
            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-5 flex items-center space-x-1.5 shrink-0 border-b border-slate-150 dark:border-slate-800 pb-3">
              <Briefcase size={15} className="text-pink-500" />
              <span>Activity History Timeline: {getSelectedProfileName()}</span>
            </h4>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin select-text">
              {reportsLoading ? (
                <p className="text-xs text-slate-500 text-center py-12">Loading activity logs...</p>
              ) : reports.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-12">No updates logged for this user yet.</p>
              ) : (
                reports.map((rep) => (
                  <div key={rep.id} className="relative pl-6 border-l-2 border-purple-500/20 last:border-l-transparent pb-4">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-pink-500 ring-4 ring-purple-500/15"></div>
                    <div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-205/50 dark:border-slate-850/50 rounded-xl p-4">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{new Date(rep.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-brand-500/10 text-brand-500">{rep.status}</span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-white mt-1.5">{rep.task_title}</h5>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic">"{rep.description}"</p>
                      
                      <div className="mt-2.5 flex items-center space-x-3 text-[10px] text-slate-450 border-b border-slate-200/20 pb-2">
                        <span>Hours: <strong className="text-slate-700 dark:text-slate-350">{rep.hours_worked} hrs</strong></span>
                        {rep.technologies_used && (
                          <span>Stack: <strong className="text-slate-700 dark:text-slate-350">{rep.technologies_used}</strong></span>
                        )}
                      </div>

                      {/* Attachments pills with unified preview modal links */}
                      {rep.attachments && rep.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Submitted Work Evidence ({rep.attachments.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {rep.attachments.map((attach) => {
                              const isPreviewable = attach.file_type === 'image' || attach.file_type === 'audio' || attach.file_type === 'video' || (attach.file_type === 'document' && (attach.file_name.endsWith('.pdf') || attach.file_name.endsWith('.txt')));
                              return (
                                <div key={attach.id} className="flex items-center justify-between p-2 bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 rounded-xl text-[10px] max-w-[200px] shrink-0 gap-2 text-left">
                                  <div className="flex items-center space-x-1.5 min-w-0">
                                    {attach.file_type === 'image' && <Image size={12} className="text-blue-500 shrink-0" />}
                                    {attach.file_type === 'audio' && <Volume2 size={12} className="text-purple-500 shrink-0" />}
                                    {attach.file_type === 'video' && <Video size={12} className="text-rose-500 shrink-0" />}
                                    {attach.file_type === 'document' && <FileText size={12} className="text-emerald-500 shrink-0" />}
                                    <span className="font-semibold truncate text-slate-800 dark:text-slate-200" title={attach.file_name}>{attach.file_name}</span>
                                  </div>
                                  <div className="flex space-x-1 shrink-0">
                                    {isPreviewable && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewFile(attach)}
                                        className="p-1 text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 bg-white dark:bg-slate-800 rounded-md border border-slate-200/50 dark:border-slate-700/50 transition-colors"
                                        title="Preview attachment"
                                      >
                                        <Eye size={10} />
                                      </button>
                                    )}
                                    <a
                                      href={getFileUrl(attach.id)}
                                      download
                                      className="p-1 text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 bg-white dark:bg-slate-800 rounded-md border border-slate-200/50 dark:border-slate-700/50 transition-colors flex items-center justify-center"
                                      title="Download file"
                                    >
                                      <FileDown size={10} />
                                    </a>
                                    {rep.status === 'pending' && canEdit && (
                                      <button 
                                        type="button"
                                        onClick={() => handleDeleteAttachment(attach.id)}
                                        className="p-1 text-red-500 hover:text-red-650 bg-white dark:bg-slate-800 rounded-md border border-slate-200/50 dark:border-slate-700/50 transition-colors"
                                        title="Delete file"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center text-slate-500">
          <Users className="mx-auto text-slate-400 mb-3 animate-pulse-slow" size={36} />
          <p className="text-sm font-semibold">No profile selected.</p>
          <p className="text-xs text-slate-400 mt-1">Please select your name from the directory dropdown at the top to write updates.</p>
        </div>
      )}

      {/* MEDIA PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative flex flex-col h-[80vh] animate-slide-up z-[60]">
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

            <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center bg-slate-50/50 dark:bg-slate-955/10 min-h-0">
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

export default TodaysUpdate;
