import React, { useState } from 'react';
import { Activity, Database, AlertTriangle, Loader2, Wifi, WifiOff, CloudCog, Trash2, ServerCrash, X } from 'lucide-react';
import { useSystemHealthData } from '../useSystemHealthData';

const SystemHealth: React.FC = () => {
  const { 
    isOnline, isHydrating, 
    executeForceRebuild, executeClearQueue, isClearingQueue,
    executeWipeData, isWipingData, wipeProgress
  } = useSystemHealthData();

  const [activeModal, setActiveModal] = useState<'none' | 'purge' | 'rebuild' | 'wipe'>('none');
  const [wipeConfirmText, setWipeConfirmText] = useState('');

  const handlePurge = async () => {
    const success = await executeClearQueue();
    if (success) window.location.reload();
  };

  const handleRebuild = async () => {
    const success = await executeForceRebuild();
    if (success) window.location.reload();
  };

  const handleWipe = async () => {
    const success = await executeWipeData();
    if (success) window.location.reload();
  };

  return (
    <div className="max-w-6xl space-y-8 animate-in slide-in-from-right-4 duration-300 pb-24 relative">
      <div className="border-b-2 border-slate-200 pb-6">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
          <Activity size={28} className="text-emerald-600" /> System Health & Data
        </h3>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Observability Dashboard</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Connection Status */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm space-y-6">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <CloudCog size={16} className="text-indigo-500" /> Connection Status
          </h4>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              {isOnline ? <Wifi className="text-emerald-500" size={24} /> : <WifiOff className="text-amber-500" size={24} />}
              <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Network Status</p>
                <p className="text-sm font-medium text-slate-500">
                  {isOnline ? 'Connected to Cloud' : 'Offline / Local Cache'}
                </p>
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-50 p-6 rounded-[2rem] border-2 border-rose-200 shadow-sm space-y-4 relative overflow-hidden">
        <h4 className="text-sm font-black text-rose-900 uppercase tracking-widest flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600" /> Danger Zone
        </h4>
        
        <div className="grid grid-cols-1 gap-4 mt-4 relative z-10">
          {/* Purge Queue Button */}
          <div className="p-4 bg-white rounded-xl border border-rose-100 space-y-3">
            <div>
              <p className="text-sm font-bold text-slate-800">1. Purge Stuck Sync Queue</p>
              <p className="text-xs text-slate-500 mt-1">Clears the offline outbox. Use this if the console is throwing infinite loop errors and the app refuses to sync new changes.</p>
            </div>
            <button 
              onClick={() => setActiveModal('purge')}
              disabled={isClearingQueue || isWipingData || isHydrating}
              className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-700 transition-all disabled:opacity-50"
            >
              <Trash2 size={16} /> Purge Outbox Queue
            </button>
          </div>

          {/* Force Rebuild Button */}
          <div className="p-4 bg-white rounded-xl border border-rose-100 space-y-3">
            <div>
              <p className="text-sm font-bold text-slate-800">2. Force Database Rebuild</p>
              <p className="text-xs text-slate-500 mt-1">Wipes the local cache on this device only, and forces a fresh download from the cloud.</p>
            </div>
            <button 
              onClick={() => setActiveModal('rebuild')}
              disabled={isHydrating || isWipingData || isClearingQueue || !isOnline}
              className="w-full bg-rose-600 text-white px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-700 transition-all disabled:opacity-50"
            >
              <Database size={16} /> Rebuild Local Database
            </button>
          </div>

          {/* Nuclear Wipe Button */}
          <div className="p-4 bg-rose-100 rounded-xl border-2 border-rose-300 space-y-3">
            <div>
              <p className="text-sm font-bold text-rose-900">3. Wipe Entire Database (Nuclear Option)</p>
              <p className="text-xs text-rose-700 mt-1 font-medium">Deletes EVERYTHING (Animals, Logs, Tasks, Records) from the Cloud Database and Local Caches.</p>
            </div>
            {isWipingData && (
              <div className="w-full bg-rose-200 rounded-full h-4 mb-2 overflow-hidden border border-rose-300">
                <div className="bg-rose-600 h-4 transition-all duration-300" style={{ width: `${wipeProgress}%` }}></div>
              </div>
            )}
            <button 
              onClick={() => { setActiveModal('wipe'); setWipeConfirmText(''); }}
              disabled={isWipingData || isHydrating || isClearingQueue || !isOnline}
              className="w-full bg-rose-800 text-white px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-900 transition-all shadow-xl disabled:opacity-50"
            >
              {isWipingData ? <><Loader2 size={16} className="animate-spin" /> Wiping Data ({wipeProgress}%)...</> : <><ServerCrash size={16} /> Wipe Cloud & Local Data</>}
            </button>
          </div>
        </div>
      </div>

      {/* CUSTOM MODALS */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className={activeModal === 'wipe' ? 'text-rose-600' : 'text-orange-500'} size={20} /> 
                {activeModal === 'purge' && 'Confirm Purge'}
                {activeModal === 'rebuild' && 'Confirm Rebuild'}
                {activeModal === 'wipe' && 'NUCLEAR WIPE CONFIRMATION'}
              </h3>
              <button onClick={() => setActiveModal('none')} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4 text-slate-600 text-sm">
              {activeModal === 'purge' && <p>Are you sure? This will permanently delete all pending offline changes that haven't synced to the cloud yet.</p>}
              
              {activeModal === 'rebuild' && <p>This will wipe your local cache on this device and re-download all data from the cloud. Proceed?</p>}
              
              {activeModal === 'wipe' && (
                <div className="space-y-4">
                  <p className="font-bold text-rose-600">CRITICAL WARNING:</p>
                  <p>This will permanently delete ALL operational data (animals, logs, records) from BOTH this tablet AND the Cloud Database.</p>
                  <p>Only Users, Permissions, and Settings will remain.</p>
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-2">Type "DELETE" to confirm:</label>
                    <input 
                      type="text" 
                      value={wipeConfirmText}
                      onChange={(e) => setWipeConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-center font-black tracking-widest text-rose-600 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all outline-none uppercase"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setActiveModal('none')}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              
              {activeModal === 'purge' && (
                <button onClick={() => { setActiveModal('none'); handlePurge(); }} className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 flex items-center justify-center gap-2">
                  {isClearingQueue ? <Loader2 size={16} className="animate-spin" /> : 'Purge Now'}
                </button>
              )}

              {activeModal === 'rebuild' && (
                <button onClick={() => { setActiveModal('none'); handleRebuild(); }} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 flex items-center justify-center gap-2">
                  {isHydrating ? <Loader2 size={16} className="animate-spin" /> : 'Rebuild Now'}
                </button>
              )}

              {activeModal === 'wipe' && (
                <button 
                  onClick={() => { setActiveModal('none'); handleWipe(); }} 
                  disabled={wipeConfirmText !== 'DELETE'}
                  className="flex-1 px-4 py-2.5 bg-rose-700 text-white rounded-xl font-bold hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isWipingData ? <Loader2 size={16} className="animate-spin" /> : 'WIPE EVERYTHING'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealth;