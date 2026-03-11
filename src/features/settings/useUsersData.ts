import { db } from '../../lib/db';
import { User, RolePermissionConfig } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export function useUsersData() {
  const usersData = useHybridQuery<User[]>(
    'users',
    supabase.from('users').select('*'),
    () => db.users.toArray(),
    []
  );

  const rolePermissionsData = useHybridQuery<RolePermissionConfig[]>(
    'role_permissions',
    supabase.from('role_permissions').select('*'),
    () => db.role_permissions.toArray(),
    []
  );

  const isLoading = usersData === undefined || rolePermissionsData === undefined;
  const users = usersData || [];
  const rolePermissions = rolePermissionsData || [];

  const addUser = async (user: Omit<User, 'id'>) => {
    const id = uuidv4();
    const newUser = { ...user, id } as User;
    await mutateOnlineFirst('users', newUser, 'upsert');
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const user = await db.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates };
      await mutateOnlineFirst('users', updatedUser, 'upsert');
    }
  };

  const deleteUser = async (id: string) => {
    const userShifts = await db.shifts.where('user_id').equals(id).toArray();
    for (const shift of userShifts) {
      await mutateOnlineFirst('shifts', { id: shift.id }, 'delete');
    }
    await mutateOnlineFirst('users', { id }, 'delete');
  };

  return { users, rolePermissions, isLoading, addUser, updateUser, deleteUser };
}
