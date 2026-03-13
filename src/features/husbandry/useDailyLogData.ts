import { useCallback, useMemo } from 'react';
import { LogEntry, LogType } from '../../types';
import { db } from '../../lib/db';
import { useAnimalsData } from '../animals/useAnimalsData';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export const useDailyLogData = (viewDate: string, activeCategory: string) => {
  const { animals, isLoading: animalsLoading } = useAnimalsData();

  const allLogs = useHybridQuery<LogEntry[]>(
    'daily_logs',
    supabase.from('daily_logs').select('*'),
    () => db.daily_logs.toArray(),
    []
  );

  const logs = useMemo(() => {
    if (!allLogs) return [];
    return allLogs.filter(log => log.log_date === viewDate && !(log as LogEntry & { is_deleted?: boolean }).is_deleted);
  }, [allLogs, viewDate]);

  const getTodayLog = useCallback((animalId: string, type: LogType) => {
    return logs.find(log => log.animal_id === animalId && log.log_type === type);
  }, [logs]);

  const addLogEntry = useCallback(async (entry: Partial<LogEntry>) => {
    await mutateOnlineFirst('daily_logs', entry as Record<string, unknown>, 'upsert');
  }, []);

  const filteredAnimals = useMemo(() => {
    return animals.filter(a => activeCategory === 'all' || a.category === activeCategory);
  }, [animals, activeCategory]);

  return { animals: filteredAnimals, getTodayLog, addLogEntry, isLoading: animalsLoading || allLogs === undefined };
};
