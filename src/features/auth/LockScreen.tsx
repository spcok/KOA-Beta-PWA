import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Lock, Unlock, LogOut } from 'lucide-react';

const LockScreen: React.FC = () => {
  const { shiftPin, isUiLocked, setShiftPin, setUiLocked, logout } = useAuthStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isUiLocked && shiftPin) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftPin) {
      if (pin.length === 4 && /^\d+$/.test(pin)) {
        setShiftPin(pin);
        setPin('');
      } else {
        setError('PIN must be 4 digits');
      }
    } else {
      if (pin === shiftPin) {
        setUiLocked(false);
        setPin('');
        setError('');
      } else {
        setError('Incorrect PIN');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/95 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          {isUiLocked ? <Lock className="w-8 h-8 text-slate-600" /> : <Unlock className="w-8 h-8 text-slate-600" />}
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 mb-2">
          {isUiLocked ? 'System Locked' : 'Set Shift PIN'}
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          {isUiLocked ? 'Enter your 4-digit PIN to unlock' : 'Create a 4-digit PIN to secure your session'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full text-center text-4xl p-4 bg-slate-50 border-2 border-slate-200 rounded-xl tracking-[0.5em] focus:border-blue-500 focus:ring-0"
            placeholder="****"
          />
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-blue-700">
            {isUiLocked ? 'Unlock' : 'Set PIN'}
          </button>
        </form>

        <button 
          onClick={logout}
          className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full"
        >
          <LogOut size={14} /> Logout Completely
        </button>
      </div>
    </div>
  );
};

export default LockScreen;
