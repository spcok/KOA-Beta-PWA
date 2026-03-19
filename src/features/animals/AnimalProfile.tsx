import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, AlertTriangle, Skull, Calendar, User, MapPin, 
    FileText, Fingerprint, Layers, Edit, Printer, Archive, 
    Plus, Info, History as HistoryIcon, Heart, Scale, Utensils, 
    RotateCcw, Loader2 
} from 'lucide-react';
import { useAnimalProfileData } from './useAnimalProfileData';
import { usePermissions } from '../../hooks/usePermissions';
import { formatWeightDisplay, parseLegacyWeightToGrams } from '../../services/weightUtils';
import { LogType, HazardRating } from '../../types';
import { IUCNBadge } from './IUCNBadge';
import AnimalFormModal from './AnimalFormModal';
import AddEntryModal from './AddEntryModal';
import SignGenerator from './SignGenerator';
import DailyLog from '../husbandry/DailyLog';
import MedicalRecords from '../medical/MedicalRecords';

export const AnimalProfile = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const permissions = usePermissions();
    
    // Core Data Hook
    const { animal, latestWeight, lastFeed, loading } = useAnimalProfileData(id);

    // UI State
    const [activeTab, setActiveTab] = useState<'Overview' | 'History' | 'Medical'>('Overview');
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
    const [isSignGeneratorOpen, setIsSignGeneratorOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [entryType, setEntryType] = useState<LogType>(LogType.GENERAL);

    if (loading) {
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
                    <p className="text-slate-500 text-sm font-medium mt-2">The requested animal profile does not exist.</p>
                </div>
                <button onClick={() => navigate('/animals')} className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium transition-colors">
                    Return to Registry
                </button>
            </div>
        );
    }

    const isHighHazard = animal.hazard_rating === HazardRating.HIGH || animal.is_venomous;
    const isArchived = animal.status === 'ARCHIVED' || animal.status === 'DECEASED';

    const handleGenerateBirthCertificate = () => {
        alert("Birth Certificate generation will be implemented here.");
    };

    const handleRestore = () => {
        alert("Restore functionality will be implemented here.");
    };

    return (
        <div className="bg-slate-50 min-h-screen pb-24 font-sans">
            
            {/* 1. TOP NAVIGATION */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="hidden sm:block">
                        <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Subject Registry</h1>
                    </div>
                </div>
                {isArchived && (
                    <div className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm">
                        <AlertTriangle size={16} /> Archived Record
                    </div>
                )}
            </div>

            {/* MAIN CONTAINER */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                
                {/* 2. THE ID CARD - STRAIGHTJACKET PHOTO */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
                    
                    {/* PHOTO CONTAINER: Absolutely strictly capped at 256x192 pixels. It cannot grow. */}
                    <div className="w-[256px] h-[192px] shrink-0 relative rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-slate-100">
                        <img 
                            src={animal.image_url || 'https://picsum.photos/seed/placeholder/800/600'} 
                            alt={animal.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                        />
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-sm">
                            <IUCNBadge status={animal.red_list_status} size="sm" />
                        </div>
                    </div>

                    {/* ZLA & IDENTITY INFO CONTAINER */}
                    <div className="flex-1 flex flex-col justify-center text-center md:text-left min-w-0 w-full">
                        <div className="mb-6 pb-5 border-b border-slate-100">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-1">
                                <div>
                                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center justify-center md:justify-start gap-3">
                                        {String(animal.name)}
                                        {isHighHazard && <span className="text-rose-500 animate-pulse bg-rose-50 p-1.5 rounded-full"><Skull size={24}/></span>}
                                    </h2>
                                    <p className="text-sm sm:text-base font-medium text-slate-500 italic mt-1">{String(animal.latin_name || animal.species)}</p>
                                </div>
                                <div className="md:text-right mt-2 md:mt-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject ID</p>
                                    <span className="text-sm font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{String(animal.id).split('-')[0].toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6 mb-6 text-left">
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate flex items-center gap-1.5"><Calendar size={12}/> Entry / DOB</p>
                                <p className="text-sm font-bold text-slate-900 truncate">{animal.acquisition_date ? new Date(animal.acquisition_date).toLocaleDateString('en-GB') : (animal.dob ? new Date(animal.dob).toLocaleDateString('en-GB') : 'Unknown')}</p>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate flex items-center gap-1.5"><User size={12}/> Sex</p>
                                <p className="text-sm font-bold text-slate-900 truncate">{String(animal.sex || 'Unknown')}</p>
                            </div>
                            <div className="min-w-0 col-span-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate flex items-center gap-1.5"><MapPin size={12}/> Origin / Source</p>
                                <p className="text-sm font-bold text-slate-900 truncate">
                                    <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2">{String(animal.acquisition_type || 'UNKNOWN').replace('_', ' ')}</span>
                                    {String(animal.origin || animal.location || 'Unknown')}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                <Fingerprint size={14} className="text-slate-400"/>
                                <span className="font-bold text-slate-500 text-[10px] uppercase tracking-widest">Chip</span>
                                <span className="font-mono font-bold text-slate-900 ml-1">{String(animal.microchip_id || 'N/A')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                <Layers size={14} className="text-slate-400"/>
                                <span className="font-bold text-slate-500 text-[10px] uppercase tracking-widest">Ring</span>
                                <span className="font-mono font-bold text-slate-900 ml-1">{String(animal.ring_number || 'N/A')}</span>
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
                                    <button onClick={() => setIsEditProfileOpen(true)} className="px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                                        <Edit size={16} /> <span className="hidden sm:inline">Edit Profile</span>
                                    </button>
                                )}
                                <button onClick={() => setIsSignGeneratorOpen(true)} className="px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                                    <Printer size={16} /> <span className="hidden sm:inline">Signage</span>
                                </button>
                                {animal.acquisition_type === 'BORN' && (
                                    <button onClick={handleGenerateBirthCertificate} className="px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                                        <FileText size={16} /> <span className="hidden sm:inline">Birth Cert</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    {!isArchived && (
                        <button onClick={() => { setEntryType(LogType.GENERAL); setIsAddEntryOpen(true); }} className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                            <Plus size={16} /> Log Activity
                        </button>
                    )}
                </div>

                {/* 4. TABS NAVIGATION */}
                <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex gap-1 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'Overview', icon: Info, label: 'Overview' },
                        { id: 'History', icon: HistoryIcon, label: 'Daily Log' },
                        { id: 'Medical', icon: Heart, label: 'Clinical Record' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'Overview' | 'History' | 'Medical')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                                activeTab === tab.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Weight Card */}
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Scale size={20} /></div>
                                            <h4 className="text-sm font-bold text-slate-900">Current Weight</h4>
                                        </div>
                                        <button onClick={() => { setEntryType(LogType.WEIGHT); setIsAddEntryOpen(true); }} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md">
                                            + Log
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
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl"><Utensils size={20} /></div>
                                                <h4 className="text-sm font-bold text-slate-900">Nutrition Status</h4>
                                            </div>
                                            <button onClick={() => { setEntryType(LogType.FEED); setIsAddEntryOpen(true); }} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md">
                                                + Log
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

                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Info size={18} className="text-blue-600"/> Profile Narrative</h3>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{String(animal.description || 'No profile narrative recorded.')}</p>
                            </div>
                        </div>
                     )}

                     {/* TAB ROUTING FOR INJECTED COMPONENTS */}
                     {activeTab === 'History' && (
                         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
                             <DailyLog animalId={animal.id} />
                         </div>
                     )}
                     {activeTab === 'Medical' && (
                         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
                             <MedicalRecords animalId={animal.id} />
                         </div>
                     )}
                </div>
            </div>

            {/* MODALS */}
            {isEditProfileOpen && (
                <AnimalFormModal 
                    isOpen={isEditProfileOpen} 
                    onClose={() => setIsEditProfileOpen(false)} 
                    animalToEdit={animal} 
                />
            )}
            {isAddEntryOpen && (
                <AddEntryModal 
                    isOpen={isAddEntryOpen} 
                    onClose={() => setIsAddEntryOpen(false)} 
                    animalId={animal.id}
                    preselectedType={entryType}
                />
            )}
            {isSignGeneratorOpen && (
                <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
                    <div className="p-4 flex justify-end sticky top-0 bg-white/80 backdrop-blur-sm z-10 border-b border-slate-200">
                        <button onClick={() => setIsSignGeneratorOpen(false)} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold">
                            Close Sign Generator
                        </button>
                    </div>
                    <SignGenerator animal={animal} />
                </div>
            )}
        </div>
    );
};