import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, Clock, MapPin, 
  AlertCircle, CheckCircle2, Info 
} from 'lucide-react';

const AttendanceCalendar = ({ attendanceRecords = [], startDate = null, isLoading = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get total days in month and index of the first day
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const getFormattedDateString = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const startDayTime = startDate ? new Date(startDate + "T00:00:00") : null;

  // Auto-select today on mount/month changes if relevant
  useEffect(() => {
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() === month) {
      const todayDay = today.getDate();
      const dateStr = getFormattedDateString(year, month, todayDay);
      const record = attendanceRecords.find(r => r.date === dateStr);
      setSelectedDay({
        day: todayDay,
        dateStr,
        record,
        statusText: record 
          ? (record.status === 'present' ? 'Present (On-Time)' : record.status === 'late' ? 'Checked-In Late' : 'Absent')
          : 'Today (No Log Yet)'
      });
    }
  }, [currentDate, attendanceRecords]);

  // Constructing Calendar Grid slots
  const blankSlots = Array(firstDayIndex).fill(null);
  const daySlots = Array.from({ length: totalDays }, (_, i) => i + 1);
  const allSlots = [...blankSlots, ...daySlots];

  // Helper to get day parameters
  const getDayInfo = (day) => {
    if (!day) return null;
    const dateStr = getFormattedDateString(year, month, day);
    const record = attendanceRecords.find(r => r.date === dateStr);
    const dayOfWeek = new Date(year, month, day).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isFuture = new Date(year, month, day) > new Date();
    const currentDayObj = new Date(year, month, day + "T00:00:00");

    let statusType = "future"; // 'present', 'late', 'absent', 'weekend', 'future', 'joining-prior'
    let statusText = "Future Date";
    let statusColor = "bg-white/5 border-slate-200/40 dark:border-white/5 text-slate-450 dark:text-slate-500";

    if (record) {
      if (record.status === 'present') {
        statusType = "present";
        statusText = "Present (On-Time)";
        statusColor = "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/5";
      } else if (record.status === 'late') {
        statusType = "late";
        statusText = "Checked-In Late";
        statusColor = "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 dark:border-amber-500/30 font-bold shadow-sm shadow-amber-500/5";
      } else if (record.status === 'absent') {
        statusType = "absent";
        statusText = "Absent (Logged)";
        statusColor = "bg-red-500/20 text-red-800 dark:text-red-300 border-red-500/40 dark:border-red-500/30 font-bold shadow-sm shadow-red-500/5";
      }
    } else if (!isFuture && dateStr !== todayStr) {
      // Past Date
      if (startDayTime && currentDayObj >= startDayTime) {
        if (!isWeekend) {
          statusType = "absent";
          statusText = "Absent (No Check-In)";
          statusColor = "bg-red-500/20 text-red-800 dark:text-red-300 border-red-500/40 dark:border-red-500/30 font-bold shadow-sm shadow-red-500/5";
        } else {
          statusType = "weekend";
          statusText = "Weekend";
          statusColor = "bg-slate-100/50 dark:bg-slate-900/10 text-slate-400 dark:text-slate-500 border-slate-200/50 dark:border-white/5 opacity-60";
        }
      } else {
        statusType = "joining-prior";
        statusText = "Prior to Joining";
        statusColor = "bg-slate-100/20 dark:bg-slate-900/5 text-slate-300 dark:text-slate-600 border-slate-200/20 dark:border-white/5 opacity-30 select-none";
      }
    } else if (dateStr === todayStr) {
      statusType = "today-pending";
      statusText = "Today (No Check-In)";
      statusColor = "bg-slate-100/70 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 animate-pulse font-bold";
    }

    return { dateStr, record, statusText, statusColor, statusType, isFuture, isWeekend };
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const info = getDayInfo(day);
    if (info.statusType === 'joining-prior') return; // Don't let users click dates prior to joining
    setSelectedDay({
      day,
      dateStr: info.dateStr,
      record: info.record,
      statusText: info.statusText
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 flex flex-col space-y-5 max-w-3xl">
      {/* Calendar Header Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500">
            <Calendar size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">Monthly Attendance Ledger</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Punctuality tracking visualization</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-white/5 p-1 rounded-xl self-start md:self-auto">
          <button 
            onClick={prevMonth}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded-lg text-slate-650 dark:text-slate-350 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-slate-850 dark:text-slate-200 px-2 min-w-[110px] text-center select-none">
            {monthNames[month]} {year}
          </span>
          <button 
            onClick={nextMonth}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded-lg text-slate-650 dark:text-slate-350 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="flex flex-col md:flex-row gap-5">
        
        {/* Days Grid Column */}
        <div className="flex-1">
          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-450 dark:text-slate-500 mb-2 uppercase tracking-wide">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Slots Mapping */}
          <div className="grid grid-cols-7 gap-1.5">
            {allSlots.map((day, idx) => {
              if (day === null) {
                return (
                  <div 
                    key={`blank-${idx}`} 
                    className="aspect-square bg-transparent rounded-lg border border-transparent"
                  />
                );
              }

              const info = getDayInfo(day);
              const isSelected = selectedDay && selectedDay.day === day && selectedDay.dateStr === info.dateStr;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => handleDayClick(day)}
                  disabled={info.statusType === 'joining-prior'}
                  title={`${day} ${monthNames[month]}: ${info.statusText}`}
                  className={`aspect-square relative rounded-xl border flex flex-col items-center justify-center text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${info.statusColor} ${
                    isSelected ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-950 scale-102 border-brand-500' : ''
                  }`}
                >
                  <span>{day}</span>
                  {/* Subtle Today dot */}
                  {info.dateStr === todayStr && (
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Panel Column */}
        <div className="w-full md:w-64 shrink-0 flex flex-col bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-2xl min-h-[180px]">
          {selectedDay ? (
            <div className="space-y-4 select-text">
              {/* Header Details */}
              <div className="pb-3 flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-450 block">Audit Date</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white block">
                  {new Date(selectedDay.dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              
              <div className="border-b border-slate-200/50 dark:border-slate-850/50"></div>

              {/* Status Badge below the line */}
              <div className="w-full text-center">
                <span className={`inline-flex items-center justify-center w-full px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider ${
                  selectedDay.record
                    ? (selectedDay.record.status === 'present' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20')
                    : (selectedDay.statusText.includes('Absent') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-slate-200/50 dark:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200/10 dark:border-slate-800/50')
                }`}>
                  {selectedDay.statusText}
                </span>
              </div>

              {/* Attendance Log Metrics details */}
              {selectedDay.record ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2.5 text-xs">
                    <Clock size={14} className="text-brand-500" />
                    <div>
                      <p className="text-[10px] text-slate-450">Check-In Time</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(selectedDay.record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 text-xs">
                    <Clock size={14} className="text-brand-500" />
                    <div>
                      <p className="text-[10px] text-slate-450">Check-Out Time</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedDay.record.check_out_time ? (
                          new Date(selectedDay.record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        ) : (
                          <span className="text-slate-400 italic">Not Checked-Out</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 text-xs">
                    <MapPin size={14} className="text-brand-500" />
                    <div>
                      <p className="text-[10px] text-slate-450">IP & Telemetry Info</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        IP: {selectedDay.record.ip_address || 'unknown'}
                      </p>
                      {selectedDay.record.latitude && (
                        <>
                          <p className="text-[9px] text-slate-500">
                            Coords: {selectedDay.record.latitude.toFixed(4)}, {selectedDay.record.longitude.toFixed(4)}
                          </p>
                          <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <iframe 
                              title="Location Map"
                              width="100%" 
                              height="120" 
                              frameBorder="0" 
                              scrolling="no" 
                              marginHeight="0" 
                              marginWidth="0" 
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedDay.record.longitude - 0.002}%2C${selectedDay.record.latitude - 0.0015}%2C${selectedDay.record.longitude + 0.002}%2C${selectedDay.record.latitude + 0.0015}&layer=mapnik&marker=${selectedDay.record.latitude}%2C${selectedDay.record.longitude}`}
                              className="w-full h-[120px]"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : selectedDay.statusText.includes('Absent') ? (
                <div className="text-center py-6 text-red-500 flex flex-col items-center justify-center space-y-2">
                  <AlertCircle size={24} />
                  <p className="text-[11px] font-semibold">No Check-in Log Recorded</p>
                  <p className="text-[9px] text-slate-550 dark:text-slate-400 max-w-[200px]">
                    This day was flagged as an unexcused absence because it fell on a standard workday without a check-in trigger.
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 flex flex-col items-center justify-center space-y-2">
                  <Info size={24} className="text-brand-500" />
                  <p className="text-[11px] font-semibold">No attendance log required</p>
                  <p className="text-[9px] text-slate-550 dark:text-slate-400 max-w-[200px]">
                    No check-in or presence audit metrics were tracked on this date.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-450 py-10">
              <Calendar size={28} className="text-brand-500 mb-2 opacity-60" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Date Details</p>
              <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1 max-w-[180px]">
                Click on any grid block date above to view telemetry check-in, check-out, and audit details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
