import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, AppDatabase } from './db';
import { supabase } from './supabase';
import { Animal } from '../types';
import { processSyncQueue } from './syncEngine';

export function useHybridQuery<T>(
  tableName: keyof AppDatabase,
  queryOrDexieFn: (() => T | Promise<T>) | PromiseLike<{ data: unknown; error: unknown }>,
  dexieFnOrDeps?: (() => T | Promise<T>) | unknown[],
  depsOrUndefined?: unknown[]
): T | undefined {
  let onlineQuery: PromiseLike<{ data: unknown; error: unknown }>;
  let offlineQuery: () => Promise<{ status: string; data: T | [] }>;
  let deps: unknown[];

  if (typeof queryOrDexieFn === 'function') {
    onlineQuery = supabase.from(tableName as string).select('*');
    const originalOfflineQuery = queryOrDexieFn as () => T | Promise<T>;
    offlineQuery = async () => {
      try {
        const localData = await originalOfflineQuery();
        if (!localData || (Array.isArray(localData) && localData.length === 0)) {
          console.warn(`🛠️ [Sync Engine] Cold Boot Detected: No local data for ${tableName as string}`);
          return { status: 'cold_offline', data: [] }; // DO NOT throw an error here.
        }
        return { status: 'offline_cache', data: localData };
      } catch (cacheError) {
        console.warn(`🛠️ [Sync Engine] Cache read failed for ${tableName as string}:`, cacheError);
        return { status: 'cold_offline', data: [] };
      }
    };
    deps = (dexieFnOrDeps as unknown[]) || [];
  } else {
    onlineQuery = queryOrDexieFn as PromiseLike<{ data: unknown; error: unknown }>;
    const originalOfflineQuery = typeof dexieFnOrDeps === 'function' ? (dexieFnOrDeps as () => T | Promise<T>) : (() => dexieFnOrDeps as T);
    offlineQuery = async () => {
      try {
        const localData = await originalOfflineQuery();
        if (!localData || (Array.isArray(localData) && localData.length === 0)) {
          console.warn(`🛠️ [Sync Engine] Cold Boot Detected: No local data for ${tableName as string}`);
          return { status: 'cold_offline', data: [] }; // DO NOT throw an error here.
        }
        return { status: 'offline_cache', data: localData };
      } catch (cacheError) {
        console.warn(`🛠️ [Sync Engine] Cache read failed for ${tableName as string}:`, cacheError);
        return { status: 'cold_offline', data: [] };
      }
    };
    deps = depsOrUndefined || [];
  }

  const queryResult = useLiveQuery(offlineQuery, deps);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        // FIXED: Safe Promise.all implementation for TypeScript
        const remotePromise = Promise.resolve(onlineQuery);
        const queuePromise = db.sync_queue.where('table_name').equals(tableName as string).toArray();

        const [remoteResult, queuedItems] = await Promise.all([remotePromise, queuePromise]);
        const { data: remoteData, error } = remoteResult;
        
        if (error) throw error;

        if (remoteData && isMounted) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const table = db[tableName] as import('dexie').Table<any, any>;
          const pk = table.schema.primKey.keyPath;

          const queuedIds = new Set(queuedItems.map(item => item.record_id));

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isValid = (item: any) => {
            if (typeof pk === 'string') {
              const id = item[pk];
              return id !== undefined && id !== null && !queuedIds.has(String(id));
            }
            return item && !queuedIds.has(String(item.id));
          };

          if (Array.isArray(remoteData)) {
            const validItems = remoteData.filter(isValid);
            if (validItems.length > 0) {
              await db.transaction('rw', table, async () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const localItems = await table.bulkGet(validItems.map(i => (i as any)[pk as any]));
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const itemsToPut = validItems.filter((remoteItem: any, index) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const localItem: any = localItems[index];
                  if (!localItem) return true;
                  
                  const remoteTime = new Date(remoteItem.updated_at || remoteItem.created_at || 0).getTime();
                  const localTime = new Date(localItem.updated_at || localItem.created_at || 0).getTime();
                  
                  return remoteTime >= localTime;
                });
                
                if (itemsToPut.length > 0) {
                  await table.bulkPut(itemsToPut);
                }
              });
            }
          } else {
            if (isValid(remoteData)) {
              await db.transaction('rw', table, async () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const localItem: any = await table.get((remoteData as any)[pk as any]);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const remoteItem: any = remoteData;
                
                if (!localItem) {
                  await table.put(remoteData);
                } else {
                  const remoteTime = new Date(remoteItem.updated_at || remoteItem.created_at || 0).getTime();
                  const localTime = new Date(localItem.updated_at || localItem.created_at || 0).getTime();
                  
                  if (remoteTime >= localTime) {
                    await table.put(remoteData);
                  }
                }
              });
            }
          }
        }
      } catch (err) {
        console.error(`🛠️ [Engine QA] HybridQuery Error [${tableName}]:`, err);
      }
    }

    const handleOnline = () => fetchData();
    if (navigator.onLine) fetchData();
    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, ...deps]);

  const actualData = queryResult ? queryResult.data : undefined;

  const filteredData = Array.isArray(actualData)
    ? actualData.filter((item: Record<string, unknown>) => !item.is_deleted)
    : (actualData as Record<string, unknown>)?.is_deleted ? undefined : actualData;

  if (queryResult && (queryResult as { status?: string }).status === 'cold_offline') {
    if (!navigator.onLine) {
      const result = [] as unknown as T;
      (result as { status?: string }).status = 'cold_offline';
      return result;
    } else {
      return [] as unknown as T;
    }
  }

  return filteredData as T;
}

export async function archiveAnimal(animal: Animal, reason: string, type: NonNullable<Animal['archive_type']>) {
  let newDispositionStatus = 'Transferred';
  if (type === 'Death' || type === 'Euthanasia') newDispositionStatus = 'Deceased';
  if (type === 'Missing') newDispositionStatus = 'Missing';
  if (type === 'Stolen') newDispositionStatus = 'Stolen';

  const archivedAnimal = { 
    ...animal, 
    archive_type: type,
    archive_reason: reason, 
    disposition_status: newDispositionStatus as NonNullable<Animal['disposition_status']>,
    archived_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await db.transaction('rw', db.animals, db.archived_animals, async () => {
    await db.archived_animals.add(archivedAnimal);
    await db.animals.delete(animal.id);
  });

  queueSync('archived_animals', animal.id, 'upsert', archivedAnimal).catch(console.error);
  queueSync('animals', animal.id, 'delete', { id: animal.id }).catch(console.error);
}

export async function restoreAnimal(animal: Animal) {
  const restoredAnimal = {
    ...animal,
    updated_at: new Date().toISOString()
  };
  
  await db.transaction('rw', db.animals, db.archived_animals, async () => {
    await db.animals.add(restoredAnimal);
    await db.archived_animals.delete(animal.id);
  });

  queueSync('animals', animal.id, 'upsert', restoredAnimal as unknown as Record<string, unknown>).catch(console.error);
  queueSync('archived_animals', animal.id, 'delete', { id: animal.id }).catch(console.error);
}

export async function queueSync(tableName: string, recordId: string, operation: 'upsert' | 'delete', payload: Record<string, unknown>) {
  // FLASH UPGRADE: O(1) Compound Index Lookup replaces slow .filter()
  const existing = await db.sync_queue.where('[table_name+record_id]').equals([tableName, recordId]).first();
  
  let priority = 4;
  if (tableName === 'daily_logs') priority = 1;
  else if (['medical_logs', 'incidents', 'missing_animals'].includes(tableName)) priority = 2;
  else if (['internal_movements', 'external_transfers'].includes(tableName)) priority = 3;

  if (existing) {
    await db.sync_queue.put({ 
      ...existing, 
      payload, 
      operation, 
      priority,
      status: 'pending',
      retry_count: 0,
      updated_at: new Date().toISOString() 
    });
  } else {
    await db.sync_queue.add({
      table_name: tableName,
      record_id: recordId,
      operation,
      payload,
      status: 'pending',
      priority,
      retry_count: 0,
      created_at: new Date().toISOString()
    });
  }
}

export async function mutateOnlineFirst<T extends { id?: string | number }>(
  tableName: keyof AppDatabase, 
  payload: T, 
  operation: 'upsert' | 'delete' = 'upsert'
) {
  if (!payload.id) payload.id = crypto.randomUUID();
  const table = db[tableName] as import('dexie').Table<unknown, string>;

  try {
    if (operation === 'upsert') {
      (payload as Record<string, unknown>).updated_at = new Date().toISOString();
      await table.put(payload);
      
      // FLASH UPGRADE: Fire and forget to instantly unblock the UI
      queueSync(tableName as string, payload.id as string, operation, payload as Record<string, unknown>)
        .then(() => { if (navigator.onLine) processSyncQueue().catch(console.error); })
        .catch(err => console.error('🛠️ [Engine QA] Queue Error:', err));
        
    } else {
      await db.media_upload_queue
        .filter(item => item.tableName === tableName && item.recordId === payload.id)
        .delete();
      
      const softDeletePayload = payload as Record<string, unknown>;
      softDeletePayload.is_deleted = true;
      softDeletePayload.deleted_at = new Date().toISOString();
      softDeletePayload.updated_at = new Date().toISOString();
      
      await table.put(payload);
      
      // FLASH UPGRADE: Fire and forget to instantly unblock the UI
      queueSync(tableName as string, payload.id as string, 'upsert', softDeletePayload)
        .then(() => { if (navigator.onLine) processSyncQueue().catch(console.error); })
        .catch(err => console.error('🛠️ [Engine QA] Queue Error:', err));
    }
  } catch (error) {
    console.error('🛠️ [Engine QA] Critical Mutation Error:', error);
  }
}