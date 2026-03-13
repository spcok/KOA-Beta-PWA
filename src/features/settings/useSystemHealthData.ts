import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { forceHydrateFromCloud } from '../../lib/syncEngine';

export function useSystemHealthData() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [isWipingData, setIsWipingData] = useState(false);
  const [wipeProgress, setWipeProgress] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const tableCounts = useLiveQuery(async () => {
    return {
      animals: await db.animals.count(),
      users: await db.users.count(),
      daily_logs: await db.daily_logs.count(),
      tasks: await db.tasks.count(),
      medical_logs: await db.medical_logs.count()
    };
  }, []);

  const executeForceRebuild = async () => {
    setIsHydrating(true);
    try {
      await forceHydrateFromCloud();
      return true;
    } catch (error) {
      console.error("Hydration failed:", error);
      return false;
    } finally {
      setIsHydrating(false);
    }
  };

  const executeClearQueue = async () => {
    setIsClearingQueue(true);
    try {
      await db.sync_queue.clear();
      return true;
    } catch (error) {
      console.error("Failed to clear queue:", error);
      return false;
    } finally {
      setIsClearingQueue(false);
    }
  };

  const executeWipeData = async () => {
    setIsWipingData(true);
    setWipeProgress(0);

    const tablesToWipe = [
      'animals', 'daily_logs', 'tasks', 'medical_logs', 'mar_charts',
      'quarantine_records', 'internal_movements', 'external_transfers',
      'timesheets', 'holidays', 'contacts', 'zla_documents',
      'safety_drills', 'maintenance_logs', 'first_aid_logs',
      'incidents', 'daily_rounds'
    ];

    try {
      for (let i = 0; i < tablesToWipe.length; i++) {
        const table = tablesToWipe[i];
        
        // Wipe Cloud Database
        await supabase.from(table).delete().not('id', 'is', null);
        
        // Wipe Local IndexedDB Cache
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbTable = db[table as keyof typeof db] as any;
        if (dbTable && dbTable.clear) {
          await dbTable.clear();
        }

        setWipeProgress(Math.round(((i + 1) / tablesToWipe.length) * 100));
      }
      return true;
    } catch (error) {
      console.error("Data wipe failed:", error);
      return false;
    } finally {
      setIsWipingData(false);
      setWipeProgress(0);
    }
  };

  return { 
    isOnline, isHydrating, tableCounts: tableCounts || { animals: 0, users: 0, daily_logs: 0, tasks: 0, medical_logs: 0 },
    executeForceRebuild, executeClearQueue, isClearingQueue,
    executeWipeData, isWipingData, wipeProgress
  };
}