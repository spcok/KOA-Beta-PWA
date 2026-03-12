import { useState, useCallback } from 'react';
import { db } from '../../lib/db';
import { User, RolePermissionConfig } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export function useUsersData() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Physically forces the UI table to dump its cache and reload
  const forceRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const usersData = useHybridQuery<User[]>(
    'users',
    supabase.from('users').select('*'),
    () => db.users.toArray(),
    [refreshTrigger] // Tied to the refresh trigger
  );

  const rolePermissionsData = useHybridQuery<RolePermissionConfig[]>(
    'role_permissions',
    supabase.from('role_permissions').select('*'),
    () => db.role_permissions.toArray(),
    [refreshTrigger] // Tied to the refresh trigger
  );

  const isLoading = usersData === undefined || rolePermissionsData === undefined;
  const users = usersData || [];
  const rolePermissions = rolePermissionsData || [];

  const addUser = async (user: Omit<User, 'id'>) => {
    const id = uuidv4();
    const newUser = { ...user, id } as User;
    await mutateOnlineFirst('users', newUser, 'upsert');
    forceRefresh();
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const user = await db.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates };
      await mutateOnlineFirst('users', updatedUser, 'upsert');
      forceRefresh();
    }
  };

  const deleteUser = async (id: string) => {
    const userShifts = await db.shifts.where('user_id').equals(id).toArray();
    for (const shift of userShifts) {
      await mutateOnlineFirst('shifts', { id: shift.id }, 'delete');
    }
    await mutateOnlineFirst('users', { id }, 'delete');
    forceRefresh();
  };

  return { users, rolePermissions, isLoading, addUser, updateUser, deleteUser, forceRefresh };
}
