import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Loader2 } from 'lucide-react';
import { Animal, ClinicalNote } from '../../types';
import { uploadFile } from '../../lib/storageEngine';

const schema = z.object({
  animal_id: z.string().min(1, 'Animal is required'),
  date: z.string().min(1, 'Date is required'),
  note_type: z.enum(['Illness', 'Checkup', 'Injury', 'Routine']),
  diagnosis: z.string().optional(),
  bcs: z.number().min(1).max(5).optional(),
  weight: z.number().positive().optional(),
  weight_unit: z.enum(['g', 'kg', 'oz', 'lbs', 'lbs_oz']).optional(),
  note_text: z.string().min(5, 'Note must be at least 5 characters'),
  treatment_plan: z.string().optional(),
  recheck_date: z.string().optional(),
  staff_initials: z.string().min(2, 'Initials must be at least 2 characters'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Partial<ClinicalNote>) => Promise<void>;
  animals: Animal[];
  initialData?: ClinicalNote | null;
}

export const AddClinicalNoteModal: React.FC<Props> = ({ isOpen, onClose, onSave, animals, initialData }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      note_type: 'Routine',
    }
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setValue('animal_id', initialData.animal_id);
      setValue('date', initialData.date);
      setValue('note_type', initialData.note_type as 'Illness' | 'Checkup' | 'Injury' | 'Routine');
      setValue('diagnosis', initialData.diagnosis || '');
      setValue('bcs', initialData.bcs);
      setValue('weight', initialData.weight ?? initialData.weight_grams);
      setValue('weight_unit', initialData.weight_unit || 'g');
      setValue('note_text', initialData.note_text);
      setValue('treatment_plan', initialData.treatment_plan || '');
      setValue('recheck_date', initialData.recheck_date || '');
      setValue('staff_initials', initialData.staff_initials);
    } else if (isOpen && !initialData) {
      reset({
        date: new Date().toISOString().split('T')[0],
        note_type: 'Routine',
        weight_unit: 'g',
      });
    }
  }, [isOpen, initialData, setValue, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    setUploading(true);
    let attachment_url: string | undefined = initialData?.attachment_url;
    try {
      if (file) {
        attachment_url = await uploadFile(file, 'medical');
      }
      
      let weight_grams = undefined;
      if (data.weight) {
        if (data.weight_unit === 'g') weight_grams = data.weight;
        else if (data.weight_unit === 'kg') weight_grams = data.weight * 1000;
        else if (data.weight_unit === 'oz') weight_grams = data.weight * 28.3495;
        else if (data.weight_unit === 'lbs') weight_grams = data.weight * 453.592;
      }

      if (initialData) {
        await onSave({ ...initialData, ...data, weight_grams, attachment_url });
      } else {
        await onSave({ ...data, weight_grams, attachment_url });
      }
      
      reset();
      setFile(null);
      onClose();
    } catch (error) {
      console.error('Failed to save note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 my-8">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-900">{initialData ? 'Edit Clinical Note' : 'Add Clinical Note'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Animal</label>
              <select {...register('animal_id')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm">
                <option value="">Select an animal</option>
                {animals?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.animal_id && <p className="text-red-500 text-xs mt-1">{errors.animal_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Date</label>
              <input type="date" {...register('date')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Note Type</label>
              <select {...register('note_type')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm">
                <option value="Illness">Illness</option>
                <option value="Checkup">Checkup</option>
                <option value="Injury">Injury</option>
                <option value="Routine">Routine</option>
              </select>
              {errors.note_type && <p className="text-red-500 text-xs mt-1">{errors.note_type.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Diagnosis / Primary Issue</label>
              <input type="text" {...register('diagnosis')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" placeholder="e.g. Wing Fracture" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Body Condition Score (1-5)</label>
              <select {...register('bcs', { valueAsNumber: true })} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm">
                <option value="">Select BCS</option>
                <option value="1">1 - Emaciated</option>
                <option value="1.5">1.5</option>
                <option value="2">2 - Thin</option>
                <option value="2.5">2.5</option>
                <option value="3">3 - Ideal</option>
                <option value="3.5">3.5</option>
                <option value="4">4 - Overweight</option>
                <option value="4.5">4.5</option>
                <option value="5">5 - Obese</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Current Weight</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input type="number" step="0.1" {...register('weight', { valueAsNumber: true })} className="form-input flex-1 block w-full rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="e.g. 150" />
                <select {...register('weight_unit')} className="form-select inline-flex items-center rounded-none rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="oz">oz</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Clinical Observation</label>
            <textarea {...register('note_text')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" rows={4} placeholder="Detailed clinical notes..." />
            {errors.note_text && <p className="text-red-500 text-xs mt-1">{errors.note_text.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Treatment Plan</label>
            <textarea {...register('treatment_plan')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" rows={3} placeholder="Medications, procedures, or monitoring plan..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Recheck Date (Optional)</label>
              <input type="date" {...register('recheck_date')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Staff Initials <span className="text-red-500">*</span></label>
              <input type="text" {...register('staff_initials')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" required />
              {errors.staff_initials && <p className="text-red-500 text-xs mt-1">{errors.staff_initials.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Attachment (Optional)</label>
            <div className="mt-1 flex items-center gap-4">
              <label className="cursor-pointer bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition-colors">
                <Upload size={20} className="text-slate-600" />
                <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
              <span className="text-sm text-slate-500">{file ? file.name : initialData?.attachment_url ? 'Existing attachment' : 'No file selected'}</span>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || uploading} className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:bg-slate-400">
            {isSubmitting || uploading ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : 'Save Note'}
          </button>
        </form>
      </div>
    </div>
  );
};
