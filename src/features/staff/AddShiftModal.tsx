import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save } from 'lucide-react';
import { ShiftType, Shift } from '../../types';
import { useRotaData } from './useRotaData';
import { useUsersData } from '../settings/useUsersData';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddShiftModal: React.FC<AddShiftModalProps> = ({ isOpen, onClose }) => {
  const { register, handleSubmit } = useForm<Omit<Shift, 'id' | 'pattern_id' | 'user_name' | 'user_role'>>();
  const { createShift } = useRotaData();
  const { users } = useUsersData();
  const [repeat, setRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState(1);

  if (!isOpen) return null;

  const onSubmit = async (data: Omit<Shift, 'id' | 'pattern_id' | 'user_name' | 'user_role'>) => {
    const user = users.find(u => u.id === data.user_id);
    await createShift({
      ...data,
      user_name: user?.name || 'Unknown',
      user_role: user?.role || 'Unknown'
    }, repeat ? repeatDays : [], repeat ? weeks : 1);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Add Shift</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <select {...register('user_id', { required: true })} className="w-full border p-2 rounded">
            <option value="">Select User</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="date" {...register('date', { required: true })} className="w-full border p-2 rounded" />
          <select {...register('shift_type', { required: true })} className="w-full border p-2 rounded">
            {Object.values(ShiftType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="time" {...register('start_time', { required: true })} className="w-full border p-2 rounded" />
            <input type="time" {...register('end_time', { required: true })} className="w-full border p-2 rounded" />
          </div>
          <input type="text" {...register('assigned_area')} placeholder="Assigned Area" className="w-full border p-2 rounded" />
          
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} />
            Repeat Shift?
          </label>

          {repeat && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <button key={i} type="button" onClick={() => setRepeatDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])} className={`p-2 rounded ${repeatDays.includes(i) ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>
                    {day}
                  </button>
                ))}
              </div>
              <input type="number" value={weeks} onChange={e => setWeeks(Number(e.target.value))} placeholder="Duration (Weeks)" className="w-full border p-2 rounded" />
            </div>
          )}

          <button type="submit" className="w-full bg-emerald-600 text-white p-2 rounded flex items-center justify-center gap-2">
            <Save size={18} /> Save Shift
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddShiftModal;
