import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  User, Lock, Mail, ShieldAlert, CheckSquare, 
  MapPin, BookOpen, Settings, Briefcase, Calendar, Phone, Users, Sparkles
} from 'lucide-react';

const Register = () => {
  const [role, setRole] = useState('intern'); // 'intern' or 'employee'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Unified registration state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    mobile_number: '',
    gender: 'Male',
    
    // Intern fields
    internship_id: '',
    college_name: '',
    degree: '',
    department: '',
    internship_domain: 'Web Development',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days default
    
    // Employee fields
    employee_id: '',
    designation: 'Software Engineer',
    joining_date: new Date().toISOString().split('T')[0],
    
    // Shared stack / project
    project_name: '',
    programming_languages: '',
    frameworks: '',
    tools_used: '',
    databases_used: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const payload = {
      role,
      email: formData.email,
      password: formData.password,
      full_name: formData.full_name,
      mobile_number: formData.mobile_number,
      gender: formData.gender,
      project_name: formData.project_name || null,
      programming_languages: formData.programming_languages || null,
      frameworks: formData.frameworks || null,
      tools_used: formData.tools_used || null,
      databases_used: formData.databases_used || null,
    };

    if (role === 'intern') {
      payload.internship_id = formData.internship_id;
      payload.college_name = formData.college_name || null;
      payload.degree = formData.degree || null;
      payload.department = formData.department || null;
      payload.internship_domain = formData.internship_domain;
      payload.start_date = formData.start_date || null;
      payload.end_date = formData.end_date || null;
    } else {
      payload.employee_id = formData.employee_id;
      payload.designation = formData.designation;
      payload.joining_date = formData.joining_date || null;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/register', payload);
      setSuccess('Account created successfully! Redirecting to login page...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = 'Registration failed. Check credentials and ID uniqueness.';
      if (detail) {
        if (Array.isArray(detail)) {
          msg = detail.map(d => {
            const field = Array.isArray(d.loc) ? d.loc.filter(l => l !== 'body').join('.') : '';
            return field ? `${field}: ${d.msg}` : d.msg;
          }).join(', ');
        } else if (typeof detail === 'string') {
          msg = detail;
        } else if (typeof detail === 'object') {
          msg = detail.message || JSON.stringify(detail);
        }
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4 py-12 transition-colors duration-300">
      <div className="w-full max-w-4xl glass-card p-6 md:p-8 relative animate-fade-in">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <img 
            src="/logo.png" 
            alt="Tekquora Logo" 
            className="w-18 h-18 rounded-full object-contain bg-white shadow-md shadow-brand-600/10 mb-4 mx-auto" 
          />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Create Workspace Account</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Self-register for the Internship Management & Monitoring System (IMMS)</p>
        </div>

        {/* Role Toggle Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850 max-w-md mx-auto mb-8">
          <button
            type="button"
            onClick={() => { setRole('intern'); setError(''); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
              role === 'intern' 
                ? 'bg-brand-600 text-white shadow' 
                : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>Intern Signup</span>
          </button>
          <button
            type="button"
            onClick={() => { setRole('employee'); setError(''); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
              role === 'employee' 
                ? 'bg-brand-600 text-white shadow' 
                : 'text-slate-500 hover:text-slate-855 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Briefcase size={14} />
            <span>Employee Signup</span>
          </button>
        </div>

        {/* Error / Success feedback cards */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-300 text-xs rounded-xl p-4 flex items-center space-x-2.5 mb-6 max-w-2xl mx-auto">
            <ShieldAlert size={16} className="text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-300 text-xs rounded-xl p-4 flex items-center space-x-2.5 mb-6 max-w-2xl mx-auto animate-pulse">
            <CheckSquare size={16} className="text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Auth & Login credentials */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">1. Authentication Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                  <Mail size={13} className="text-slate-400" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                  <Lock size={13} className="text-slate-400" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                  <Lock size={13} className="text-slate-400" />
                  <span>Confirm Password</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Verify password"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Personal Profile Details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">2. Personal Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                  <User size={13} className="text-slate-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                  <Phone size={13} className="text-slate-400" />
                  <span>Mobile Number</span>
                </label>
                <input
                  type="text"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                  <Users size={13} className="text-slate-400" />
                  <span>Gender</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-all"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Role Specific Fields */}
          {role === 'intern' ? (
            <div className="space-y-4 pt-2">
              <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">3. Academic & Internship Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Internship ID</label>
                  <input
                    type="text"
                    name="internship_id"
                    required={role === 'intern'}
                    value={formData.internship_id}
                    onChange={handleChange}
                    placeholder="E.g., IMMS-2026-009"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                    <BookOpen size={13} className="text-slate-400" />
                    <span>College Name</span>
                  </label>
                  <input
                    type="text"
                    name="college_name"
                    value={formData.college_name}
                    onChange={handleChange}
                    placeholder="College / University"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Degree & Branch</label>
                  <input
                    type="text"
                    name="degree"
                    value={formData.degree}
                    onChange={handleChange}
                    placeholder="E.g. B.Tech CS"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="E.g. CSE / IT"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Internship Domain</label>
                  <select
                    name="internship_domain"
                    value={formData.internship_domain}
                    onChange={handleChange}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-all"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile App Development">Mobile App Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="AI / Machine Learning">AI / Machine Learning</option>
                    <option value="Cloud Engineering">Cloud Engineering</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Duration Dates (Start - End)</span>
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                      className="w-1/2 text-xs px-2.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleChange}
                      className="w-1/2 text-xs px-2.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">3. Job & Employment Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Employee ID</label>
                  <input
                    type="text"
                    name="employee_id"
                    required={role === 'employee'}
                    value={formData.employee_id}
                    onChange={handleChange}
                    placeholder="E.g., EMP-2026-009"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-all"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product Management</option>
                    <option value="Data & Analytics">Data & Analytics</option>
                    <option value="Design">Design / UX</option>
                    <option value="Human Resources">HR / Recruitment</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-355 flex items-center space-x-1.5">
                    <Briefcase size={13} className="text-slate-400" />
                    <span>Designation</span>
                  </label>
                  <input
                    type="text"
                    name="designation"
                    required={role === 'employee'}
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="E.g. Senior Software Engineer"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Joining Date</span>
                  </label>
                  <input
                    type="date"
                    name="joining_date"
                    value={formData.joining_date}
                    onChange={handleChange}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Tech stack & Assigned Project */}
          <div className="space-y-4 pt-2">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">4. Technical Profile & Project assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                  <Settings size={13} className="text-slate-400" />
                  <span>Programming Languages</span>
                </label>
                <input
                  type="text"
                  name="programming_languages"
                  value={formData.programming_languages}
                  onChange={handleChange}
                  placeholder="Python, Javascript, Rust (comma separated)"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Frameworks / Libraries</label>
                <input
                  type="text"
                  name="frameworks"
                  value={formData.frameworks}
                  onChange={handleChange}
                  placeholder="FastAPI, React, PyTorch (comma separated)"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Project Title (If Assigned)</label>
                <input
                  type="text"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  placeholder="E.g. Optimization Engine API"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Databases Used</label>
                <input
                  type="text"
                  name="databases_used"
                  value={formData.databases_used}
                  onChange={handleChange}
                  placeholder="PostgreSQL, Redis, MongoDB (comma separated)"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tools / Platforms</label>
                <input
                  type="text"
                  name="tools_used"
                  value={formData.tools_used}
                  onChange={handleChange}
                  placeholder="Docker, Git, AWS S3, Figma"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Submit Actions Button panel */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-850 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-550 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-600 dark:text-brand-400 font-bold hover:underline">
                Sign In instead
              </Link>
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto px-8 py-3 bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white rounded-lg shadow-md active:translate-y-[1px] transition-all disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Register;
