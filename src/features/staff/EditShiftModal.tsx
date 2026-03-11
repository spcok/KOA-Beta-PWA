import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save } from 'lucide-react';
import { ShiftType, Shift } from '../../types';
import { useRotaData } from './useRotaData';
import { useUsersData } from '../settings/useUsersData';

interface EditShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingShift: Shift | null;
}

const EditShiftModal: React.FC<EditShiftModalProps> = ({ isOpen, onClose, existingShift }) => {
  const { register, handleSubmit, reset } = useForm<Partial<Shift>>();
  const { updateShift } = useRotaData();
  const { users } = useUsersData();

  useEffect(() => {
    if (existingShift) {
      reset(existingShift);
    }
  }, [existingShift, reset]);

  if (!isOpen || !existingShift) return null;

  const onSubmit = async (data: Partial<Shift>) => {
    const user = users.find(u => u.id === data.user_id);
    await updateShift(existingShift.id, {
      ...data,
      user_name: user?.name || existingShift.user_name,
      user_role: user?.role || existingShift.user_role
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Shift</h2>
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
          
          <button type="submit" className="w-full bg-emerald-600 text-white p-2 rounded flex items-center justify-center gap-2">
            <Save size={18} /> Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditShiftModal;
