import React, { useState } from 'react';
import { User, UserRole } from '../../../types';
import { mutateOnlineFirst } from '../../../lib/dataEngine';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose }) => {
  const [formData, setFormData] = useState<User>(user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { permissions, ...userWithoutPermissions } = formData;
      await mutateOnlineFirst('users', userWithoutPermissions, 'upsert');
      onClose();
    } catch (error) {
      console.error('Failed to save user:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4">Edit User: {user.name}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full border rounded px-3 py-2"
            >
              {Object.values(UserRole).map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Initials</label>
            <input
              type="text"
              value={formData.initials}
              onChange={(e) => setFormData({ ...formData, initials: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Job Position</label>
            <input
              type="text"
              value={formData.job_position || ''}
              onChange={(e) => setFormData({ ...formData, job_position: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-900">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
