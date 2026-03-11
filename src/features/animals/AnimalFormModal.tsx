import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Check, Camera, Sparkles, Loader2, Zap, Shield, History, Info, Globe, Skull, Users, Thermometer } from 'lucide-react';
import { Animal, AnimalCategory, HazardRating, ConservationStatus } from '../../types';
import { useAnimalForm } from './useAnimalForm';

interface AnimalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Animal | null;
  locations?: string[]; 
}

const AnimalFormModal: React.FC<AnimalFormModalProps> = ({ isOpen, onClose, initialData, locations = [] }) => {
  const {
    form,
    isAiPending,
    handleImageUpload,
    onSubmit,
    isSubmitting,
    errors,
  } = useAnimalForm({ initialData, onClose });

  const { register, watch, setValue } = form;

  const category = watch('category');
  const imageUrl = watch('image_url');
  const distroUrl = watch('distribution_map_url');
  const isBird = category === AnimalCategory.OWLS || category === AnimalCategory.RAPTORS;

  // Track if Environmental Controls are required
  const [envNa, setEnvNa] = useState<boolean>(
      initialData ? (!initialData.target_day_temp_c && !initialData.target_night_temp_c && !initialData.target_humidity_min_percent && !initialData.misting_frequency) : true
  );

  const handleEnvNaToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isNa = e.target.checked;
      setEnvNa(isNa);
      if (isNa) {
          // Clear out the values if N/A is checked so they wipe from the DB
          setValue('target_day_temp_c', null);
          setValue('target_night_temp_c', null);
          setValue('target_humidity_min_percent', null);
          setValue('target_humidity_max_percent', null);
          setValue('misting_frequency', null);
      }
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-500 transition-all placeholder-slate-400";
  const errorClass = "text-red-600 text-xs mt-1";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{initialData ? 'Edit' : 'Add'} Animal Record</h2>
                    <p className="text-sm text-slate-500">ZLA 1981 Statutory Registry</p>
                </div>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                <input type="hidden" {...register('image_url')} />
                <input type="hidden" {...register('distribution_map_url')} />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 h-fit">
                        <section>
                            <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Profile Photo</h3>
                            <div className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                                <img 
                                  src={imageUrl || `https://picsum.photos/seed/${uuidv4()}/400/400`} 
                                  alt="Subject" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <label className="absolute inset-0 bg-black/5 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                    <div className="bg-white/90 p-2 rounded-full shadow-sm"><Camera size={16} /></div>
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image_url')} className="hidden" />
                                </label>
                            </div>
                        </section>
                        <section className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col">
                            <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2"><Globe size={16}/> Range Map</h3>
                            <div className="relative group flex-1 rounded-md overflow-hidden border border-slate-200 bg-white">
                                {distroUrl ? (
                                    <img src={distroUrl} alt="Range Map" className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-xs">No Map</div>
                                )}
                                <label className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 cursor-pointer flex items-center justify-center transition-opacity">
                                    <span className="bg-white text-slate-900 px-2 py-1 rounded text-xs font-medium shadow-sm">Upload</span>
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'distribution_map_url')} className="hidden" />
                                </label>
                            </div>
                        </section>
                    </div>

                    <div className="lg:col-span-8 space-y-8">
                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2"><Info size={18}/> Identification & Taxonomy</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                <div className="sm:col-span-5">
                                    <label className={labelClass}>Subject Name *</label>
                                    <input {...register('name')} className={inputClass} placeholder="e.g. Barnaby" />
                                    {errors.name && <p className={errorClass}>{errors.name.message}</p>}
                                </div>
                                <div className="sm:col-span-4">
                                    <label className={labelClass}>Section *</label>
                                    <select {...register('category')} className={inputClass}>
                                        {(Object.values(AnimalCategory) as string[]).filter(cat => cat !== 'ALL').map(cat => <option key={String(cat)} value={cat}>{cat}</option>)}
                                    </select>
                                    {errors.category && <p className={errorClass}>{errors.category.message}</p>}
                                </div>
                                <div className="sm:col-span-3">
                                    <label className={labelClass}>Location *</label>
                                    <input {...register('location')} list="location-list" className={inputClass} placeholder="Select location..." />
                                    <datalist id="location-list">
                                        {(locations as string[]).map(loc => <option key={String(loc)} value={loc} />)}
                                    </datalist>
                                    {errors.location && <p className={errorClass}>{errors.location.message}</p>}
                                </div>
                                <div className="sm:col-span-12">
                                    <label className={labelClass}>Group Name</label>
                                    <input {...register('group_name')} className={inputClass} placeholder="e.g. The Mob" />
                                </div>
                            </div>

                            {category === AnimalCategory.MAMMALS && (
                                <div className="md:col-span-12 bg-amber-50 p-3 rounded-md border border-amber-200 flex items-center gap-3">
                                    <div className="p-1.5 bg-white rounded border border-amber-200 text-amber-600"><Users size={16}/></div>
                                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                                        <input type="checkbox" {...register('is_group_animal')} className="w-4 h-4 accent-amber-600 rounded focus:ring-amber-500"/>
                                        <div>
                                            <span className="text-sm font-medium text-amber-900 block">Group / Mob Designation</span>
                                            <span className="text-xs text-amber-700 block">Classify this record as a collective group (e.g. Meerkat Mob)</span>
                                        </div>
                                    </label>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                <div className="sm:col-span-7">
                                    <label className={labelClass}>Common Species *</label>
                                    <div className="flex gap-2">
                                        <input {...register('species')} className={inputClass} placeholder="e.g. Barn Owl" />
                                        <button 
                                          type="button" 
                                          disabled={isAiPending} 
                                          className="px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                        >
                                            {isAiPending ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                        </button>
                                    </div>
                                    {errors.species && <p className={errorClass}>{errors.species.message}</p>}
                                </div>
                                <div className="sm:col-span-5">
                                    <label className={labelClass}>Scientific Name</label>
                                    <input {...register('latin_name')} className={`${inputClass} italic`} placeholder="e.g. Tyto alba" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                <div className="sm:col-span-4">
                                    <label className={labelClass}>Sex</label>
                                    <select {...register('sex')} className={inputClass}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Unknown">Unknown</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className={labelClass}>Date of Birth</label>
                                        <div className="flex items-center gap-1">
                                            <input type="checkbox" {...register('is_dob_unknown')} />
                                            <span className="text-xs text-slate-500">Unknown</span>
                                        </div>
                                    </div>
                                    <input type="date" {...register('dob')} className={inputClass} />
                                </div>
                                <div className="sm:col-span-4">
                                    <label className={labelClass}>IUCN Status</label>
                                    <select {...register('red_list_status')} className={inputClass}>
                                        {(Object.values(ConservationStatus) as string[]).map(s => <option key={String(s)} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                                <History size={16} /> Statutory Acquisition & Pedigree
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className={labelClass}>Date of Arrival *</label>
                                    <input type="date" {...register('acquisition_date')} className={inputClass} />
                                    {errors.acquisition_date && <p className={errorClass}>{errors.acquisition_date.message}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>Acquisition Type</label>
                                    <select {...register('acquisition_type')} className={inputClass}>
                                        <option value="UNKNOWN">Unknown</option>
                                        <option value="BORN">Born</option>
                                        <option value="TRANSFERRED_IN">Transferred In</option>
                                        <option value="RESCUE">Rescue</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Source / Origin *</label>
                                    <input {...register('origin')} className={inputClass} placeholder="e.g. International Centre for Birds of Prey" />
                                    {errors.origin && <p className={errorClass}>{errors.origin.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Sire (Father)</label>
                                    <input {...register('sire_id')} className={inputClass} placeholder="Ancestry ID or Name" />
                                </div>
                                <div>
                                    <label className={labelClass}>Dam (Mother)</label>
                                    <input {...register('dam_id')} className={inputClass} placeholder="Ancestry ID or Name" />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2"><Zap size={18}/> Markers & Biometrics</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="sm:col-span-2 lg:col-span-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className={labelClass}>Identification</label>
                                        <div className="flex items-center gap-1">
                                            <input type="checkbox" {...register('has_no_id')} />
                                            <span className="text-xs text-slate-500">No ID</span>
                                        </div>
                                    </div>
                                    <div className={`grid ${isBird ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                        <input {...register('microchip_id')} className={`${inputClass} font-mono`} placeholder="Microchip..." />
                                        {isBird && <input {...register('ring_number')} className={`${inputClass} font-mono`} placeholder="Ring..." />}
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Hazard Class</label>
                                    <select {...register('hazard_rating')} className={inputClass}>
                                        {(Object.values(HazardRating) as string[]).map(h => <option key={String(h)} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                
                                {isBird ? (
                                    <div>
                                        <label className={labelClass}>Water Tipping Temp (°C)</label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            {...register('water_tipping_temp', { 
                                                setValueAs: v => v === "" ? null : parseFloat(v) 
                                            })} 
                                            className={inputClass} 
                                            placeholder="e.g. 2.0" 
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className={labelClass}>Water Tipping Temp (°C)</label>
                                        <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-400 cursor-not-allowed text-center font-medium shadow-inner">
                                            N/A for {category}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col justify-end">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-md border border-slate-300 hover:border-blue-500 transition-all">
                                        <input type="checkbox" {...register('is_venomous')} />
                                        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Skull size={14}/> Venomous</span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* NEW: TARGET ENVIRONMENT SECTION */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Thermometer size={18}/> Target Environment
                                </h3>
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={envNa} 
                                        onChange={handleEnvNaToggle}
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-0.5">N/A (No Temp Controls)</span>
                                </label>
                            </div>
                            
                            {!envNa ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div>
                                        <label className={labelClass}>Day Temp (°C)</label>
                                        <input type="number" step="0.1" {...register('target_day_temp_c', { setValueAs: v => v === "" ? null : parseFloat(v) })} className={inputClass} placeholder="28.5" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Night Temp (°C)</label>
                                        <input type="number" step="0.1" {...register('target_night_temp_c', { setValueAs: v => v === "" ? null : parseFloat(v) })} className={inputClass} placeholder="22.0" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Min Humidity %</label>
                                        <input type="number" {...register('target_humidity_min_percent', { setValueAs: v => v === "" ? null : parseInt(v) })} className={inputClass} placeholder="60" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Max Humidity %</label>
                                        <input type="number" {...register('target_humidity_max_percent', { setValueAs: v => v === "" ? null : parseInt(v) })} className={inputClass} placeholder="80" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Misting Freq.</label>
                                        <input type="text" {...register('misting_frequency')} className={inputClass} placeholder="e.g. Twice Daily" />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full px-3 py-6 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-sm text-slate-400 text-center font-medium shadow-inner">
                                    Environmental controls disabled for this subject.
                                </div>
                            )}
                        </section>

                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-6 pt-6 border-t border-slate-200 pb-2">
                    <div className="flex items-center gap-3 text-slate-500">
                        <Shield size={20}/>
                        <p className="text-xs font-medium">I verify this record is an accurate entry into the statutory stock ledger.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium transition-colors">Discard</button>
                        <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                            {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Check size={16} />}
                            {isSubmitting ? 'Authorizing...' : 'Authorize'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
  );
};

export default AnimalFormModal;
