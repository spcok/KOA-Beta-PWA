import { useState, useEffect, useCallback, useMemo } from 'react';
import { LogEntry, LogType } from '../../types';
import { db } from '../../lib/db';
import { useAnimalsData } from '../animals/useAnimalsData';
import { mutateOnlineFirst } from '../../lib/dataEngine';

export const useDailyLogData = (viewDate: string, activeCategory: string) => {
  const { animals, isLoading: animalsLoading } = useAnimalsData();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const allLogs = await db.daily_logs.toArray();
    return allLogs.filter(log => log.log_date === viewDate);
  }, [viewDate]);

  useEffect(() => {
    let isMounted = true;
    fetchLogs().then(logs => {
      if (isMounted) {
        setLogs(logs);
        setLogsLoading(false);
      }
    });
    return () => { 
      isMounted = false; 
      setLogsLoading(true);
    };
  }, [fetchLogs]);

  const getTodayLog = useCallback((animalId: string, type: LogType) => {
    return logs.find(log => log.animal_id === animalId && log.log_type === type);
  }, [logs]);

  const addLogEntry = useCallback(async (entry: Partial<LogEntry>) => {
    await mutateOnlineFirst('daily_logs', entry as Record<string, unknown>, 'upsert');
    await fetchLogs().then(logs => setLogs(logs));
  }, [fetchLogs]);

  const filteredAnimals = useMemo(() => {
    return animals.filter(a => activeCategory === 'all' || a.category === activeCategory);
  }, [animals, activeCategory]);

  return { animals: filteredAnimals, getTodayLog, addLogEntry, isLoading: animalsLoading || logsLoading };
};
