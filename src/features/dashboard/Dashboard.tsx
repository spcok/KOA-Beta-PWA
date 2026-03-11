import React, { useState } from 'react';
import { AnimalCategory } from '../../types';
import { Heart, AlertCircle, Plus, Calendar, Scale, Drumstick, ArrowUpDown, Loader2, ClipboardCheck, CheckCircle, ChevronUp, ChevronDown, ChevronRight, Lock, Unlock } from 'lucide-react';
import { formatWeightDisplay } from '../../services/weightUtils';
import AnimalFormModal from '../animals/AnimalFormModal';
import { useDashboardData, EnhancedAnimal } from './useDashboardData';
import { usePermissions } from '../../hooks/usePermissions';

interface DashboardProps {
  onSelectAnimal: (animal: EnhancedAnimal) => void;
  activeTab: AnimalCategory | 'ARCHIVED';
  setActiveTab: (tab: AnimalCategory | 'ARCHIVED') => void;
  viewDate: string;
  setViewDate: (date: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    onSelectAnimal, activeTab, setActiveTab, viewDate, setViewDate
}) => {
  const permissions = usePermissions();
  const {
    filteredAnimals,
    animalStats,
    taskStats,
    isLoading,
    cycleSort,
    sortOption,
    isOrderLocked,
    toggleOrderLock
  } = useDashboardData(activeTab, viewDate);

  const [isCreateAnimalModalOpen, setIsCreateAnimalModalOpen] = useState(false);
  const [isBentoMinimized, setIsBentoMinimized] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  if (!permissions.view_animals) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold uppercase tracking-tight">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view the animal directory. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  const getWeightDisplay = (log?: { weight?: number; weight_unit?: string; weight_grams?: number; value?: string | number }, unit: 'g' | 'oz' | 'lbs_oz' | 'kg' = 'g') => {
      if (!log) return '-';
      if (log.weight) return `${log.weight}${log.weight_unit || 'g'}`;
      if (log.weight_grams) return formatWeightDisplay(log.weight_grams, unit);
      return typeof log.value === 'string' ? log.value : String(log.value || '-');
  };

  const getSafeDate = (dateStr?: string | Date | null) => {
      if (!dateStr) return 'N/A';
      try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return 'N/A';
          return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      } catch {
          return 'N/A';
      }
  };

  if (isLoading) {
      return (
          <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Loading Dashboard...</p>
          </div>
      );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 w-full max-w-7xl mx-auto font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2 text-xs lg:text-base">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} <span className="text-slate-300">|</span> 🌤️ 14°C Partly Cloudy
          </p>
        </div>
      </div>

      {/* Tasks & Health Rota Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col transition-all duration-300">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsBentoMinimized(!isBentoMinimized)}>
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ClipboardCheck size={20} /></div>
                      <h2 className="text-lg font-semibold text-slate-800">Pending Duties</h2>
                  </div>
                  <div className="flex items-center gap-3">
                      <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{taskStats?.pendingTasks?.length || 0}</span>
                      <button className="text-slate-400 hover:text-slate-600 transition-colors">
                          {isBentoMinimized ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                      </button>
                  </div>
              </div>
              {!isBentoMinimized && (
                  <div className="mt-4 flex-1 overflow-y-auto max-h-64 pr-2 space-y-3 scrollbar-hide">
                      {(taskStats?.pendingTasks?.length || 0) > 0 ? (
                          (taskStats?.pendingTasks || []).map(t => (
                              <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all group">
                                  <div className="mt-1 p-1 bg-amber-100 rounded-full">
                                    <AlertCircle size={14} className="text-amber-600 shrink-0"/>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-900 leading-tight truncate">{t.title}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Calendar size={12} className="text-slate-400" />
                                        <p className="text-xs text-slate-500">Due: {getSafeDate(t.due_date)}</p>
                                      </div>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                              <div className="p-3 bg-emerald-50 rounded-full mb-3">
                                <CheckCircle size={32} className="text-emerald-500 opacity-80"/>
                              </div>
                              <p className="text-sm font-medium text-slate-500">All Duties Satisfied</p>
                          </div>
                      )}
                  </div>
              )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col transition-all duration-300">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsBentoMinimized(!isBentoMinimized)}>
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Heart size={20} /></div>
                      <h2 className="text-lg font-semibold text-slate-800">Health Rota</h2>
                  </div>
                  <div className="flex items-center gap-3">
                      <span className="bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full">{taskStats?.pendingHealth?.length || 0}</span>
                      <button className="text-slate-400 hover:text-slate-600 transition-colors">
                          {isBentoMinimized ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                      </button>
                  </div>
              </div>
              {!isBentoMinimized && (
                  <div className="mt-4 flex-1 overflow-y-auto max-h-64 pr-2 space-y-3 scrollbar-hide">
                      {(taskStats?.pendingHealth?.length || 0) > 0 ? (
                          (taskStats?.pendingHealth || []).map(t => (
                              <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-rose-50/30 border border-rose-100 hover:border-rose-300 hover:bg-white transition-all group">
                                  <div className="mt-1 p-1 bg-rose-100 rounded-full">
                                    <Heart size={14} className="text-rose-600 shrink-0"/>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-900 leading-tight truncate">{t.title}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Calendar size={12} className="text-slate-400" />
                                        <p className="text-xs text-slate-500">Mandatory: {getSafeDate(t.due_date)}</p>
                                      </div>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                              <div className="p-3 bg-rose-50 rounded-full mb-3">
                                <Heart size={32} className="text-rose-300 opacity-60"/>
                              </div>
                              <p className="text-sm font-medium text-slate-500">Collection Stable</p>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-[#0fa968] rounded-xl p-6 text-white flex justify-between items-center shadow-sm">
          <div>
            <div className="text-xs lg:text-sm font-medium opacity-90 mb-1">Weighed Today</div>
            <div className="text-2xl lg:text-4xl font-bold">
              {animalStats?.weighed || 0}<span className="text-sm lg:text-xl opacity-80">/{animalStats?.total || 0}</span>
            </div>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <Scale size={28} className="text-white" />
          </div>
        </div>
        <div className="bg-[#f97316] rounded-xl p-6 text-white flex justify-between items-center shadow-sm">
          <div>
            <div className="text-xs lg:text-sm font-medium opacity-90 mb-1">Fed Today</div>
            <div className="text-2xl lg:text-4xl font-bold">
              {animalStats?.fed || 0}<span className="text-sm lg:text-xl opacity-80">/{animalStats?.total || 0}</span>
            </div>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <Drumstick size={28} className="text-white" />
          </div>
        </div>
      </div>

      {/* Viewing Options Control Bar */}
      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Row 1: Date Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 w-full">
          <div className="flex items-center gap-2 text-slate-700 font-medium whitespace-nowrap text-xs lg:text-sm">
            <Calendar size={20} className="text-blue-600" />
            Viewing Date:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d.toISOString().split('T')[0]); }} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs lg:text-sm hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center">← Previous</button>
            <div className="relative flex-1 sm:flex-none min-w-[140px]">
              <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="w-full pl-3 pr-10 py-1.5 border border-slate-200 rounded-lg text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d.toISOString().split('T')[0]); }} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs lg:text-sm hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center">Next →</button>
            <button onClick={() => setViewDate(new Date().toISOString().split('T')[0])} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs lg:text-sm hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center">Today</button>
          </div>
        </div>
        
        {/* Row 2: Sort, Lock, Add */}
        <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            <button onClick={cycleSort} className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-xs lg:text-sm font-medium hover:bg-slate-50 text-slate-700 bg-white min-w-[100px]">
              <ArrowUpDown size={16} /> {sortOption === 'alpha-asc' ? 'A-Z' : sortOption === 'alpha-desc' ? 'Z-A' : 'Custom'}
            </button>
            <button onClick={() => toggleOrderLock(!isOrderLocked)} className={`shrink-0 p-2.5 border border-slate-200 rounded-lg ${isOrderLocked ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
              {isOrderLocked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
          {permissions.add_animals && (
            <button onClick={() => setIsCreateAnimalModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs lg:text-sm font-medium hover:bg-blue-700 shadow-sm whitespace-nowrap w-full sm:w-auto">
              <Plus size={16} /> Add {activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide bg-slate-100 p-1 rounded-xl gap-1">
        {[AnimalCategory.OWLS, AnimalCategory.RAPTORS, AnimalCategory.MAMMALS, AnimalCategory.EXOTICS].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`flex-1 min-w-[100px] py-2 px-4 text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {cat.charAt(0) + cat.slice(1).toLowerCase()}
          </button>
        ))}
        {(permissions.isAdmin || permissions.isOwner) && (
          <button
            onClick={() => setActiveTab('ARCHIVED')}
            className={`flex-1 min-w-[100px] py-2 px-4 text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'ARCHIVED' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Archived
          </button>
        )}
      </div>

      {/* List Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg lg:text-2xl font-semibold text-slate-800">Your {activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}</h2>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left text-[10px] md:text-[11px] lg:text-sm">
            <thead className="bg-white border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-normal break-words min-w-[90px] max-w-[140px] md:max-w-[250px] leading-tight">Name</th>
                <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap hidden xl:table-cell">Species</th>
                <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap hidden 2xl:table-cell">Ring/Microchip</th>
                {activeTab === 'ARCHIVED' ? (
                    <>
                        <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap">Status</th>
                        <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap">Date Archived</th>
                        <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap">Reason</th>
                    </>
                ) : (
                    <>
                        <th className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap ${activeTab === AnimalCategory.EXOTICS ? 'hidden' : ''}`}>Today's Weight</th>
                        <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap">Today's Feed</th>
                        <th className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-normal leading-tight ${activeTab === AnimalCategory.EXOTICS ? 'hidden' : (activeTab === AnimalCategory.OWLS || activeTab === AnimalCategory.RAPTORS ? '' : 'hidden md:table-cell')}`}>Last Fed</th>
                        <th className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap ${activeTab === AnimalCategory.EXOTICS ? '' : 'hidden'}`}>Next Feed</th>
                        <th className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-[11px] md:text-xs whitespace-nowrap hidden md:table-cell">Location</th>
                    </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                const grouped = new Map<string, EnhancedAnimal[]>();
                const standalone: EnhancedAnimal[] = [];
                
                (filteredAnimals || []).forEach(animal => {
                  if (animal.group_name) {
                    if (!grouped.has(animal.group_name)) {
                      grouped.set(animal.group_name, []);
                    }
                    grouped.get(animal.group_name)!.push(animal);
                  } else {
                    standalone.push(animal);
                  }
                });

                const renderRow = (animal: EnhancedAnimal, isGrouped: boolean = false) => (
                  <tr key={animal.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${isGrouped ? 'bg-slate-50/30' : ''}`} onClick={() => onSelectAnimal(animal)}>
                    <td className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-sm md:text-base font-bold text-slate-900 whitespace-normal break-words min-w-[90px] max-w-[140px] md:max-w-[250px] leading-tight ${isGrouped ? 'pl-4 md:pl-8' : ''}`}>
                      {isGrouped && <span className="text-slate-300 mr-2">↳</span>}
                      {animal.name}
                    </td>
                    <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-500 whitespace-nowrap hidden xl:table-cell">{animal.species}</td>
                    <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-400 whitespace-nowrap hidden 2xl:table-cell">{animal.displayId}</td>
                    {activeTab === 'ARCHIVED' ? (
                        <>
                            <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-600 whitespace-nowrap">{animal.disposition_status}</td>
                            <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-600 whitespace-nowrap">{animal.archived_at ? new Date(animal.archived_at).toLocaleDateString('en-GB') : '-'}</td>
                            <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-600 whitespace-normal">{animal.archive_reason}</td>
                        </>
                    ) : (
                        <>
                            <td className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-400 whitespace-nowrap ${activeTab === AnimalCategory.EXOTICS ? 'hidden' : ''}`}>
                            {animal.todayWeight ? getWeightDisplay(animal.todayWeight, animal.weight_unit) : '-'}
                            </td>
                            <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-400 whitespace-nowrap">
                            {animal.todayFeed ? (typeof animal.todayFeed.value === 'string' ? animal.todayFeed.value : String(animal.todayFeed.value || 'Fed')) : '-'}
                            </td>
                            <td className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-400 whitespace-normal leading-tight min-w-[60px] ${activeTab === AnimalCategory.EXOTICS ? 'hidden' : (activeTab === AnimalCategory.OWLS || activeTab === AnimalCategory.RAPTORS ? '' : 'hidden md:table-cell')}`}>{animal.lastFedStr}</td>
                            <td className={`px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-slate-500 whitespace-normal min-w-[90px] ${activeTab === AnimalCategory.EXOTICS ? '' : 'hidden'}`}>
                            {animal.nextFeedTask ? (
                                <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">
                                    {new Date(animal.nextFeedTask.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-tight">
                                    {animal.nextFeedTask.notes || 'Scheduled'}
                                </span>
                                </div>
                            ) : (
                                <span className="text-slate-300">-</span>
                            )}
                            </td>
                            <td className="px-1 py-2 md:px-2 md:py-3 lg:px-4 lg:py-4 text-xs md:text-sm text-blue-500 whitespace-nowrap hidden md:table-cell">{animal.location}</td>
                        </>
                    )}
                  </tr>
                );

                const rows: React.ReactNode[] = [];

                // Render standalone animals first (or groups first, let's do standalone first)
                standalone.forEach(animal => rows.push(renderRow(animal)));

                // Render groups
                Array.from(grouped.entries()).forEach(([groupName, animals]) => {
                  const isExpanded = expandedGroups[groupName];
                  rows.push(
                    <tr key={`group-${groupName}`} className="bg-slate-100/50 border-y border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleGroup(groupName)}>
                      <td colSpan={8} className="px-2 py-3 lg:px-4 lg:py-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                          <span className="font-bold text-slate-800">{groupName}</span>
                          <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{animals.length} individuals</span>
                        </div>
                      </td>
                    </tr>
                  );

                  if (isExpanded) {
                    animals.forEach(animal => rows.push(renderRow(animal, true)));
                  }
                });

                return rows;
              })()}
            </tbody>
          </table>
        </div>
      </div>
      
      {isCreateAnimalModalOpen && (
          <AnimalFormModal isOpen={isCreateAnimalModalOpen} onClose={() => setIsCreateAnimalModalOpen(false)} />
      )}
    </div>
  );
};

export default Dashboard;
