import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Clock, Search, FileDown, Calendar } from 'lucide-react';

const AttendanceLogs = () => {
  const { user } = useAuth();
  const isAdminOrMentor = user?.role === 'admin' || user?.role === 'mentor';
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const token = localStorage.getItem('access_token');

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      if (isAdminOrMentor) {
        // Fetch all logs
        let url = '/attendance/';
        if (filterDate) {
          url += `?date=${filterDate}`;
        }
        const res = await api.get(url);
        setLogs(res.data);
      } else {
        // Fetch personal logs
        const res = await api.get('/attendance/me');
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load attendance logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [filterDate]);

  // Export Attendance to Excel
  const handleExportExcel = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    let exportUrl = `${API_URL}/export/attendance/excel?token=${token}`;
    if (filterDate) {
      exportUrl += `&start_date=${filterDate}&end_date=${filterDate}`;
    }

    const link = document.createElement('a');
    link.href = exportUrl;
    link.setAttribute('download', `IMMS_Attendance_${filterDate || 'All'}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusStyle = (status) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'late':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-450';
      case 'absent':
        return 'bg-red-500/10 text-red-650 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header for Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5">
        <div className="flex items-center space-x-3.5">
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
          {isAdminOrMentor && (
            <div className="relative flex-1 md:w-64">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search Intern Name/ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 dark:text-white"
              />
            </div>
          )}
        </div>

        {isAdminOrMentor && (
          <button
            onClick={handleExportExcel}
            className="text-xs px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow shadow-brand-600/10 active:translate-y-[1px] transition-all flex items-center justify-center space-x-1.5 self-start md:self-center"
          >
            <FileDown size={16} />
            <span>Export to Excel</span>
          </button>
        )}
      </div>

      {/* Logs Table Grid */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/40 dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/80 text-xs font-bold text-slate-500">
                {isAdminOrMentor && <th className="px-6 py-4">Internship ID</th>}
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Check-In Time</th>
                <th className="px-6 py-4">Check-Out Time</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={isAdminOrMentor ? 6 : 5} className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto"></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={isAdminOrMentor ? 6 : 5} className="text-center py-12 text-slate-500">No attendance logs found.</td>
                </tr>
              ) : (
                logs
                  .filter(log => {
                    if (!isAdminOrMentor) return true;
                    // Simple filter based on intern ID string check
                    return String(log.user_id).includes(searchQuery) || searchQuery === '';
                  })
                  .map((log) => {
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        {isAdminOrMentor && (
                          <td className="px-6 py-4 font-mono font-bold text-brand-650 dark:text-brand-400">
                            IMMS-USR-{log.user_id}
                          </td>
                        )}
                        <td className="px-6 py-4 font-semibold">{log.date}</td>
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                          {log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                          {log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono">{log.ip_address || 'N/A'}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full font-bold uppercase text-[9px] ${getStatusStyle(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceLogs;
