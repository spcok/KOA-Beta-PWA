import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Save, Loader2 } from 'lucide-react';
import { Animal, LogType, LogEntry, AnimalCategory } from '../../types';
import { getMaidstoneDailyWeather } from '../../services/weatherService';
import { mutateOnlineFirst } from '../../lib/dataEngine';
import { useOperationalLists } from '../../hooks/useOperationalLists';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Partial<LogEntry>) => void;
  animal: Animal;
  initialType: LogType;
  existingLog?: LogEntry;
  initialDate: string;
  allAnimals: Animal[];
  defaultTemperature?: number;
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  animal,
  initialType,
  existingLog,
  initialDate,
  defaultTemperature
}) => {
  const { foodTypes, feedMethods, eventTypes } = useOperationalLists(animal.category);
  const [logType, setLogType] = useState<LogType>(initialType);
  const [date, setDate] = useState(initialDate);
  const [value, setValue] = useState(existingLog?.value || '');
  const [foodType, setFoodType] = useState<string>(() => {
    if (existingLog?.log_type === LogType.FEED && existingLog.value) {
      const parts = existingLog.value.split(' - ');
      return parts.length > 1 ? parts[0] : 'Other';
    }
    return '';
  });

  useEffect(() => {
    if (!foodType && foodTypes.length > 0) {
      setFoodType(foodTypes[0].value);
    }
    if (logType === LogType.EVENT && !value && eventTypes.length > 0) {
      setValue(eventTypes[0].value);
    }
  }, [foodTypes, eventTypes, logType, foodType, value]);
  const [foodQuantity, setFoodQuantity] = useState<string>(() => {
    if (existingLog?.log_type === LogType.FEED && existingLog.value) {
      const parts = existingLog.value.split(' - ');
      return parts.length > 1 ? parts[1] : existingLog.value;
    }
    return '';
  });
  const [notes, setNotes] = useState(() => {
    if (existingLog?.log_type === LogType.FEED && existingLog.notes) {
      try {
        const parsed = JSON.parse(existingLog.notes);
        return parsed.userNotes || '';
      } catch {
        return existingLog.notes;
      }
    }
    return existingLog?.notes || '';
  });
  const [cast, setCast] = useState<'AM' | 'PM' | 'NO' | 'N/A'>(() => {
    if (existingLog?.log_type === LogType.FEED && existingLog.notes) {
      try {
        const parsed = JSON.parse(existingLog.notes);
        return parsed.cast || 'N/A';
      } catch {
        return 'N/A';
      }
    }
    return 'N/A';
  });
  const [weight, setWeight] = useState<number | ''>(existingLog?.weight ?? existingLog?.weight_grams ?? '');
  const [weightUnit, setWeightUnit] = useState<'g' | 'kg' | 'oz' | 'lbs' | 'lbs_oz'>(existingLog?.weight_unit || animal.weight_unit || 'g');
  const [baskingTemp, setBaskingTemp] = useState<number | ''>(existingLog?.basking_temp_c || '');
  const [coolTemp, setCoolTemp] = useState<number | ''>(existingLog?.cool_temp_c || '');
  const [temperature, setTemperature] = useState<number | ''>(existingLog?.temperature_c ?? defaultTemperature ?? '');
  const [healthRecordType, setHealthRecordType] = useState(existingLog?.health_record_type || '');
  const [litterSize, setLitterSize] = useState<number | ''>('');
  const [litterHealth, setLitterHealth] = useState<string>('Healthy');
  const [userInitials, setUserInitials] = useState('');
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  const handleFetchWeatherInsideModal = async () => {
    if (isWeatherLoading) return;
    setIsWeatherLoading(true);
    try {
      const weather = await getMaidstoneDailyWeather();
      setTemperature(Math.round(weather.currentTemp));
      setNotes(prev => prev ? `${prev} | ${weather.description}` : weather.description);
    } catch (error) {
      console.error('Failed to auto-fetch weather', error);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Form Validation Armor
    if (!date) {
      setError('Date is required.');
      return;
    }
    if (!userInitials || userInitials.trim().length < 2) {
      setError('Staff initials are required (min 2 characters).');
      return;
    }
    if (!animal || !animal.id) {
      setError('Animal ID is missing.');
      return;
    }

    if (logType === LogType.FEED && (!foodType || !foodQuantity)) {
      setError('Both Food Type and Quantity are required.');
      return;
    }

    if (logType === LogType.WEIGHT && weight === '') {
      setError('Weight is required.');
      return;
    }

    if (logType === LogType.TEMPERATURE) {
      if (animal.category === AnimalCategory.EXOTICS) {
        if (baskingTemp === '' || coolTemp === '') {
          setError('Both Basking and Cool temperatures are required for exotics.');
          return;
        }
      } else if (temperature === '') {
        setError('Temperature is required.');
        return;
      }
    }

    if (logType === LogType.HEALTH && !healthRecordType) {
      setError('Health Record Type is required.');
      return;
    }

    if (logType === LogType.EVENT && !value) {
      setError('Event Type is required.');
      return;
    }

    if (logType === LogType.BIRTH && (litterSize === '' || !litterHealth)) {
      setError('Litter Size and Health are required for birth logs.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const finalValue = logType === LogType.FEED ? `${foodType} - ${foodQuantity}` : (value || logType);
      
      const entry: Partial<LogEntry> = {
        id: existingLog?.id || uuidv4(),
        animal_id: animal.id,
        log_type: logType,
        log_date: date,
        value: finalValue,
        user_initials: userInitials.toUpperCase(),
        notes: logType === LogType.FEED ? JSON.stringify({ cast, feedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), userNotes: notes }) : notes,
      };

      if (logType === LogType.WEIGHT && weight !== '') {
        entry.weight = Number(weight);
        entry.weight_unit = weightUnit;
        // Keep weight_grams for backward compatibility if needed, or just use weight
        if (weightUnit === 'g') entry.weight_grams = Number(weight);
        else if (weightUnit === 'kg') entry.weight_grams = Number(weight) * 1000;
        else if (weightUnit === 'oz') entry.weight_grams = Number(weight) * 28.3495;
        else if (weightUnit === 'lbs') entry.weight_grams = Number(weight) * 453.592;
        
        entry.value = `${weight}${weightUnit}`;
      }

      if (logType === LogType.TEMPERATURE) {
        if (animal.category === AnimalCategory.EXOTICS) {
          if (baskingTemp !== '' && coolTemp !== '') {
            entry.basking_temp_c = Number(baskingTemp);
            entry.cool_temp_c = Number(coolTemp);
            entry.value = `${baskingTemp}°C | ${coolTemp}°C`;
            entry.notes = JSON.stringify({ basking: Number(baskingTemp), cool: Number(coolTemp) });
          }
        } else {
          if (temperature !== '') entry.temperature_c = Number(temperature);
          entry.value = `${temperature}°C`;
        }
      }

      if (logType === LogType.HEALTH) {
        entry.health_record_type = healthRecordType;
        entry.value = healthRecordType;
      }

      if (logType === LogType.BIRTH) {
        entry.value = `Litter Size: ${litterSize} (${litterHealth})`;
        
        if (!existingLog && typeof litterSize === 'number' && litterSize > 0) {
          const pups = Array.from({ length: litterSize }).map((_, i) => {
            return {
              id: uuidv4(),
              name: `Pup ${i + 1} (${animal.name})`,
              species: animal.species,
              category: animal.category,
              dob: date,
              is_dob_unknown: false,
              sex: 'Unknown',
              location: animal.location,
              acquisition_date: date,
              acquisition_type: 'BORN',
              origin: 'Captive Bred',
              dam_id: animal.sex === 'Female' ? animal.id : undefined,
              sire_id: animal.sex === 'Male' ? animal.id : undefined,
              group_name: animal.group_name || animal.name,
              archived: false,
              is_quarantine: false,
              display_order: 0,
            } as Animal;
          });
          
          for (const pup of pups) {
            await mutateOnlineFirst('animals', pup, 'upsert');
          }
        }
      }

      // Optimistic UI & Offline Reset Stability
      // We don't await the mutateOnlineFirst here if it's just the log entry, 
      // we pass it to onSave which handles it, or we handle it here if onSave is just a callback.
      // Wait, looking at the original code, it just calls onSave(entry).
      // The parent component handles the actual mutateOnlineFirst for the log entry.
      // So we just call onSave and close.
      onSave(entry);
      
      if (!navigator.onLine) {
        console.log('🛠️ [Husbandry QA] Saved Offline');
        // A toast could be triggered here or in the parent.
      }
      
      onClose();
    } catch (err) {
      console.error('🛠️ [Husbandry QA] Error saving entry:', err);
      setError('An error occurred while saving. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFields = () => {
    switch (logType) {
      case LogType.WEIGHT:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Weight</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={e => setWeight(e.target.value ? Number(e.target.value) : '')}
                className="form-input flex-1 block w-full rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="Enter weight..."
                required
              />
              <select
                value={weightUnit}
                onChange={e => setWeightUnit(e.target.value as 'g' | 'kg' | 'oz' | 'lbs' | 'lbs_oz')}
                className="form-select inline-flex items-center rounded-none rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="oz">oz</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
          </div>
        );
      case LogType.FEED:
        return (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Food Type</label>
                <select 
                  value={foodType} 
                  onChange={e => setFoodType(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold text-sm"
                >
                  {foodTypes.map(opt => (
                    <option key={opt.id} value={opt.value}>{opt.value}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Quantity / Amount</label>
                <input 
                  type="text" 
                  value={foodQuantity} 
                  onChange={e => setFoodQuantity(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold text-sm"
                  placeholder="e.g. 2x, 50g"
                  required
                />
              </div>
            </div>
            {feedMethods.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Method</label>
                <div className="flex flex-wrap gap-2">
                  {feedMethods.map(method => (
                    <button 
                      key={method.id} 
                      type="button" 
                      onClick={() => setNotes(prev => prev ? `${prev} | ${method.value}` : method.value)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      {method.value}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cast</label>
              <select 
                value={cast} 
                onChange={_ => setCast(_.target.value as 'AM' | 'PM' | 'NO' | 'N/A')}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
                <option value="NO">NO</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
          </div>
        );
      case LogType.TEMPERATURE:
        if (animal.category === AnimalCategory.EXOTICS) {
          return (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Basking Temp (°C)</label>
                <input 
                  type="number" 
                  value={baskingTemp} 
                  onChange={e => setBaskingTemp(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cool Temp (°C)</label>
                <input 
                  type="number" 
                  value={coolTemp} 
                  onChange={e => setCoolTemp(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold"
                  required
                />
              </div>
            </div>
          );
        }
        return (
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Temperature (°C)</label>
                <input 
                  type="number" 
                  value={temperature} 
                  onChange={e => setTemperature(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold"
                  required
                  disabled={isWeatherLoading}
                />
              </div>
              {animal.category === AnimalCategory.MAMMALS && (
                <button 
                  type="button" 
                  onClick={handleFetchWeatherInsideModal} 
                  disabled={isWeatherLoading}
                  className="px-4 py-3 bg-sky-50 text-sky-700 border-2 border-sky-200 rounded-xl font-bold text-xs uppercase hover:bg-sky-100 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isWeatherLoading ? <Loader2 size={14} className="animate-spin" /> : '☁️ Fetch 13:00'}
                </button>
              )}
            </div>
            {!isWeatherLoading && defaultTemperature !== undefined && !existingLog && temperature === defaultTemperature && (
              <p className="text-xs text-slate-500 mt-1">Auto-filled from local weather</p>
            )}
          </div>
        );
      case LogType.EVENT:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Event Type</label>
              <select 
                value={value} 
                onChange={e => setValue(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold"
                required
              >
                <option value="">Select Event...</option>
                {eventTypes.map(type => (
                  <option key={type.id} value={type.value}>{type.value}</option>
                ))}
              </select>
            </div>
          </div>
        );
      case LogType.HEALTH:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Record Type</label>
              <input 
                type="text" 
                value={healthRecordType} 
                onChange={e => setHealthRecordType(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold"
                placeholder="e.g. Medication, Vet Visit, Observation"
                required
              />
            </div>
          </div>
        );
      case LogType.BIRTH:
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Litter Size</label>
              <input 
                type="number" 
                value={litterSize} 
                onChange={e => setLitterSize(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Health</label>
              <select 
                value={litterHealth} 
                onChange={e => setLitterHealth(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold"
                required
              >
                <option value="Healthy">Healthy</option>
                <option value="Complications">Complications</option>
                <option value="Stillborn">Stillborn</option>
              </select>
            </div>
          </div>
        );
      case LogType.MISTING:
      case LogType.WATER:
      case LogType.GENERAL:
      default:
        return (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Value / Detail</label>
            <input 
              type="text" 
              value={value} 
              onChange={e => setValue(e.target.value)}
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold"
              placeholder={logType === LogType.MISTING ? 'e.g. Heavy mist' : logType === LogType.WATER ? 'e.g. Changed water' : 'Enter detail...'}
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {existingLog ? 'Edit' : 'Add'} {logType}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{animal.name} ({animal.species})</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Type</label>
              <select 
                value={logType} 
                onChange={e => setLogType(e.target.value as LogType)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-bold text-sm"
              >
                {Object.values(LogType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Staff Initials <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={userInitials}
              onChange={e => setUserInitials(e.target.value)}
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:ring-0 transition-all font-bold text-sm"
              placeholder="e.g. JD"
              required
              minLength={2}
            />
          </div>

          {renderFields()}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notes (Optional)</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-medium text-sm min-h-[100px] resize-none"
              placeholder="Add any additional observations..."
            />
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-widest hover:border-slate-300 transition-all"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {existingLog ? 'Update' : 'Save'} Entry
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEntryModal;
