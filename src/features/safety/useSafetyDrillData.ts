import { db } from '../../lib/db';
import { SafetyDrill } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export function useSafetyDrillData() {
  const drillsData = useHybridQuery<SafetyDrill[]>(
    'safety_drills',
    supabase.from('safety_drills').select('*'),
    () => db.safety_drills.toArray(),
    []
  );
  const isLoading = drillsData === undefined;
  const drills = drillsData || [];

  const addDrillLog = async (drill: Omit<SafetyDrill, 'id'>) => {
    const newDrill = {
      ...drill,
      id: uuidv4(),
    };
    await mutateOnlineFirst('safety_drills', newDrill as Record<string, unknown>, 'upsert');
  };

  const deleteDrillLog = async (id: string) => {
    await mutateOnlineFirst('safety_drills', { id }, 'delete');
  };

  return {
    drills,
    isLoading,
    addDrillLog,
    deleteDrillLog
  };
}
