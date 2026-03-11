import React from 'react';
import { Plane, Plus, Lock, History } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

export default function FlightRecords() {
  const { view_movements } = usePermissions();

  if (!view_movements) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view Flight Records. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-center py-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Plane className="text-slate-600" size={28} /> Flight Records
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Log of all training and display flights for collection animals.</p>
        </div>
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <Plus size={18}/> Record Flight
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
            <History size={32} />
          </div>
          <div>
            <p className="text-sm font-medium">No flights have been recorded yet.</p>
            <p className="text-xs text-slate-400 mt-1">Start by recording your first training or display flight.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
