import React, { useState, useMemo } from 'react';
import { ShieldAlert, AlertCircle, Clock, ChevronRight, Info } from 'lucide-react';
import { useMissingRecordsData } from './useMissingRecordsData';
import { AnimalCategory } from '../../types';

const MissingRecords: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Husbandry' | 'Details' | 'Health'>('Husbandry');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const initialStartDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  }, []);
  const [startDate, setStartDate] = useState(initialStartDate);
  const { alerts, husbandryStatus } = useMissingRecordsData(startDate);

  const filteredAlerts = alerts.filter(a => selectedCategory === 'ALL' || a.animal_category === selectedCategory);
  const filteredHusbandryStatus = husbandryStatus.filter(s => selectedCategory === 'ALL' || s.animal_category === selectedCategory);

  const husbandryAlerts = filteredAlerts.filter(a => a.category === 'Husbandry');
  const detailsAlerts = filteredAlerts.filter(a => a.category === 'Details');
  const healthAlerts = filteredAlerts.filter(a => a.category === 'Health');

  const renderHusbandry = () => (
    <div className="space-y-4">
      {filteredHusbandryStatus.map((status) => {
        const animalAlerts = husbandryAlerts.filter(a => a.animal_id === status.animal_id);
        if (animalAlerts.length === 0) return null;

        const missingWeights = status.weights.filter(w => !w).length;
        const missingFeeds = status.feeds.filter(f => !f).length;

        return (
          <div key={status.animal_id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg">{status.animal_name}</h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-tighter">{status.animal_category}</p>
              </div>
              <span className="text-xs font-black bg-red-50 text-red-600 px-3 py-1.5 rounded-full uppercase tracking-widest">
                {animalAlerts.length} MISSING LOGS
              </span>
            </div>
            
            {/* 7-day visual grid (overall status) */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {status.weights.map((hasWeight, i) => {
                const hasFeed = status.feeds[i];
                const isMissing = !hasWeight && !hasFeed;
                return (
                  <div key={`d-${i}`} className={`h-10 rounded-lg ${isMissing ? 'bg-red-100' : 'bg-emerald-100'}`} title={`Day ${i+1}: ${isMissing ? 'Logs missing' : 'Logs present'}`} />
                );
              })}
            </div>

            {/* Dashed box for missing log types */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex gap-2">
              {missingWeights > 0 && (
                <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full uppercase tracking-widest">
                  MISSING WEIGHT ({missingWeights}/7)
                </span>
              )}
              {missingFeeds > 0 && (
                <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full uppercase tracking-widest">
                  MISSING FEED ({missingFeeds}/7)
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const currentAlerts = activeTab === 'Husbandry' ? husbandryAlerts : activeTab === 'Details' ? detailsAlerts : healthAlerts;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-300 pb-24 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-200 pb-6">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-emerald-600" />
            ZLA Compliance
          </h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Zoo Licensing Act (ZLA) Compliance Monitoring
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {(['Husbandry', 'Details', 'Health'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
              activeTab === tab
                ? 'text-emerald-600 border-b-2 border-emerald-600 mb-[-2px]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Global Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold text-slate-700">START DATE</label>
          <input 
            type="date" 
            value={startDate.toISOString().split('T')[0]}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700"
          />
        </div>
        <div className="flex items-center gap-6">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-black text-slate-700 uppercase tracking-widest outline-none focus:border-emerald-500 transition-all shadow-sm"
          >
            <option value="ALL">All Sections</option>
            {Object.values(AnimalCategory).filter(c => c !== 'ALL').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</p>
            <p className="text-sm font-bold text-slate-800">7 Days</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'Husbandry' ? (
        husbandryAlerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-200">No husbandry issues detected.</div>
        ) : (
          renderHusbandry()
        )
      ) : (
        <div className="bg-white rounded-[2rem] border-2 border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{activeTab} Compliance Issues</h2>
            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {String(currentAlerts.length)} ISSUES
            </span>
          </div>

          {currentAlerts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No issues detected in this section.</div>
          ) : (
            <div className="w-full overflow-x-auto overflow-y-hidden">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Animal</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Alert Type</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Days Overdue</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Severity</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.severity === 'High' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                            <AlertCircle size={18} />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{String(alert.animal_name)}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">ID: {String(alert.animal_id.split('-')[0])}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-600">{String(alert.alert_type)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          <span className={`text-sm font-bold ${alert.days_overdue > 30 ? 'text-red-600' : 'text-slate-700'}`}>
                            {alert.days_overdue === 999 ? 'Never Logged' : `${String(alert.days_overdue)} days`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          alert.severity === 'High' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {String(alert.severity)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 rounded-lg text-xs font-bold transition-all">
                          Resolve <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Compliance Note */}
      <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] flex gap-4 items-start shadow-sm">
        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
          <Info size={20} />
        </div>
        <div>
          <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Zoo Licensing Act Compliance</h4>
          <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
            Standard ZLA requirements mandate regular health monitoring. Weights should be recorded at least fortnightly (14 days), feeds daily/weekly (7 days), and a clinical health check must be performed annually (365 days) for active animals.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MissingRecords;
