import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  UserPlus, Search, Edit3, Trash2, X, Check, 
  MapPin, BookOpen, Settings, CheckSquare, Eye 
} from 'lucide-react';

import { useToast } from '../context/ToastContext';

const InternManagement = () => {
  const navigate = useNavigate();
  const { showToast, confirm } = useToast();
  
  const getProfilePhotoUrl = (photoName) => {
    if (!photoName) return '';
    if (photoName.startsWith('http://') || photoName.startsWith('https://')) return photoName;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const BASE_URL = API_URL.replace('/api/v1', '');
    return `${BASE_URL}/static/uploads/${photoName}`;
  };

  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [customDomain, setCustomDomain] = useState('');
  const [customEditDomain, setCustomEditDomain] = useState('');

  const PREDEFINED_DOMAINS = [
    'Web Development',
    'Mobile App Development',
    'Data Science',
    'AI / Machine Learning',
    'Cloud Engineering'
  ];
  const isPredefinedDomain = (domain) => PREDEFINED_DOMAINS.includes(domain);
  
  // Forms State
  const [addForm, setAddForm] = useState({
    email: '', password: '', internship_id: '',
    full_name: '', mobile_number: '', gender: '',
    college_name: '', degree: '', department: '',
    internship_domain: '',
    start_date: '',
    end_date: '',
    programming_languages: '', frameworks: '', tools_used: '', databases_used: ''
  });

  const [editForm, setEditForm] = useState(null);

  const loadData = async () => {
    try {
      const internsRes = await api.get('/interns');
      setInterns(internsRes.data);
    } catch (err) {
      console.error('Failed to load intern records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered and sorted interns list
  const sortedInterns = [...interns]
    .filter(i => {
      const matchesSearch = i.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            i.internship_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (i.college_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (i.internship_domain || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDomain = selectedDomain ? i.internship_domain === selectedDomain : true;
      return matchesSearch && matchesDomain;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.full_name.localeCompare(b.full_name);
      } else if (sortBy === 'id') {
        return a.internship_id.localeCompare(b.internship_id);
      } else if (sortBy === 'domain') {
        return (a.internship_domain || '').localeCompare(b.internship_domain || '');
      } else if (sortBy === 'college') {
        return (a.college_name || '').localeCompare(b.college_name || '');
      } else if (sortBy === 'date') {
        return (a.start_date || '').localeCompare(b.start_date || '');
      }
      return 0;
    });

  // Handle Input Changes
  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  // Submit Add Intern
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...addForm };
      if (payload.internship_domain === 'Others') {
        payload.internship_domain = customDomain || 'Others';
      }
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      await api.post('/interns/', payload);
      setShowAddModal(false);
      // Reset form
      setCustomDomain('');
      setAddForm({
        email: '', password: '', internship_id: '',
        full_name: '', mobile_number: '', gender: '',
        college_name: '', degree: '', department: '',
        internship_domain: '',
        start_date: '',
        end_date: '',
        programming_languages: '', frameworks: '', tools_used: '', databases_used: ''
      });
      loadData();
      showToast('Intern registered successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to register intern.', 'error');
    }
  };

  // Edit action
  const startEdit = (intern) => {
    const isPredefined = isPredefinedDomain(intern.internship_domain);
    setEditForm({
      ...intern,
      internship_domain: isPredefined ? intern.internship_domain : 'Others'
    });
    setCustomEditDomain(isPredefined ? '' : intern.internship_domain);
    setShowEditModal(true);
  };

  // Submit Edit Intern
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editForm };
      if (payload.internship_domain === 'Others') {
        payload.internship_domain = customEditDomain || 'Others';
      }
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      await api.put(`/interns/${editForm.id}`, payload);
      setShowEditModal(false);
      setCustomEditDomain('');
      loadData();
      showToast('Intern details updated successfully.', 'success');
    } catch (err) {
      showToast('Failed to update details.', 'error');
    }
  };

  // Delete action
  const handleDelete = async (internId) => {
    const isConfirmed = await confirm('Are you absolutely sure you want to delete this intern and all their daily logs/attendance? This cannot be undone.', {
      title: 'Delete Intern Record',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      await api.delete(`/interns/${internId}`);
      loadData();
      showToast('Intern record deleted.', 'success');
    } catch (err) {
      showToast('Failed to delete intern record.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex-1 md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by Name, ID, or College..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
            />
          </div>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="text-xs px-3 py-2.5 bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
          >
            <option value="">All Domains</option>
            <option value="Web Development">Web Development</option>
            <option value="Mobile App Development">Mobile App Dev</option>
            <option value="Data Science">Data Science</option>
            <option value="AI / Machine Learning">AI / ML</option>
            <option value="Cloud Engineering">Cloud Engineering</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs px-3 py-2.5 bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
          >
            <option value="name">Sort by Name</option>
            <option value="id">Sort by ID</option>
            <option value="domain">Sort by Domain</option>
            <option value="college">Sort by College</option>
            <option value="date">Sort by Date</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="text-xs px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow shadow-brand-600/10 active:translate-y-[1px] transition-all flex items-center justify-center space-x-1.5 self-start md:self-center"
        >
          <UserPlus size={16} />
          <span>Register Intern</span>
        </button>
      </div>

      {/* Interns Table grid */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/40 dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/80 text-xs font-bold text-slate-500">
                <th className="px-6 py-4">Intern ID</th>
                <th className="px-6 py-4">Name / Contact</th>
                <th className="px-6 py-4">Domain</th>
                <th className="px-6 py-4">College</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto"></div>
                  </td>
                </tr>
              ) : sortedInterns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500">No intern records found.</td>
                </tr>
              ) : (
                sortedInterns.map((intern) => (
                  <tr key={intern.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-6 py-4 font-mono font-bold text-brand-600 dark:text-brand-400">{intern.internship_id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {intern.profile_photo ? (
                          <img 
                            src={getProfilePhotoUrl(intern.profile_photo)} 
                            alt={intern.full_name} 
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-purple-500/10 dark:bg-purple-550/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm border border-purple-500/20">
                            {intern.full_name[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{intern.full_name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{intern.mobile_number || 'No phone'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 dark:text-white">{intern.internship_domain}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Domain Specialist</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="truncate max-w-xs">{intern.college_name || 'N/A'}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{intern.degree} • {intern.department}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => navigate(`/timeline/${intern.id}?role=intern`)}
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-lg transition-all"
                          title="View Portfolio Timeline"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => startEdit(intern)}
                          className="p-2 bg-brand-500/10 hover:bg-brand-500 hover:text-white text-brand-600 dark:text-brand-400 rounded-lg transition-all"
                          title="Edit Profile"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(intern.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-650 hover:text-white text-red-655 rounded-lg transition-all"
                          title="Delete Intern"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📝 REGISTER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-white">Register New Intern Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200 dark:hover:text-white bg-transparent hover:bg-slate-500/20 p-1.5 rounded-lg">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Row 1: Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Internship ID</label>
                  <input type="text" name="internship_id" required value={addForm.internship_id} onChange={handleAddChange} placeholder="IMMS-2026-001" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">System Login Email</label>
                  <input type="email" name="email" required value={addForm.email} onChange={handleAddChange} placeholder="intern@college.com" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Password</label>
                  <input type="password" name="password" required value={addForm.password} onChange={handleAddChange} placeholder="Password123" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
              </div>

              {/* Row 2: Personal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Full Name</label>
                  <input type="text" name="full_name" required value={addForm.full_name} onChange={handleAddChange} placeholder="John Doe" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Mobile Number</label>
                  <input type="text" name="mobile_number" value={addForm.mobile_number} onChange={handleAddChange} placeholder="9876543210" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Gender</label>
                  <select name="gender" value={addForm.gender} onChange={handleAddChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Academic */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">College Name</label>
                  <input type="text" name="college_name" value={addForm.college_name} onChange={handleAddChange} placeholder="IIT Madras" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Degree</label>
                  <input type="text" name="degree" value={addForm.degree} onChange={handleAddChange} placeholder="B.Tech" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Department</label>
                  <input type="text" name="department" value={addForm.department} onChange={handleAddChange} placeholder="Computer Science" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
              </div>

              {/* Row 4: Internship */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Internship Domain</label>
                  <select name="internship_domain" value={addForm.internship_domain} onChange={handleAddChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white">
                    <option value="">Select Domain</option>
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile App Development">Mobile App Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="AI / Machine Learning">AI / Machine Learning</option>
                    <option value="Cloud Engineering">Cloud Engineering</option>
                    <option value="Others">Others</option>
                  </select>
                  {addForm.internship_domain === 'Others' && (
                    <div className="space-y-1 mt-1.5 animate-slide-up">
                      <label className="text-[9px] font-bold text-brand-600 dark:text-brand-400 uppercase">Specify Domain</label>
                      <input 
                        type="text" 
                        required 
                        value={customDomain} 
                        onChange={(e) => setCustomDomain(e.target.value)} 
                        placeholder="e.g. Cyber Security" 
                        className="w-full text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white" 
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">End Date</label>
                  <input type="date" name="end_date" value={addForm.end_date} onChange={handleAddChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Start Date</label>
                  <input type="date" name="start_date" value={addForm.start_date} onChange={handleAddChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
              </div>

              {/* Languages / Frameworks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Programming Languages</label>
                  <input type="text" name="programming_languages" value={addForm.programming_languages} onChange={handleAddChange} placeholder="Python, Javascript (comma separated)" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Frameworks</label>
                  <input type="text" name="frameworks" value={addForm.frameworks} onChange={handleAddChange} placeholder="FastAPI, React, Express (comma separated)" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2 shrink-0 border-t border-slate-205 dark:border-slate-795">
                <button type="button" onClick={() => setShowAddModal(false)} className="text-xs px-4 py-2.5 bg-transparent border border-slate-300 dark:border-slate-700 hover:bg-slate-500/10 font-bold rounded-xl transition-all">Cancel</button>
                <button type="submit" className="text-xs px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow shadow-brand-600/10 transition-all">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ EDIT MODAL */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-white">Edit Intern details - {editForm.internship_id}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-200 dark:hover:text-white bg-transparent hover:bg-slate-500/20 p-1.5 rounded-lg">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Row 1: Personal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Full Name</label>
                  <input type="text" name="full_name" required value={editForm.full_name} onChange={handleEditChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Mobile Number</label>
                  <input type="text" name="mobile_number" value={editForm.mobile_number || ''} onChange={handleEditChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Status</label>
                  <select name="internship_status" value={editForm.internship_status} onChange={handleEditChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white">
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Internship Domain</label>
                  <select name="internship_domain" value={editForm.internship_domain || ''} onChange={handleEditChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white">
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile App Development">Mobile App Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="AI / Machine Learning">AI / Machine Learning</option>
                    <option value="Cloud Engineering">Cloud Engineering</option>
                    <option value="Others">Others</option>
                  </select>
                  {editForm.internship_domain === 'Others' && (
                    <div className="space-y-1 mt-1.5 animate-slide-up">
                      <label className="text-[9px] font-bold text-brand-600 dark:text-brand-400 uppercase">Specify Domain</label>
                      <input 
                        type="text" 
                        required 
                        value={customEditDomain} 
                        onChange={(e) => setCustomEditDomain(e.target.value)} 
                        placeholder="e.g. Cyber Security" 
                        className="w-full text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white" 
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Project Name</label>
                  <input type="text" name="project_name" value={editForm.project_name || ''} onChange={handleEditChange} placeholder="e.g. IMMS Portal" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2 shrink-0 border-t border-slate-205 dark:border-slate-795">
                <button type="button" onClick={() => setShowEditModal(false)} className="text-xs px-4 py-2.5 bg-transparent border border-slate-300 dark:border-slate-700 hover:bg-slate-500/10 font-bold rounded-xl transition-all">Cancel</button>
                <button type="submit" className="text-xs px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow shadow-brand-600/10 transition-all">Update Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternManagement;
