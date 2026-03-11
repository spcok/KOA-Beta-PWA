import React, { useState, useMemo, useEffect } from 'react';
import { usePermissions } from '../../../hooks/usePermissions';
import { useSafetyDrillData } from '../useSafetyDrillData';
import { useTimesheetData } from '../../staff/useTimesheetData';
import { SafetyDrill } from '../../../types';
import { ShieldAlert, Plus, Clock, Users, Timer, X, Trash2, UserCheck, Loader2, Search, Siren, Lock } from 'lucide-react';
import { LiveAttendanceRegister } from '../components/LiveAttendanceRegister';

const SafetyDrills: React.FC = () => {
  const { view_safety_drills } = usePermissions();
  const { drills, isLoading, addDrillLog, deleteDrillLog } = useSafetyDrillData();
  const { getCurrentlyClockedInStaff } = useTimesheetData();
  const [currentlyClockedIn, setCurrentlyClockedIn] = useState<string[]>([]);

  useEffect(() => {
    getCurrentlyClockedInStaff().then(setCurrentlyClockedIn);
  }, [getCurrentlyClockedInStaff]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingDrill, setViewingDrill] = useState<SafetyDrill | null>(null);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const [drillType, setDrillType] = useState('Fire');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const filteredDrills = useMemo(() => {
    return drills.filter(drill => {
      const matchesSearch = drill.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'ALL' || drill.title.includes(filterType);
      return matchesSearch && matchesFilter;
    });
  }, [drills, searchTerm, filterType]);

  if (!view_safety_drills) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view Safety Drills. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const verifiedNames = Object.entries(attendance).filter(([, accounted]) => accounted).map(([name]) => name).join(', ');
    const missingNames = Object.entries(attendance).filter(([, accounted]) => !accounted).map(([name]) => name).join(', ');

    await addDrillLog({
      date,
      title: `${drillType} Drill`,
      location: 'Site Wide',
      priority: 'High',
      status: 'Completed',
      description: JSON.stringify({
        time,
        duration,
        totalOnSite: currentlyClockedIn.length,
        verifiedNames,
        missingNames,
        performanceNotes: notes,
        attendance
      }),
      timestamp: new Date(`${date}T${time}`).getTime()
    });

    setIsModalOpen(false);
    setDuration('');
    setNotes('');
    setAttendance({});
  };

  const parseDrillDesc = (desc: string) => {
    try { return JSON.parse(desc); } catch { return { performanceNotes: desc, verifiedNames: '', totalOnSite: 0, time: '00:00', duration: '0' }; }
  };

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Siren className="text-blue-600" size={32} /> Emergency Readiness Log
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Statutory readiness audits and cross-referenced roll calls.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search drills..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all shadow-sm"
          >
            <option value="ALL">All Types</option>
            <option value="Fire">Fire</option>
            <option value="Escape">Escape</option>
            <option value="Intruder">Intruder</option>
            <option value="Power">Power</option>
          </select>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm shrink-0">
            <Plus size={18}/> Log Drill Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredDrills.map(log => {
          const data = parseDrillDesc(log.description);
          const verifiedCount = data.verifiedNames ? data.verifiedNames.split(',').filter(Boolean).length : 0;
          const isFullyAccounted = verifiedCount >= data.totalOnSite && data.totalOnSite > 0;
          
          return (
            <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all group shadow-sm">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${isFullyAccounted ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{log.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${
                        isFullyAccounted ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {isFullyAccounted ? 'Accounted' : 'Discrepancy'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={14}/> {new Date(log.date).toLocaleDateString('en-GB')} @ {data.time}</span>
                      <span className="flex items-center gap-1"><Timer size={14}/> {data.duration}m Duration</span>
                      <span className="flex items-center gap-1"><Users size={14}/> {verifiedCount} / {data.totalOnSite} Cleared</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 max-w-xl">
                  <p className="text-sm text-slate-600 font-medium leading-relaxed italic border-l-4 border-slate-100 pl-4">
                    {data.performanceNotes || "No performance notes recorded for this audit."}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button onClick={() => setViewingDrill(log)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 hover:text-blue-600 rounded-md border border-slate-200 transition-all shadow-sm">
                    <UserCheck size={16}/> Roll Call
                  </button>
                  <button onClick={() => { deleteDrillLog(log.id) }} className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-md border border-slate-200 transition-all shadow-sm">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {filteredDrills.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 py-16 text-center">
            <p className="text-sm font-medium text-slate-500">Nil Statutory Drill History</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Log Readiness Drill</h2>
                <p className="text-sm font-medium text-slate-500">Statutory Safety Audit</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Event Date</label><input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass}/></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Alarm Trigger Time</label><input type="time" required value={time} onChange={e => setTime(e.target.value)} className={inputClass}/></div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Drill Classification</label>
                    <select value={drillType} onChange={e => setDrillType(e.target.value)} className={inputClass}>
                      <option value="Fire">Fire Evacuation</option>
                      <option value="Escape">Animal Escape Protocol</option>
                      <option value="Intruder">Security / Lockdown</option>
                      <option value="Power">Critical Utility Failure</option>
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Evac Duration (Mins)</label><input type="number" required value={duration} onChange={e => setDuration(e.target.value)} className={inputClass}/></div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Users size={16}/> Active Staff Roll Call</h3>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">{Object.values(attendance).filter(Boolean).length} / {currentlyClockedIn.length} Present</span>
                </div>
                <LiveAttendanceRegister 
                  value={attendance} 
                  onChange={setAttendance} 
                  currentlyClockedIn={currentlyClockedIn}
                />
              </div>

              <div><label className="block text-sm font-medium text-slate-700 mb-1">Performance Observations</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} resize-none h-24`} placeholder="Record readiness speed, compliance errors, or equipment issues..."/></div>
              
              <div className="pt-2">
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm">Commit & Seal Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingDrill && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Audit Details</h2>
                <p className="text-sm font-medium text-slate-500">Personnel Verification Report</p>
              </div>
              <button onClick={() => setViewingDrill(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-emerald-700">Accounted Personnel</h3>
                <div className="flex flex-wrap gap-2">
                  {parseDrillDesc(viewingDrill.description).verifiedNames.split(',').filter(Boolean).map((name: string) => (
                    <span key={name} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded border border-emerald-100">{name}</span>
                  ))}
                  {!parseDrillDesc(viewingDrill.description).verifiedNames && <span className="text-sm text-slate-400 italic">None recorded</span>}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-rose-700">Missing / Unaccounted</h3>
                <div className="flex flex-wrap gap-2">
                  {parseDrillDesc(viewingDrill.description).missingNames.split(',').filter(Boolean).map((name: string) => (
                    <span key={name} className="px-2 py-1 bg-rose-50 text-rose-700 text-xs font-medium rounded border border-rose-100">{name}</span>
                  ))}
                  {!parseDrillDesc(viewingDrill.description).missingNames && <span className="text-sm text-slate-400 italic">None recorded</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyDrills;
