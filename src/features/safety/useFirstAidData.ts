import { db } from '../../lib/db';
import { FirstAidLog } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export function useFirstAidData() {
  const logsData = useHybridQuery<FirstAidLog[]>(
    'first_aid_logs',
    supabase.from('first_aid_logs').select('*'),
    () => db.first_aid_logs.toArray(),
    []
  );
  const isLoading = logsData === undefined;
  const logs = logsData || [];

  const addFirstAid = async (log: Omit<FirstAidLog, 'id'>) => {
    const newLog = {
      ...log,
      id: uuidv4(),
    };
    await mutateOnlineFirst('first_aid_logs', newLog as Record<string, unknown>, 'upsert');
  };

  const deleteFirstAid = async (id: string) => {
    await mutateOnlineFirst('first_aid_logs', { id }, 'delete');
  };

  return {
    logs,
    isLoading,
    addFirstAid,
    deleteFirstAid
  };
}
