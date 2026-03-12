import React, { useState } from 'react';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import { User } from '../../../types';
import { useUsersData } from '../useUsersData';
import UserFormModal from '../components/UserFormModal';

const UsersView: React.FC = () => {
  const { users, isLoading, deleteUser, addUser, updateUser, forceRefresh } = useUsersData();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const handleDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      await deleteUser(user.id);
    }
  };

  const handleAddUser = async (data: Omit<User, 'id'>) => {
    await addUser(data);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Staff Directory</h3>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          <UserPlus size={18} />
          Add Staff
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-widest">Name</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-widest">Email</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-widest">Role</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingUser(user)} className="text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button onClick={() => handleDelete(user)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingUser && (
        <UserFormModal 
          isOpen={!!editingUser} 
          onClose={() => setEditingUser(null)} 
          initialData={editingUser}
          onSave={async (data) => {
            await updateUser(editingUser.id, data);
            setEditingUser(null);
          }} 
          onSuccess={forceRefresh}
        />
      )}
      {isAddModalOpen && (
        <UserFormModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onSave={handleAddUser} 
          onSuccess={forceRefresh}
        />
      )}
    </div>
  );
};

export default function AccessControl() {
  return <UsersView />;
}
