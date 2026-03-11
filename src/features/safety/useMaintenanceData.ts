import { db } from '../../lib/db';
import { MaintenanceLog } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export function useMaintenanceData() {
  const logsData = useHybridQuery<MaintenanceLog[]>(
    'maintenance_logs',
    supabase.from('maintenance_logs').select('*'),
    () => db.maintenance_logs.toArray(),
    []
  );
  const isLoading = logsData === undefined;
  const logs = logsData || [];

  const addLog = async (log: Omit<MaintenanceLog, 'id'>) => {
    const newLog: MaintenanceLog = {
      ...log,
      id: uuidv4(),
    };
    await mutateOnlineFirst('maintenance_logs', newLog as unknown as Record<string, unknown>, 'upsert');
  };

  const updateLog = async (log: MaintenanceLog) => {
    await mutateOnlineFirst('maintenance_logs', log, 'upsert');
  };

  const deleteLog = async (id: string) => {
    await mutateOnlineFirst('maintenance_logs', { id }, 'delete');
  };

  return {
    logs,
    isLoading,
    addLog,
    updateLog,
    deleteLog
  };
}
