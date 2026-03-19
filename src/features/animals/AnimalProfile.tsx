import React, { useState, useMemo } from 'react';
import { Animal, LogType, HazardRating } from '../../types';
import { 
  ChevronLeft, Printer, Edit, 
  AlertTriangle, Plus, Archive, Skull, 
  Loader2, Info,
  History, Heart, FileText, RotateCcw, Fingerprint, Layers, Zap, ClipboardCheck,
  Calendar, User, MapPin, Map, Scale, Utensils, Thermometer, Droplets
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
import DailyLog from '../husbandry/DailyLog';
import MedicalRecords from '../medical/MedicalRecords';
import Tasks from '../husbandry/Tasks';

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

  const latestWeight = useMemo(() => {
      const weightLogs = logs.filter(l => l.log_type === LogType.WEIGHT).sort((a,b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());
      return weightLogs[0];
  }, [logs]);

  const lastFeed = useMemo(() => {
      const feedLogs = logs.filter(l => l.log_type === LogType.FEED).sort((a,b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());
      return feedLogs[0];
  }, [logs]);

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

  const [activeTab, setActiveTab] = useState<'Overview' | 'History' | 'Medical' | 'Tasks' | 'Training'>('Overview');
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
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
        
        {/* 1. TOP NAVIGATION */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900">
                    <ChevronLeft size={24} />
                </button>
                <div className="hidden sm:block">
                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Subject Registry</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kent Owl Academy</p>
                </div>
            </div>
            {isArchived && (
                <div className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm">
                    <AlertTriangle size={16} /> Archived
                </div>
            )}
        </div>

        {/* MAIN CONTAINER */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            
            {/* 2. THE ID CARD (Bulletproof Flexbox) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row overflow-hidden">
                
                {/* Fixed-Width Photo Block */}
                <div className="w-full md:w-[320px] shrink-0 bg-slate-100 border-r border-slate-200/50">
                    {/* The aspect-[4/3] safely constrains the height based on the width */}
                    <div className="w-full aspect-[4/3] relative">
                        <img src={animal.image_url || 'https://picsum.photos/seed/placeholder/800/600'} alt={animal.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-sm">
                            <IUCNBadge status={animal.red_list_status} size="md" />
                        </div>
                    </div>
                </div>

                {/* ZLA Information Block */}
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-100 gap-4">
                        <div className="min-w-0">
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 truncate">
                                {String(animal.name)}
                                {isHighHazard && <span className="text-rose-500 animate-pulse shrink-0"><Skull size={20}/></span>}
                            </h2>
                            <p className="text-sm font-medium text-slate-500 mt-1 truncate">{String(animal.latin_name || animal.species)}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject ID</p>
                            <p className="text-sm font-mono font-bold text-slate-900">{String(animal.id).split('-')[0].toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Calendar size={12}/> Entry/DOB</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{animal.acquisition_date ? new Date(animal.acquisition_date).toLocaleDateString('en-GB') : (animal.dob ? new Date(animal.dob).toLocaleDateString('en-GB') : 'Unknown')}</p>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><User size={12}/> Sex</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{String(animal.sex || 'Unknown')}</p>
                        </div>
                        <div className="min-w-0 lg:col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin size={12}/> Origin / Source</p>
                            <p className="text-sm font-bold text-slate-900 truncate">
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">{String(animal.acquisition_type || 'UNKNOWN').replace('_', ' ')}</span>
                                {String(animal.origin || animal.location || 'Unknown')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-2 min-w-[140px]">
                            <Fingerprint size={14} className="text-slate-400 shrink-0"/>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Microchip</p>
                                <p className="text-xs font-mono font-bold text-slate-900 leading-none truncate">{String(animal.microchip_id || 'N/A')}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-2 min-w-[140px]">
                            <Layers size={14} className="text-slate-400 shrink-0"/>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ring No.</p>
                                <p className="text-xs font-mono font-bold text-slate-900 leading-none truncate">{String(animal.ring_number || 'N/A')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. ACTION BAR */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    {!isArchived && (
                        <>
                            {permissions.edit_animals && (
                                <button onClick={() => setIsEditProfileOpen(true)} className="px-3 sm:px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                                    <Edit size={16} /> <span className="hidden sm:inline">Edit</span>
                                </button>
                            )}
                            <button onClick={() => setIsSignGeneratorOpen(true)} className="px-3 sm:px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                                <Printer size={16} /> <span className="hidden sm:inline">Sign</span>
                            </button>
                            {animal.acquisition_type === 'BORN' && (
                                <button onClick={handleGenerateBirthCertificate} className="px-3 sm:px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                                    <FileText size={16} /> <span className="hidden sm:inline">Cert</span>
                                </button>
                            )}
                            {permissions.archive_animals && (
                                <button onClick={() => setIsArchiveModalOpen(true)} className="px-3 sm:px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                                    <Archive size={16} /> <span className="hidden sm:inline">Archive</span>
                                </button>
                            )}
                        </>
                    )}
                    {isArchived && (
                        <button onClick={handleRestore} className="px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                            <RotateCcw size={16} /> Restore Subject
                        </button>
                    )}
                </div>
                {!isArchived && (
                    <button onClick={() => { setEntryType(LogType.GENERAL); setIsAddEntryOpen(true); }} className="w-full sm:w-auto px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                        <Plus size={16} /> Log Activity
                    </button>
                )}
            </div>

            {/* 4. TABS NAVIGATION */}
            <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex gap-1 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'Overview', icon: Info, label: 'Overview' },
                    { id: 'History', icon: History, label: 'Daily Log' },
                    { id: 'Medical', icon: Heart, label: 'Clinical Record' },
                    { id: 'Tasks', icon: ClipboardCheck, label: 'Tasks' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'Overview' | 'History' | 'Medical' | 'Tasks')}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>
            
            {/* 5. TAB CONTENT */}
            <div className="space-y-6">
                
                 {/* OVERVIEW TAB */}
                 {activeTab === 'Overview' && (
                    <div className="space-y-6">
                        {/* Weight & Nutrition KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Weight Card */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Scale size={18} /></div>
                                        <h4 className="text-sm font-bold text-slate-900">Current Weight</h4>
                                    </div>
                                    <button onClick={() => { setEntryType(LogType.WEIGHT); setIsAddEntryOpen(true); }} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-md">
                                        + Log Weight
                                    </button>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-1">
                                        {latestWeight?.log_type === LogType.WEIGHT ? (
                                            (() => {
                                                if (latestWeight.weight_grams) return formatWeightDisplay(latestWeight.weight_grams, animal.weight_unit);
                                                const parsedGrams = parseLegacyWeightToGrams(latestWeight.value);
                                                if (parsedGrams !== null) return formatWeightDisplay(parsedGrams, animal.weight_unit);
                                                return latestWeight.weight ? `${latestWeight.weight}${latestWeight.weight_unit || 'g'}` : String(latestWeight.value || 'N/A');
                                            })()
                                        ) : String(latestWeight?.value || 'N/A')}
                                    </h3>
                                    <p className="text-sm font-medium text-slate-500">
                                        {latestWeight ? `Last recorded ${new Date(latestWeight.log_date).toLocaleDateString('en-GB')}` : 'No records found'}
                                    </p>
                                </div>
                            </div>

                            {/* Nutrition Card */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Utensils size={18} /></div>
                                            <h4 className="text-sm font-bold text-slate-900">Nutrition Status</h4>
                                        </div>
                                        <button onClick={() => { setEntryType(LogType.FEED); setIsAddEntryOpen(true); }} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-md">
                                            + Log Feed
                                        </button>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-900 line-clamp-1">{String(lastFeed?.value || 'No recent intake')}</p>
                                    <p className="text-xs text-slate-500 mt-1 italic line-clamp-1">{String(lastFeed?.notes || '')}</p>
                                </div>
                                <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Flight</span>
                                    <span className="text-sm font-black text-slate-900">
                                        {animal.flying_weight_g ? formatWeightDisplay(animal.flying_weight_g, animal.weight_unit) : '--'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Narrative & Environment Boxes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Info size={16} className="text-blue-600"/> Profile Narrative</h3>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{String(animal.description || 'No profile narrative recorded.')}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Map size={16} className="text-emerald-600"/> Enclosure & Environment</h3>
                                <div className="space-y-4">
                                    {animal.enclosure_id && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Assigned Enclosure</p>
                                            <p className="text-sm font-medium text-slate-900">{String(animal.enclosure_id)}</p>
                                        </div>
                                    )}
                                    {animal.temp_range && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Temperature Parameters</p>
                                            <p className="text-sm font-medium text-slate-900">{String(animal.temp_range)}</p>
                                        </div>
                                    )}
                                    {animal.uvb_requirements && (
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">UVB Index Requirement</p>
                                            <p className="text-sm font-medium text-slate-900">{String(animal.uvb_requirements)}</p>
                                        </div>
                                    )}
                                    {!animal.enclosure_id && !animal.temp_range && !animal.uvb_requirements && (
                                        <p className="text-sm text-slate-500 italic">No specific environmental parameters recorded.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                 )}

                 {/* TAB ROUTING FOR THE REST OF THE COMPONENTS */}
                 {activeTab === 'History' && <DailyLog animalId={animalId} />}
                 {activeTab === 'Medical' && <MedicalRecords animalId={animalId} />}
                 {activeTab === 'Tasks' && <Tasks animalId={animalId} />}
            </div>
        </div>
        {isArchived && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 flex items-center gap-3 mb-6">
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
{/* LEFT COLUMN: THE BULLETPROOF ID CARD */}
<div className="lg:col-span-4 space-y-6 min-w-0">
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-w-0">
        
        {/* THE PHOTO - Fixed max-width on tablet/desktop to prevent blowout */}
        <div className="w-full md:w-72 lg:w-80 shrink-0 bg-slate-100 relative">
            <img 
                src={animal.image_url || 'https://picsum.photos/seed/placeholder/800/600'} 
                alt={animal.name} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
            />
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full p-0.5 shadow-sm">
                <IUCNBadge status={animal.red_list_status} size="sm" />
            </div>
        </div>

        {/* THE INFO - Fills the rest of the card */}
        <div className="p-6 flex-1 min-w-0 flex flex-col justify-center">
            
            {/* Header: Name & Subject ID */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        {String(animal.name)}
                        {isHighHazard && <span className="text-rose-500 animate-pulse"><Skull size={18}/></span>}
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">{String(animal.latin_name || animal.species)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject ID</p>
                    <p className="text-sm font-mono font-bold text-slate-900">{String(animal.id).split('-')[0].toUpperCase()}</p>
                </div>
            </div>

            {/* ZLA & Core Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Entry / Hatched</p>
                    <p className="text-sm font-bold text-slate-900 truncate">
                        {animal.acquisition_date ? new Date(animal.acquisition_date).toLocaleDateString('en-GB') : (animal.dob ? new Date(animal.dob).toLocaleDateString('en-GB') : 'Unknown')}
                    </p>
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Sex</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{String(animal.sex || 'Unknown')}</p>
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Source</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{String(animal.acquisition_type || 'Unknown').replace('_', ' ')}</p>
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Location</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{String(animal.location)}</p>
                </div>
            </div>

            {/* Distinctive Marks (ID Plates) */}
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 min-w-[140px] flex-1 sm:flex-none">
                    <Fingerprint size={14} className="text-slate-400 shrink-0"/>
                    <div className="min-w-0">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Microchip</p>
                        <p className="text-xs font-mono font-bold text-slate-900 leading-none truncate">{String(animal.microchip_id || 'N/A')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 min-w-[140px] flex-1 sm:flex-none">
                    <Layers size={14} className="text-slate-400 shrink-0"/>
                    <div className="min-w-0">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Ring No.</p>
                        <p className="text-xs font-mono font-bold text-slate-900 leading-none truncate">{String(animal.ring_number || 'N/A')}</p>
                    </div>
                </div>
            </div>

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
                        { id: 'Medical', icon: Heart, label: 'Clinical File' },
                        { id: 'Training', icon: Zap, label: 'Training' },
                        { id: 'Tasks', icon: ClipboardCheck, label: 'Tasks' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'Overview' | 'History' | 'Medical' | 'Training' | 'Tasks')}
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
                                {/* Weight & Nutrition Stats */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                    <h4 className="text-xs font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                        <Heart size={14}/> Weight & Nutrition
                                    </h4>
                                    <div className="flex gap-4">
                                        <div>
                                            <p className="text-[10px] text-slate-500">Current Weight</p>
                                            <p className="text-sm font-bold text-slate-900">{animal.weight ? formatWeightDisplay(animal.weight, animal.weight_unit) : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500">Feed Type</p>
                                            <p className="text-sm font-bold text-slate-900">{String(animal.feed_type || 'N/A')}</p>
                                        </div>
                                    </div>
                                </div>
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
                    
                    {/* TAB CONTENT: TRAINING */}
                    {activeTab === 'Training' && (
                        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm text-center">
                            <Zap size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900">Training Records</h3>
                            <p className="text-sm text-slate-500 mt-2">Training module is currently under development.</p>
                        </div>
                    )}

                    {/* TAB CONTENT: TASKS */}
                    {activeTab === 'Tasks' && (
                        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm text-center">
                            <ClipboardCheck size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900">Task List</h3>
                            <p className="text-sm text-slate-500 mt-2">Task management module is currently under development.</p>
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
