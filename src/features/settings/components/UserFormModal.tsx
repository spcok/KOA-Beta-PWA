import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../../../types';
import { SignatureCapture } from '../../../components/ui/SignatureCapture';
import { supabase } from '../../../lib/supabase';
import { db } from '../../../lib/db';

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
  password?: string;
  pin?: string;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<UserFormInputs>();
  
  // Decoupled States
  const [isCapturingSignature, setIsCapturingSignature] = useState(false);
  const [currentSignature, setCurrentSignature] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    setGlobalError(null);
    if (initialData) {
      setValue('name', initialData.name);
      setValue('email', initialData.email);
      setValue('role', initialData.role);
      setValue('initials', initialData.initials);
      setValue('pin', initialData.pin);
      setCurrentSignature(initialData.signature_data);
    } else {
      reset({
        name: '',
        email: '',
        role: UserRole.VOLUNTEER,
        initials: '',
        password: '',
        pin: ''
      });
      setCurrentSignature(undefined);
    }
  }, [initialData, setValue, reset, isOpen]);

  if (!isOpen) return null;

  const onSubmit = async (data: UserFormInputs) => {
    console.log("📍 1. Submit clicked! Starting process...");
    setGlobalError(null);
    setIsSubmitting(true);
    
    try {
      if (initialData) {
        console.log("📍 2. EDIT MODE detected. Running local onSave prop...");
        await onSave({
          ...data,
          initials: data.initials.toUpperCase(),
          signature_data: currentSignature,
          permissions: initialData.permissions || {}
        } as Omit<User, 'id'>);
        console.log("📍 3. onSave completed successfully.");
      } else {
        console.log("📍 2. CREATE MODE detected. Preparing payload...");
        if (!data.password) throw new Error('Password is required for new accounts.');
        
        const profileData = {
          name: data.name,
          role: data.role,
          initials: data.initials.toUpperCase(),
          pin: data.pin,
          signature_data: currentSignature
        };

        console.log("📍 3. Firing Edge Function. Waiting for Supabase response...");
        const { data: response, error } = await supabase.functions.invoke('create-staff-account', {
          body: {
            email: data.email,
            password: data.password,
            profileData: profileData
          }
        });

        console.log("📍 4. Edge Function replied!", { response, error });
        if (error) throw new Error(`Network Error: ${error.message}`);
        if (response?.error) throw new Error(response.error);

        // FORCE LOCAL CACHE UPDATE: Pull the newly created user and insert into Dexie
        const { data: newUser } = await supabase.from('users').select('*').eq('email', data.email).single();
        if (newUser) {
          await db.users.put(newUser);
        }
      }
      
      console.log("📍 5. Success! Firing onClose()...");
      onClose();
      console.log("📍 6. onClose() completed.");
    } catch (error: unknown) {
      console.error('📍 ❌ Catch Block Triggered. Operation Failed:', error);
      setGlobalError(error instanceof Error ? error.message : "An unexpected error occurred.");
    } finally {
      console.log("📍 7. Finally Block Triggered. Resetting isSubmitting state.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {initialData ? 'Edit Staff Member' : 'Add Staff Member'}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {initialData ? 'Update account details and access' : 'Create new authenticated access account'}
            </p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="mx-8 mt-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <AlertCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest">Account Creation Failed</h4>
              <p className="text-sm font-medium text-rose-600 mt-1">{globalError}</p>
            </div>
          </div>
        )}

        {/* Form Body - Now in a Grid */}
        <form 
          onSubmit={handleSubmit(
            onSubmit, 
            (validationErrors) => {
              console.error("REACT-HOOK-FORM VALIDATION BLOCKED SUBMISSION:", validationErrors);
              alert("Form validation failed. Check the console for hidden errors.");
            }
          )} 
          className="p-8 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: Personal Details */}
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest border-b border-slate-100 pb-2">Account Details</h4>
              
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
                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email address" }
                  })}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-slate-900"
                  placeholder="e.g. john@kentowlacademy.com"
                />
                {errors.email && <p className="text-rose-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Initials (Max 3)</label>
                <input
                  {...register('initials', { required: 'Initials required', maxLength: { value: 3, message: 'Max 3 characters' } })}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-slate-900 uppercase"
                  placeholder="JS"
                />
                {errors.initials && <p className="text-rose-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.initials.message}</p>}
              </div>
            </div>

            {/* Right Column: Security & Access */}
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest border-b border-slate-100 pb-2">Access & Security</h4>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">System Role</label>
                <select
                  {...register('role', { required: 'Role is required' })}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-slate-900 appearance-none"
                >
                  <option value={UserRole.VOLUNTEER}>Volunteer</option>
                  <option value={UserRole.KEEPER}>Keeper</option>
                  <option value={UserRole.SENIOR_KEEPER}>Senior Keeper</option>
                  <option value={UserRole.ADMIN}>Administrator</option>
                  <option value={UserRole.OWNER}>Owner</option>
                </select>
                {errors.role && <p className="text-rose-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.role.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Daily PIN (4 Digits)</label>
                <input
                  {...register('pin', { required: 'PIN is required', minLength: { value: 4, message: 'Must be 4 chars' } })}
                  type="password"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-slate-900 tracking-[0.5em]"
                  placeholder="••••"
                  maxLength={4}
                />
                {errors.pin && <p className="text-rose-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.pin.message}</p>}
              </div>

              {!initialData && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Login Password</label>
                  <input
                    {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                    type="password"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-slate-900"
                    placeholder="••••••••"
                  />
                  {errors.password && <p className="text-rose-500 text-[10px] font-bold uppercase mt-1 ml-1">{errors.password.message}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Full Width Bottom: Signature */}
          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="max-w-md">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Digital Signature</label>
              {isCapturingSignature ? (
                <SignatureCapture
                  onSave={(base64) => {
                    setCurrentSignature(base64);
                    setIsCapturingSignature(false);
                  }}
                  onCancel={() => setIsCapturingSignature(false)}
                  initialSignature={currentSignature}
                />
              ) : (
                <div className="space-y-3">
                  {currentSignature && (
                    <div className="p-4 border-2 border-slate-100 rounded-2xl bg-white">
                      <img src={currentSignature} alt="Signature" className="h-16 mx-auto" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCapturingSignature(true)}
                    className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    {currentSignature ? 'Update Signature' : 'Draw Digital Signature'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-8 py-4 border-2 border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black shadow-lg shadow-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
            >
              {isSubmitting ? 'Saving Account...' : (initialData ? 'Update Profile' : 'Create Account')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;