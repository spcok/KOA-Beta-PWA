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
  let offlineQuery: () => T | Promise<T>;
  let deps: unknown[];

  if (typeof queryOrDexieFn === 'function') {
    onlineQuery = supabase.from(tableName as string).select('*');
    offlineQuery = queryOrDexieFn as () => T | Promise<T>;
    deps = (dexieFnOrDeps as unknown[]) || [];
  } else {
    onlineQuery = queryOrDexieFn as PromiseLike<{ data: unknown; error: unknown }>;
    offlineQuery = typeof dexieFnOrDeps === 'function' ? (dexieFnOrDeps as () => T | Promise<T>) : (() => dexieFnOrDeps as T);
    deps = depsOrUndefined || [];
  }

  // 1. Reactive Dexie state
  const data = useLiveQuery(offlineQuery, deps);

  // 2. Background Supabase fetch
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const { data: remoteData, error } = await onlineQuery;
        
        if (error) throw error;

        if (remoteData && isMounted) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const table = db[tableName] as import('dexie').Table<any, any>;
          const pk = table.schema.primKey.keyPath;

          // Queue Protection: Get IDs of items currently in sync queue
          const queuedItems = await db.sync_queue.where('table_name').equals(tableName as string).toArray();
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
                  
                  // 🚨 VULNERABILITY FIX: Prioritize updated_at over created_at to correctly gauge age
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
                  // 🚨 VULNERABILITY FIX: Prioritize updated_at over created_at to correctly gauge age
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

  // Apply implicit filtering for soft deletes to maintain ZLA 1981 audit trails in DB but hide from UI
  const filteredData = Array.isArray(data)
    ? data.filter((item: Record<string, unknown>) => !item.is_deleted)
    : (data as Record<string, unknown>)?.is_deleted ? undefined : data;

  return filteredData as T;
}

/**
 * archiveAnimal
 * Moves an animal to the archived_animals table.
 */
export async function archiveAnimal(animal: Animal, reason: string, type: NonNullable<Animal['archive_type']>) {
  let newDispositionStatus = 'Transferred'; // default for Disposition
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
  
  // Dexie transaction
  await db.transaction('rw', db.animals, db.archived_animals, async () => {
    await db.archived_animals.add(archivedAnimal);
    await db.animals.delete(animal.id);
  });

  // Safe transaction routing for archiving: Queue for Sync and trigger background process
  await queueSync('archived_animals', animal.id, 'upsert', archivedAnimal);
  await queueSync('animals', animal.id, 'delete', { id: animal.id });

  if (navigator.onLine) {
    processSyncQueue().catch(err => console.error('🛠️ [Engine QA] Archive sync deferred:', err));
  }
}

/**
 * restoreAnimal
 * Moves an animal back to the animals table.
 */
export async function restoreAnimal(animal: Animal) {
  const restoredAnimal = {
    ...animal,
    updated_at: new Date().toISOString()
  };
  
  // Dexie transaction
  await db.transaction('rw', db.animals, db.archived_animals, async () => {
    await db.animals.add(restoredAnimal);
    await db.archived_animals.delete(animal.id);
  });

  // Safe transaction routing for restoration: Queue for Sync and trigger background process
  await queueSync('animals', animal.id, 'upsert', restoredAnimal as unknown as Record<string, unknown>);
  await queueSync('archived_animals', animal.id, 'delete', { id: animal.id });

  if (navigator.onLine) {
    processSyncQueue().catch(err => console.error('🛠️ [Engine QA] Restore sync deferred:', err));
  }
}

export async function queueSync(tableName: string, recordId: string, operation: 'upsert' | 'delete', payload: Record<string, unknown>) {
  const existing = await db.sync_queue.filter(item => item.table_name === tableName && item.record_id === recordId).first();
  
  // Priority logic:
  // 1: Critical daily logs
  // 2: Medical, incidents, missing_animals
  // 3: Movements & transfers
  // 4: Everything else
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
      status: 'pending', // Reset status if updated
      retry_count: 0,    // Reset retries if updated
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

/**
 * mutateOnlineFirst
 * SaaS mutation pattern: Optimistic UI - Update local Dexie first, then queue for Supabase.
 */
export async function mutateOnlineFirst<T extends { id?: string | number }>(
  tableName: keyof AppDatabase, 
  payload: T, 
  operation: 'upsert' | 'delete' = 'upsert'
) {
  if (!payload.id) payload.id = crypto.randomUUID();
  const table = db[tableName] as import('dexie').Table<unknown, string>;

  try {
    // 1. Optimistic Update (Local Dexie)
    if (operation === 'upsert') {
      // Inject updated_at for conflict resolution
      (payload as Record<string, unknown>).updated_at = new Date().toISOString();
      await table.put(payload);
      
      // 2. Queue for Sync
      await queueSync(tableName as string, payload.id as string, operation, payload as Record<string, unknown>);
    } else {
      // Tier-2 Soft Deletes & Blob Cleanup
      
      // Step 1: Blob Cleanup - Prevent storage bloat by removing orphaned media queue items
      await db.media_upload_queue
        .filter(item => item.tableName === tableName && item.recordId === payload.id)
        .delete();
      
      // Step 2: Soft Delete Conversion - Maintain audit trail per ZLA 1981
      const softDeletePayload = payload as Record<string, unknown>;
      softDeletePayload.is_deleted = true;
      softDeletePayload.deleted_at = new Date().toISOString();
      softDeletePayload.updated_at = new Date().toISOString();
      
      // Step 3: Execution - Upsert locally and queue as upsert to Supabase
      await table.put(payload);
      await queueSync(tableName as string, payload.id as string, 'upsert', softDeletePayload);
    }

    // 3. Trigger Sync Process (Background)
    if (navigator.onLine) {
      processSyncQueue().catch(err => console.warn('🛠️ [Engine QA] Background sync deferred:', err));
    }
  } catch (error) {
    console.error('🛠️ [Engine QA] Critical Mutation Error:', error);
    // Even if local update fails, we try to queue it if we have the ID
    if (payload.id) {
      try {
        await queueSync(tableName as string, payload.id as string, operation, payload as Record<string, unknown>);
      } catch (queueError) {
        console.error('🛠️ [Engine QA] Fatal: Could not write to sync_queue:', queueError);
      }
    }
  }
}