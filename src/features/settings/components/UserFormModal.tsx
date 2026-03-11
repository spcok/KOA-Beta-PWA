import React, { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { X } from 'lucide-react';
import { User, UserRole } from '../../../types';
import { SignatureCapture } from '../../../components/ui/SignatureCapture';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<User, 'id'>) => Promise<void>;
  initialData?: User | null;
}

interface UserFormInputs {
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  signature_data?: string;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<UserFormInputs>();
  const [isCapturingSignature, setIsCapturingSignature] = useState(false);
  const signature_data = useWatch({ control, name: 'signature_data' });

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name);
      setValue('email', initialData.email);
      setValue('role', initialData.role);
      setValue('initials', initialData.initials);
      setValue('signature_data', initialData.signature_data);
    } else {
      reset({
        name: '',
        email: '',
        role: UserRole.VOLUNTEER,
        initials: '',
        signature_data: undefined
      });
    }
  }, [initialData, setValue, reset, isOpen]);

  if (!isOpen) return null;

  const onSubmit = async (data: UserFormInputs) => {
    await onSave({
      ...data,
      initials: data.initials.toUpperCase(),
      permissions: initialData?.permissions || {
        dashboard: true,
        dailyLog: true,
        tasks: true,
        medical: false,
        movements: false,
        safety: false,
        maintenance: false,
        settings: false,
        flightRecords: false,
        feedingSchedule: false,
        attendance: true,
        holidayApprover: false,
        attendanceManager: false,
        missingRecords: false,
        reports: false,
        rounds: true
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {initialData ? 'Edit Staff Member' : 'Add Staff Member'}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {initialData ? 'Update account details' : 'Create new access account'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
              <input
                {...register('name', { required: 'Name is required' })}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-slate-900"
                placeholder="e.g. John Smith"
              />
              {errors.name && <p className="text-rose-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <input
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                })}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-slate-900"
                placeholder="e.g. john@kentowlacademy.com"
              />
              {errors.email && <p className="text-rose-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Initials</label>
                <input
                  {...register('initials', { required: 'Required', maxLength: 3 })}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-slate-900 uppercase"
                  placeholder="JS"
                />
                {errors.initials && <p className="text-rose-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.initials.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">System Role</label>
              <select
                {...register('role', { required: 'Role is required' })}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-slate-900 appearance-none"
              >
                <option value={UserRole.OWNER}>Owner</option>
                <option value={UserRole.ADMIN}>Administrator</option>
                <option value={UserRole.SENIOR_KEEPER}>Senior Keeper</option>
                <option value={UserRole.KEEPER}>Keeper</option>
                <option value={UserRole.VOLUNTEER}>Volunteer</option>
              </select>
              {errors.role && <p className="text-rose-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.role.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Digital Signature</label>
              {isCapturingSignature ? (
                <SignatureCapture
                  onSave={(base64) => {
                    setValue('signature_data', base64);
                    setIsCapturingSignature(false);
                  }}
                  onCancel={() => setIsCapturingSignature(false)}
                  initialSignature={signature_data}
                />
              ) : (
                <div className="space-y-2">
                  {signature_data && <img src={signature_data} alt="Signature" className="h-16 border border-slate-200 rounded-lg p-1" />}
                  <button
                    type="button"
                    onClick={() => setIsCapturingSignature(true)}
                    className="w-full p-3 border-2 border-dashed border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    {signature_data ? 'Update Signature' : 'Add Signature'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 p-4 border-2 border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 p-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black shadow-lg shadow-slate-200 transition-all"
            >
              {initialData ? 'Update Member' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
