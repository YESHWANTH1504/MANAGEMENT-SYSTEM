import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Clock, MapPin, CheckCircle2, X
} from 'lucide-react';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { triggerConfetti } from '../utils/confetti';

const InternDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Attendance State
  const [attendance, setAttendance] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  
  // Attendance list states for calendar grid
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  // Load Intern data (attendance status)
  const fetchTodayData = async () => {
    setIsAttendanceLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch attendance check
      const attRes = await api.get('/attendance/me');
      setAttendanceRecords(attRes.data);
      const todayAtt = attRes.data.find(a => a.date === today);
      if (todayAtt) {
        setAttendance(todayAtt);
      }
    } catch (err) {
      console.error('Failed to load initial intern data', err);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
    
    // Fetch user coordinates
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          setLocationError(true);
        }
      );
    } else {
      setLocationError(true);
    }
  }, []);

  // Handle check in click
  const handleCheckIn = async (e) => {
    const x = e?.clientX || window.innerWidth / 2;
    const y = e?.clientY || window.innerHeight / 2;
    try {
      const res = await api.post('/attendance/check-in', {
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      setAttendance(res.data);
      showToast('Checked in successfully!', 'success');
      triggerConfetti(x, y);
      fetchTodayData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to check-in.', 'error');
    }
  };

  // Handle check out click
  const handleCheckOut = async (e) => {
    const x = e?.clientX || window.innerWidth / 2;
    const y = e?.clientY || window.innerHeight / 2;
    try {
      const res = await api.post('/attendance/check-out');
      setAttendance(res.data);
      showToast('Checked out successfully!', 'success');
      triggerConfetti(x, y);
      fetchTodayData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to check-out.', 'error');
    }
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-700 to-slate-800 dark:from-brand-950 dark:to-slate-900 text-white rounded-xl p-6 md:p-8 shadow-sm">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100 C 20 80, 40 80, 60 100 C 80 120, 100 100, 100 100 L 100 0 L 0 0 Z" fill="white"/>
          </svg>
        </div>
        <div className="relative z-10">
          <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold mt-3">{getGreeting()}, {user?.profile?.full_name || 'User'}!</h2>
          <p className="text-xs text-brand-100 mt-1 max-w-xl">
            Welcome to your workspace monitoring panel. You can check in or out below, track your monthly attendance ledger, and log your daily report updates from the sidebar.
          </p>
        </div>
      </div>

      {/* Attendance Logging Panel */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Check-In Workspace</h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-brand-500/10 rounded-2xl text-brand-600 dark:text-brand-400">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Punctuality Tracking</p>
              {attendance ? (
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                  Checked In today at <span className="text-brand-500">
                    {new Date(attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {attendance.check_out_time && (
                    <> and Checked Out at <span className="text-brand-500">
                      {new Date(attendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span></>
                  )}
                </p>
              ) : (
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">Not Checked In today</p>
              )}
            </div>
          </div>

          <div className="flex space-x-3 w-full md:w-auto">
            <button
              onClick={handleCheckIn}
              disabled={!!attendance}
              className={`flex-1 md:flex-none text-xs px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:from-emerald-600/30 disabled:to-teal-500/30 text-white font-bold rounded-xl btn-animate shadow-md hover:shadow-emerald-500/10 flex items-center justify-center space-x-2 border border-emerald-500/20 ${!attendance ? 'pulse-halo' : ''}`}
            >
              <CheckCircle2 size={16} />
              <span>Check In</span>
            </button>
            <button
              onClick={handleCheckOut}
              disabled={!attendance || !!attendance.check_out_time}
              className={`flex-1 md:flex-none text-xs px-6 py-3 bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 disabled:from-rose-600/30 disabled:to-red-500/30 text-white font-bold rounded-xl btn-animate shadow-md hover:shadow-red-500/10 flex items-center justify-center space-x-2 border border-red-500/20 ${attendance && !attendance.check_out_time ? 'pulse-halo' : ''}`}
            >
              <X size={16} />
              <span>Check Out</span>
            </button>
          </div>
        </div>

        {locationError && (
          <p className="text-[10px] text-yellow-500 flex items-center space-x-1.5 mt-4">
            <MapPin size={12} />
            <span>Could not extract exact GPS coordinates. Standard check-in IP will be logged.</span>
          </p>
        )}
      </div>

      {/* Monthly visual attendance grid */}
      <AttendanceCalendar 
        attendanceRecords={attendanceRecords} 
        startDate={user?.profile?.start_date || user?.profile?.joining_date} 
        isLoading={isAttendanceLoading} 
      />
    </div>
  );
};

export default InternDashboard;
