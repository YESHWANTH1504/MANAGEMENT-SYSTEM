import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  UserPlus, Search, Edit3, Trash2, X, Check, 
  Briefcase, ShieldAlert, Settings, Eye 
} from 'lucide-react';

import { useToast } from '../context/ToastContext';

const EmployeeManagement = () => {
  const navigate = useNavigate();
  const { showToast, confirm } = useToast();
  
  const getProfilePhotoUrl = (photoName) => {
    if (!photoName) return '';
    if (photoName.startsWith('http://') || photoName.startsWith('https://')) return photoName;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const BASE_URL = API_URL.replace('/api/v1', '');
    return `${BASE_URL}/static/uploads/${photoName}`;
  };

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [customDept, setCustomDept] = useState('');
  const [customEditDept, setCustomEditDept] = useState('');

  const PREDEFINED_DEPTS = [
    'Backend Developer',
    'Full Stack Developer',
    'Cloud Engineer',
    'Frontend Developer',
    'ML Engineer'
  ];
  const isPredefinedDept = (dept) => PREDEFINED_DEPTS.includes(dept);
  
  // Forms State
  const [addForm, setAddForm] = useState({
    email: '', password: '', employee_id: '',
    full_name: '', mobile_number: '', gender: '',
    department: '', designation: '',
    joining_date: '',
    employment_status: '', project_name: '', project_description: '',
    programming_languages: '', frameworks: '', tools_used: '', databases_used: ''
  });
  
  const [editForm, setEditForm] = useState(null);

  const loadData = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to load employee records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered employees list
  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (e.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (e.department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept ? e.department === selectedDept : true;
    return matchesSearch && matchesDept;
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

  // Submit Add Employee
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...addForm };
      if (payload.department === 'Others') {
        payload.department = customDept || 'Others';
      }
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      await api.post('/employees/', payload);
      setShowAddModal(false);
      // Reset form
      setCustomDept('');
      setAddForm({
        email: '', password: '', employee_id: '',
        full_name: '', mobile_number: '', gender: '',
        department: '', designation: '',
        joining_date: '',
        employment_status: '', project_name: '', project_description: '',
        programming_languages: '', frameworks: '', tools_used: '', databases_used: ''
      });
      loadData();
      showToast('Employee registered successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to register employee.', 'error');
    }
  };

  // Edit action
  const startEdit = (emp) => {
    const isPredefined = isPredefinedDept(emp.department);
    setEditForm({
      ...emp,
      department: isPredefined ? emp.department : 'Others'
    });
    setCustomEditDept(isPredefined ? '' : emp.department);
    setShowEditModal(true);
  };

  // Submit Edit Employee
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editForm };
      if (payload.department === 'Others') {
        payload.department = customEditDept || 'Others';
      }
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      await api.put(`/employees/${editForm.id}`, payload);
      setShowEditModal(false);
      setCustomEditDept('');
      loadData();
      showToast('Employee details updated successfully.', 'success');
    } catch (err) {
      showToast('Failed to update details.', 'error');
    }
  };

  // Delete action
  const handleDelete = async (empId) => {
    const isConfirmed = await confirm('Are you absolutely sure you want to delete this employee record and all their history? This cannot be undone.', {
      title: 'Delete Employee Record',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      await api.delete(`/employees/${empId}`);
      loadData();
      showToast('Employee record deleted.', 'success');
    } catch (err) {
      showToast('Failed to delete employee record.', 'error');
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
              placeholder="Search by Name, ID, or Designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
            />
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs px-3 py-2.5 bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product Management</option>
            <option value="Data & Analytics">Data & Analytics</option>
            <option value="Design">Design / UX</option>
            <option value="Human Resources">HR / Recruitment</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="text-xs px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow shadow-brand-600/10 active:translate-y-[1px] transition-all flex items-center justify-center space-x-1.5 self-start md:self-center"
        >
          <UserPlus size={16} />
          <span>Register Employee</span>
        </button>
      </div>

      {/* Employees Table Grid */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/40 dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/80 text-xs font-bold text-slate-500">
                <th className="px-6 py-4">Employee ID</th>
                <th className="px-6 py-4">Name / Contact</th>
                <th className="px-6 py-4">Designation / Department</th>
                <th className="px-6 py-4">Assigned Project</th>
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
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500">No employee records found.</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-6 py-4 font-mono font-bold text-brand-600 dark:text-brand-400">{emp.employee_id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {emp.profile_photo ? (
                          <img 
                            src={getProfilePhotoUrl(emp.profile_photo)} 
                            alt={emp.full_name} 
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-550/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm border border-purple-500/20">
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
                      <p className="font-medium text-slate-800 dark:text-white">{emp.designation}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Dept: {emp.department}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium truncate max-w-xs">{emp.project_name || 'Unassigned'}</p>
                      <p className="text-[10px] text-slate-550 capitalize mt-0.5">Status: <span className="font-bold">{emp.employment_status}</span></p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => navigate(`/timeline/${emp.id}?role=employee`)}
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-lg transition-all"
                          title="View Portfolio Timeline"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => startEdit(emp)}
                          className="p-2 bg-brand-500/10 hover:bg-brand-500 hover:text-white text-brand-600 dark:text-brand-400 rounded-lg transition-all"
                          title="Edit Profile"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-650 hover:text-white text-red-655 rounded-lg transition-all"
                          title="Delete Employee"
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
              <h3 className="font-bold text-slate-800 dark:text-white">Register New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200 dark:hover:text-white bg-transparent hover:bg-slate-500/20 p-1.5 rounded-lg">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Row 1: Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Employee ID</label>
                  <input type="text" name="employee_id" required value={addForm.employee_id} onChange={handleAddChange} placeholder="EMP-2026-001" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Login Email</label>
                  <input type="email" name="email" required value={addForm.email} onChange={handleAddChange} placeholder="employee@org.com" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
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
                  <input type="text" name="full_name" required value={addForm.full_name} onChange={handleAddChange} placeholder="Jane Doe" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
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

              {/* Row 3: Job Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Department</label>
                  <select name="department" value={addForm.department} onChange={handleAddChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white">
                    <option value="">Select Department</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Cloud Engineer">Cloud Engineer</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="ML Engineer">ML Engineer</option>
                    <option value="Others">Others</option>
                  </select>
                  {addForm.department === 'Others' && (
                    <div className="space-y-1 mt-1.5 animate-slide-up">
                      <label className="text-[9px] font-bold text-brand-600 dark:text-brand-400 uppercase">Specify Department</label>
                      <input 
                        type="text" 
                        required 
                        value={customDept} 
                        onChange={(e) => setCustomDept(e.target.value)} 
                        placeholder="e.g. Sales / Marketing" 
                        className="w-full text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white" 
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Designation</label>
                  <input type="text" name="designation" required value={addForm.designation} onChange={handleAddChange} placeholder="Senior Dev / Product Manager" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Joining Date</label>
                  <input type="date" name="joining_date" value={addForm.joining_date} onChange={handleAddChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
              </div>

              {/* Row 4: Project Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Assigned Project Title</label>
                  <input type="text" name="project_name" value={addForm.project_name} onChange={handleAddChange} placeholder="Main API Optimization" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Programming Languages</label>
                  <input type="text" name="programming_languages" value={addForm.programming_languages} onChange={handleAddChange} placeholder="Golang, Java, Python (comma separated)" className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
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
              <h3 className="font-bold text-slate-800 dark:text-white">Edit Employee - {editForm.employee_id}</h3>
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
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Employment Status</label>
                  <select name="employment_status" value={editForm.employment_status} onChange={handleEditChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white">
                    <option value="active">Active</option>
                    <option value="resigned">Resigned</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Job Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Department</label>
                  <select name="department" value={editForm.department || ''} onChange={handleEditChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white">
                    <option value="">Select Department</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Cloud Engineer">Cloud Engineer</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="ML Engineer">ML Engineer</option>
                    <option value="Others">Others</option>
                  </select>
                  {editForm.department === 'Others' && (
                    <div className="space-y-1 mt-1.5 animate-slide-up">
                      <label className="text-[9px] font-bold text-brand-600 dark:text-brand-400 uppercase">Specify Department</label>
                      <input 
                        type="text" 
                        required 
                        value={customEditDept} 
                        onChange={(e) => setCustomEditDept(e.target.value)} 
                        placeholder="e.g. Sales / Marketing" 
                        className="w-full text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white" 
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Designation</label>
                  <input type="text" name="designation" required value={editForm.designation || ''} onChange={handleEditChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Project Assigned</label>
                  <input type="text" name="project_name" value={editForm.project_name || ''} onChange={handleEditChange} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white" />
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

export default EmployeeManagement;
