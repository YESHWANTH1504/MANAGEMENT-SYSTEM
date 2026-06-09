import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { 
  Calendar, FileText, CheckCircle2, MessageSquare, 
  Download, FileDown, Trophy, Clock, ShieldCheck, AlertTriangle 
} from 'lucide-react';

const Timeline = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total_days: 0, attendance_rate: 100 });
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('access_token');
  const targetId = id === 'me' || !id ? '' : id;

  const loadTimelineData = async () => {
    try {
      // 1. Fetch profile details
      let userDbId;
      if (targetId) {
        if (roleParam === 'employee') {
          try {
            const profileRes = await api.get(`/employees/${targetId}`);
            const empProfile = profileRes.data;
            setProfile({
              ...empProfile,
              internship_domain: empProfile.designation,
              college_name: empProfile.department,
              internship_id: empProfile.employee_id,
              start_date: empProfile.joining_date,
              user_role: 'employee'
            });
            userDbId = empProfile.user_id;
          } catch (err) {
            console.error("Failed to load employee profile", err);
          }
        } else if (roleParam === 'intern') {
          try {
            const profileRes = await api.get(`/interns/${targetId}`);
            setProfile({
              ...profileRes.data,
              user_role: 'intern'
            });
            userDbId = profileRes.data.user_id;
          } catch (err) {
            console.error("Failed to load intern profile", err);
          }
        } else {
          // Fallback matching order if no role query param is supplied:
          try {
            const profileRes = await api.get(`/interns/${targetId}`);
            setProfile({
              ...profileRes.data,
              user_role: 'intern'
            });
            userDbId = profileRes.data.user_id;
          } catch (err) {
            // Fallback to employee profile if intern not found
            try {
              const profileRes = await api.get(`/employees/${targetId}`);
              const empProfile = profileRes.data;
              setProfile({
                ...empProfile,
                internship_domain: empProfile.designation,
                college_name: empProfile.department,
                internship_id: empProfile.employee_id,
                start_date: empProfile.joining_date,
                user_role: 'employee'
              });
              userDbId = empProfile.user_id;
            } catch (err2) {
              console.error("Failed to load profile", err2);
            }
          }
        }
      } else {
        const meRes = await api.get('/auth/me');
        if (meRes.data.role === 'intern') {
          const internsRes = await api.get('/interns');
          const myProfile = internsRes.data.find(i => i.user_id === meRes.data.id);
          setProfile({
            ...myProfile,
            user_role: 'intern'
          });
          userDbId = meRes.data.id;
        } else if (meRes.data.role === 'employee') {
          const employeesRes = await api.get('/employees');
          const myProfile = employeesRes.data.find(e => e.user_id === meRes.data.id);
          setProfile({
            ...myProfile,
            internship_domain: myProfile.designation,
            college_name: myProfile.department,
            internship_id: myProfile.employee_id,
            start_date: myProfile.joining_date,
            user_role: 'employee'
          });
          userDbId = meRes.data.id;
        }
      }

      if (userDbId) {
        // 2. Fetch reports
        const reportsUrl = targetId ? `/reports/?intern_id=${userDbId}` : '/reports/me';
        const reportsRes = await api.get(reportsUrl);
        setReports(reportsRes.data);

        // 3. Fetch attendance stats
        const statsUrl = targetId ? `/attendance/statistics?intern_id=${userDbId}` : '/attendance/statistics';
        const statsRes = await api.get(statsUrl);
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to load timeline data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimelineData();
  }, [id]);

  // Download PDF portfolio
  const handleDownloadPortfolio = () => {
    if (!profile) return;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const downloadUrl = `${API_URL}/export/portfolio/pdf/${profile.id}?token=${token}`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `IMMS_Portfolio_${profile.internship_id}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="glass-card p-12 text-center text-slate-500 max-w-xl mx-auto">
        <AlertTriangle className="mx-auto text-yellow-500 mb-4" size={40} />
        <h3 className="text-lg font-bold">No Profile Found</h3>
        <p className="text-sm mt-2">The requested account profile could not be located in the system.</p>
      </div>
    );
  }

  // Calculate sum of total work hours
  const totalHours = reports.reduce((acc, curr) => acc + (curr.status === 'approved' ? curr.hours_worked : 0), 0);

  return (
    <div className="space-y-8">
      {/* 🏅 PORTFOLIO SUMMARY CARD */}
      <div className="bg-gradient-to-r from-brand-700 to-slate-800 dark:from-brand-950 dark:to-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-2xl font-bold border border-brand-400 shadow shadow-brand-500/20">
              {(profile.full_name || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{profile.full_name}</h2>
              <p className="text-sm text-slate-400 mt-1">
                {profile.user_role === 'employee' ? 'Designation' : 'Role'}: <span className="font-semibold text-brand-400">{profile.internship_domain}</span>
                {profile.college_name && (
                  <>
                    <span> • </span>
                    <span className="font-medium text-slate-300">
                      {profile.user_role === 'employee' ? `Dept: ${profile.college_name}` : profile.college_name}
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {profile.user_role === 'employee' ? 'Employee ID' : 'Internship ID'}: {profile.internship_id}
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadPortfolio}
            className="text-xs px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl active:translate-y-[1px] transition-all flex items-center justify-center space-x-2 shrink-0 self-start md:self-center"
          >
            <FileDown size={16} />
            <span>Download PDF Portfolio</span>
          </button>
        </div>

        {/* Core metrics mini widgets */}
        <div className="grid grid-cols-3 gap-4 border-t border-slate-800/80 mt-8 pt-6">
          <div className="text-center">
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Attendance Rate</p>
            <p className="text-lg md:text-xl font-bold text-emerald-400 mt-1">{stats.attendance_rate}%</p>
          </div>
          <div className="text-center border-x border-slate-800/80">
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Approved Reports</p>
            <p className="text-lg md:text-xl font-bold text-brand-400 mt-1">
              {reports.filter(r => r.status === 'approved').length} <span className="text-xs text-slate-500">days</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Hours Contributed</p>
            <p className="text-lg md:text-xl font-bold text-purple-400 mt-1">{totalHours} hrs</p>
          </div>
        </div>
      </div>

      {/* 🕒 TIMELINE STREAM */}
      <div className="glass-card p-6 md:p-8">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-6">
          {profile.user_role === 'employee' ? 'Employment Lifecycle' : 'Internship Lifecycle'}
        </h3>
        <div className="relative timeline-line pl-10 space-y-8">
          
          {/* Joining Milestone */}
          <div className="relative">
            <div className="absolute -left-10 top-1 w-10 h-10 rounded-full border-4 border-slate-50 dark:border-slate-950 bg-slate-800 flex items-center justify-center text-white text-xs">
              🚀
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800 dark:text-white block text-sm">
                {profile.user_role === 'employee' ? 'Joined Company Program' : 'Joined Internship Program'}
              </span>
              <span className="text-slate-500 mt-1 block">Start date: {profile.start_date || 'N/A'}</span>
            </div>
          </div>

          {/* Map Daily reports */}
          {reports.map((report) => (
            <div key={report.id} className="relative group">
              {/* Check status indicator */}
              <div className={`absolute -left-10 top-1 w-10 h-10 rounded-full border-4 border-slate-50 dark:border-slate-950 flex items-center justify-center text-white text-xs ${
                report.status === 'approved' ? 'bg-emerald-500' : report.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}>
                {report.status === 'approved' ? '✓' : report.status === 'rejected' ? '✗' : '⌛'}
              </div>

              {/* Detail block */}
              <div className="bg-slate-100/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-[10px] font-semibold text-slate-400">{new Date(report.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    report.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : report.status === 'rejected' ? 'bg-red-500/10 text-red-650' : 'bg-yellow-500/10 text-yellow-600'
                  }`}>
                    {report.status}
                  </span>
                </div>
                
                <h4 className="text-sm font-bold mt-2 text-slate-800 dark:text-white">{report.task_title}</h4>
                <p className="text-xs text-slate-650 dark:text-slate-400 mt-2">{report.description}</p>

                {/* Sub metrics */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-[10px] text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Clock size={12} />
                    <span>Logged {report.hours_worked} hours</span>
                  </span>
                  {report.technologies_used && (
                    <span>• Stack: <strong className="text-brand-500">{report.technologies_used}</strong></span>
                  )}
                </div>

                {/* Report comments */}
                {report.feedbacks && report.feedbacks.map((f) => (
                  <div key={f.id} className="mt-4 p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] flex items-start space-x-2.5">
                    <MessageSquare size={14} className="text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">Reviewer Feedback</p>
                      <p className="text-slate-500 italic mt-0.5">"{f.comments}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {reports.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-6">No reports filed yet.</p>
          )}

        </div>
      </div>
    </div>
  );
};

export default Timeline;
