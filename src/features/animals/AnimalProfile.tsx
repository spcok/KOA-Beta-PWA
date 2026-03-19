import React, { useState, useMemo } from 'react';
import { Animal, LogType, HazardRating } from '../../types';
import { 
  ChevronLeft, Printer, Edit, 
  AlertTriangle, Plus, Archive, Skull, 
  Loader2, Info, Calendar, MapPin, ShieldCheck,
  History, Heart, Layers, Thermometer, Droplets,
  User, Fingerprint, FileText, RotateCcw
} from 'lucide-react';
import { formatWeightDisplay, parseLegacyWeightToGrams } from '../../services/weightUtils';
import AddEntryModal from './AddEntryModal';
import SignGenerator from './SignGenerator';
import { usePermissions } from '../../hooks/usePermissions';
import AnimalFormModal from './AnimalFormModal';
import { IUCNBadge } from './IUCNBadge';
import { useAnimalProfileData } from './useAnimalProfileData';
import { generateBirthCertificateDocx } from '../reports/utils/docxExportService';
import { restoreAnimal } from '../../lib/dataEngine';

interface AnimalProfileProps {
  animalId: string;
  onBack: () => void;
}

const AnimalProfile: React.FC<AnimalProfileProps> = ({ animalId, onBack }) => {
  const permissions = usePermissions();
  
  const {
    animal,
    logs,
    orgProfile,
    allAnimals,
    isLoading,
    archiveAnimal
  } = useAnimalProfileData(animalId);

  const isArchived = animal?.archived;

  const handleRestore = async () => {
    if (!animal) return;
    try {
      await restoreAnimal(animal);
      onBack();
    } catch (err) {
      console.error("Failed to restore animal:", err);
    }
  };

  const [activeTab, setActiveTab] = useState<'Overview' | 'History' | 'Medical' | 'Tasks'>('Overview');
  const [logFilter, setLogFilter] = useState<LogType | 'ALL'>('ALL');
  
  const [isSignGeneratorOpen, setIsSignGeneratorOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveForm, setArchiveForm] = useState<{ reason: string, type: 'Disposition' | 'Death' | 'Euthanasia' | 'Missing' | 'Stolen' }>({
    reason: '',
    type: 'Disposition'
  });
  const [entryType, setEntryType] = useState<LogType>(LogType.GENERAL);

  const filteredLogs = useMemo(() => {
      if (logFilter === 'ALL') return logs;
      return logs.filter(l => l.log_type === logFilter);
  }, [logs, logFilter]);

  const medicalLogs = useMemo(() => {
      return logs.filter(l => l.log_type === LogType.HEALTH);
  }, [logs]);

  const handleArchiveSubmit = async () => {
    if (!archiveForm.reason) return;
    try {
      await archiveAnimal(archiveForm.reason, archiveForm.type);
      setIsArchiveModalOpen(false);
      onBack();
    } catch (err) {
      console.error("Failed to archive animal:", err);
    }
  };

  const handleGenerateBirthCertificate = async () => {
    if (!animal) return;
    try {
      const blob = await generateBirthCertificateDocx(animal, {
        reportName: 'Birth Certificate',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        generatedBy: 'STAFF'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${animal.name}_Birth_Certificate.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate birth certificate:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50/50 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Loading Subject Profile...</p>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50/50 gap-6 p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300">
            <Skull size={40} />
        </div>
        <div>
            <h2 className="text-xl font-semibold text-slate-800">Subject Not Found</h2>
            <p className="text-slate-500 text-sm font-medium mt-2">The requested animal profile does not exist or has been purged.</p>
        </div>
        <button onClick={onBack} className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium transition-colors">
            Return to Registry
        </button>
      </div>
    );
  }

  const isHighHazard = animal.hazard_rating === HazardRating.HIGH || animal.is_venomous;

  return (
    <div className="space-y-6 pb-24 font-sans">
        {isArchived && (
            <div className="bg-amber-500 text-white px-6 py-3 text-center font-bold flex items-center justify-center gap-2">
                <AlertTriangle size={20} />
                ⚠️ ARCHIVED RECORD - Reason: {animal?.archive_reason}
            </div>
        )}
        {/* STICKY FULL-BLEED SOLID HEADER */}
        <div className="sticky -top-4 md:-top-6 lg:-top-8 z-30 bg-white border-b border-slate-200 px-6 lg:px-10 py-4 shadow-sm -mt-4 md:-mt-6 lg:-mt-8 -mx-4 md:-mx-6 lg:-mx-8 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={onBack} className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{String(animal.name)}</h1>
                                {isHighHazard && <span className="text-rose-600 animate-pulse"><Skull size={16}/></span>}
                                {isArchived && <span className="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Archived</span>}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{String(animal.species)}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {!isArchived && (
                        <>
                            {animal.acquisition_type === 'BORN' && (
                                <button onClick={handleGenerateBirthCertificate} className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 text-xs font-medium transition-colors" title="Birth Certificate">
                                    <FileText size={16} />
                                </button>
                            )}
                            <button onClick={() => setIsSignGeneratorOpen(true)} className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 text-xs font-medium transition-colors" title="Signage">
                                <Printer size={16} />
                            </button>
                            {permissions.edit_animals && (
                                <button onClick={() => setIsEditProfileOpen(true)} className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 text-xs font-medium transition-colors" title="Edit Profile">
                                    <Edit size={16} />
                                </button>
                            )}
                            {permissions.archive_animals && (
                                <button onClick={() => setIsArchiveModalOpen(true)} className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 text-xs font-medium transition-colors" title="Archive">
                                    <Archive size={16} />
                                </button>
                            )}
                            <button 
                                onClick={() => { setEntryType(LogType.GENERAL); setIsAddEntryOpen(true); }}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1.5"
                            >
                                <Plus size={14} /> Log Activity
                            </button>
                        </>
                    )}
                    {isArchived && (
                        <button onClick={handleRestore} className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2">
                            <RotateCcw size={16} /> Restore to Live Collection
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="px-2 md:px-4 py-4">
            {/* TOP SECTION: PHOTO & ZLA RECORD */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                {/* 1. PHOTO CARD */}
                <div className="md:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="w-full flex-1 min-h-[300px] relative overflow-hidden bg-slate-100">
                        <img src={animal.image_url || 'https://picsum.photos/seed/placeholder/1200/800'} alt={animal.name} className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
                            <div>
                                <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1">Subject ID</p>
                                <p className="text-white font-mono text-xs font-bold shadow-sm">{String(animal.id).split('-')[0].toUpperCase()}</p>
                            </div>
                            <IUCNBadge status={animal.red_list_status} size="md" />
                        </div>
                    </div>
                </div>

                {/* 2. ZLA 1981 STATUTORY RECORD CARD */}
                <div className="md:col-span-9 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={18} className="text-slate-700" />
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 leading-tight">ZLA 1981 Record</h3>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Statutory Stock Ledger</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-y-5 gap-x-4 flex-1 content-start">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Calendar size={12}/> Entry / Hatched</p>
                            <p className="text-sm font-semibold text-slate-900">
                                {animal.acquisition_date ? new Date(animal.acquisition_date).toLocaleDateString('en-GB') : (animal.dob ? new Date(animal.dob).toLocaleDateString('en-GB') : 'Unknown')}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><User size={12}/> Sex</p>
                            <p className="text-sm font-semibold text-slate-900">{String(animal.sex || 'Unknown')}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin size={12}/> Current Location</p>
                            <p className="text-sm font-semibold text-slate-900">{String(animal.location)}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><FileText size={12}/> Source / Origin</p>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono font-bold">{String(animal.acquisition_type || 'UNKNOWN').replace('_', ' ')}</span>
                                <span className="text-sm font-semibold text-slate-900">{String(animal.origin || 'Not specified')}</span>
                            </div>
                        </div>
                        <div className="col-span-2 pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><ShieldCheck size={12}/> Statutory Metadata</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><AlertTriangle size={12}/> Hazard Class</p>
                                    <p className="text-sm font-semibold text-rose-600">{String(animal.hazard_rating)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-2 pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Distinctive Marks (ID)</p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    <span className="text-xs font-medium text-slate-500 flex items-center gap-2"><Fingerprint size={14}/> Microchip</span>
                                    <span className="text-sm font-mono font-bold text-slate-900 break-all text-right ml-2">{String(animal.microchip_id || 'N/A')}</span>
                                </div>
                                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    <span className="text-xs font-medium text-slate-500 flex items-center gap-2"><Layers size={14}/> Ring No.</span>
                                    <span className="text-sm font-mono font-bold text-slate-900 break-all text-right ml-2">{String(animal.ring_number || 'N/A')}</span>
                                </div>
                            </div>
                        </div>
                        {isArchived && (
                             <div className="col-span-2 pt-4 border-t border-slate-100">
                                 <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Departure / Death Record</p>
                                 <p className="text-sm font-semibold text-slate-900">{animal.archive_reason || 'Unknown'}</p>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM SECTION: CONTENT TABS (BENTO) */}
            <div className="space-y-6 min-w-0">
                {/* TABS NAVIGATION */}
                <div className="bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm flex gap-1 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'Overview', icon: Info, label: 'Overview' },
                        { id: 'History', icon: History, label: 'Husbandry Feed' },
                        { id: 'Medical', icon: Heart, label: 'Clinical File' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'Overview' | 'History' | 'Medical')}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                                activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>

                    {/* TAB CONTENT: OVERVIEW */}
                    {activeTab === 'Overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                    <h4 className="text-xs font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                        <Info size={14}/> Subject Narrative
                                    </h4>
                                    <p className="text-xs text-slate-600 leading-relaxed">{String(animal.description || "No physical description available.")}</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                    <h4 className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                        <AlertTriangle size={14}/> Critical Husbandry Notes
                                    </h4>
                                    {animal.critical_husbandry_notes && animal.critical_husbandry_notes.length > 0 ? (
                                        <ul className="space-y-1">
                                            {animal.critical_husbandry_notes?.map((note, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs text-amber-800">
                                                    <div className="mt-1 w-1 h-1 rounded-full bg-amber-500 shrink-0"></div>
                                                    {String(note)}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-amber-800/70 italic">No critical notes flagged for this subject.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                    <h4 className="text-xs font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                        <Thermometer size={14}/> Target Environment
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            <p className="text-[10px] text-slate-500 mb-0.5">Day Temp</p>
                                            <p className="text-xs font-semibold text-slate-900">{animal.target_day_temp_c ? `${animal.target_day_temp_c}°C` : '--'}</p>
                                        </div>
                                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            <p className="text-[10px] text-slate-500 mb-0.5">Night Temp</p>
                                            <p className="text-xs font-semibold text-slate-900">{animal.target_night_temp_c ? `${animal.target_night_temp_c}°C` : '--'}</p>
                                        </div>
                                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            <p className="text-[10px] text-slate-500 mb-0.5">Humidity Min</p>
                                            <p className="text-xs font-semibold text-slate-900">{animal.target_humidity_min_percent ? `${animal.target_humidity_min_percent}%` : '--'}</p>
                                        </div>
                                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            <p className="text-[10px] text-slate-500 mb-0.5">Humidity Max</p>
                                            <p className="text-xs font-semibold text-slate-900">{animal.target_humidity_max_percent ? `${animal.target_humidity_max_percent}%` : '--'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <Droplets size={14} className="text-blue-500" />
                                            <span className="text-xs font-medium text-blue-700">Water Tipping Temp</span>
                                        </div>
                                        <span className={`text-xs font-semibold ${animal.water_tipping_temp !== undefined && animal.water_tipping_temp !== null ? 'text-blue-600' : 'text-slate-400'}`}>
                                            {animal.water_tipping_temp !== undefined && animal.water_tipping_temp !== null ? `${animal.water_tipping_temp}°C` : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <Droplets size={14} className="text-blue-500" />
                                            <span className="text-xs font-medium text-blue-700">Misting Frequency</span>
                                        </div>
                                        <span className="text-xs font-semibold text-blue-900">{String(animal.misting_frequency || 'N/A')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: HISTORY FEED */}
                    {activeTab === 'History' && (
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setLogFilter('ALL')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${logFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>ALL</button>
                                {[LogType.WEIGHT, LogType.FEED, LogType.FLIGHT, LogType.TRAINING, LogType.TEMPERATURE].map(type => (
                                    <button key={type} onClick={() => setLogFilter(type)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${logFilter === type ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{type}</button>
                                ))}
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-700">Date / Time</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-700">Type</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-700">Data Point</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-700">Narrative</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-700 text-right">Auth</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredLogs?.map(log => (
                                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-semibold text-slate-900">{new Date(log.log_date).toLocaleDateString('en-GB')}</p>
                                                        <p className="text-xs text-slate-500">{new Date(log.log_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                                                            log.log_type === LogType.WEIGHT ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                            log.log_type === LogType.FEED ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                            'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}>
                                                            {String(log.log_type)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                                        {log.log_type === LogType.WEIGHT ? (
                                                            (() => {
                                                                // 1. If it has strict DB grams, use it
                                                                if (log.weight_grams) return formatWeightDisplay(log.weight_grams, animal.weight_unit);
                                                                // 2. If it's a legacy string, parse and format it
                                                                const parsedGrams = parseLegacyWeightToGrams(log.value);
                                                                if (parsedGrams !== null) return formatWeightDisplay(parsedGrams, animal.weight_unit);
                                                                // 3. Absolute fallback
                                                                return log.weight ? `${log.weight}${log.weight_unit || 'g'}` : String(log.value);
                                                            })()
                                                        ) : String(log.value)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600 italic">{String(log.notes || '-')}</td>
                                                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-500">{String(log.user_initials)}</td>
                                                </tr>
                                            ))}
                                            {(filteredLogs?.length || 0) === 0 && (
                                                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 italic">No records found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: MEDICAL */}
                    {activeTab === 'Medical' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-slate-900">Clinical Patient File</h3>
                                {permissions.canEditMedical && (
                                    <button 
                                        onClick={() => { setEntryType(LogType.HEALTH); setIsAddEntryOpen(true); }}
                                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} /> Add Clinical Record
                                    </button>
                                )}
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-700">Date</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-700">Category</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-700">Clinical Findings & Treatment</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-slate-700 text-right">Auth</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {medicalLogs?.map(log => (
                                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{new Date(log.log_date).toLocaleDateString('en-GB')}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border bg-rose-50 text-rose-700 border-rose-100">
                                                            {String(log.health_record_type || 'General')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-semibold text-slate-900 mb-0.5">{String(log.value)}</p>
                                                        <p className="text-xs text-slate-500 italic">{String(log.notes || '-')}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-500">{String(log.user_initials)}</td>
                                                </tr>
                                            ))}
                                            {(medicalLogs?.length || 0) === 0 && (
                                                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500 italic">No Clinical History Found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

        {/* MODALS */}
        {isSignGeneratorOpen && (
            <SignGenerator 
                animal={animal}
                orgProfile={orgProfile || null}
                onClose={() => setIsSignGeneratorOpen(false)}
            />
        )}

        {isEditProfileOpen && (
            <AnimalFormModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                initialData={animal}
            />
        )}

        {isAddEntryOpen && (
            <AddEntryModal 
                isOpen={isAddEntryOpen}
                onClose={() => setIsAddEntryOpen(false)}
                animal={animal}
                initialType={entryType}
                allAnimals={allAnimals}
                initialDate={new Date().toISOString().split('T')[0]}
                onSave={() => {}}
            />
        )}

        {/* ARCHIVE MODAL */}
        {isArchiveModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-lg">
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                                <Archive size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Archive Subject</h3>
                                <p className="text-xs font-medium text-slate-500">Formal Disposition Registry</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-2">Archive Type</label>
                                <select 
                                    value={archiveForm.type}
                                    onChange={(e) => setArchiveForm(prev => ({ ...prev, type: e.target.value as NonNullable<Animal['archive_type']> }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-500 transition-all outline-none"
                                >
                                    <option value="Disposition">Disposition</option>
                                    <option value="Death">Death</option>
                                    <option value="Euthanasia">Euthanasia</option>
                                    <option value="Missing">Missing</option>
                                    <option value="Stolen">Stolen</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-2">Reason / Details</label>
                                <textarea 
                                    value={archiveForm.reason}
                                    onChange={(e) => setArchiveForm(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder={archiveForm.type === 'Death' ? "Cause of death, circumstances, disposal method..." : "Transfer destination, loan details, sale information..."}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-500 transition-all outline-none min-h-[100px] resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setIsArchiveModalOpen(false)}
                                className="flex-1 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleArchiveSubmit}
                                disabled={!archiveForm.reason}
                                className="flex-1 bg-slate-900 text-white py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                                Commit to Archive
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AnimalProfile;
