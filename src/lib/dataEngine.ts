import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, AppDatabase } from './db';
import { supabase } from './supabase';
import { Animal } from '../types';

// ... (rest of the file)

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
    archived_at: new Date().toISOString() 
  };
  
  // Dexie transaction
  await db.transaction('rw', db.animals, db.archived_animals, async () => {
    await db.archived_animals.add(archivedAnimal);
    await db.animals.delete(animal.id);
  });

  // Supabase
  if (navigator.onLine) {
    try {
      await supabase.from('archived_animals').upsert(archivedAnimal).throwOnError();
      await supabase.from('animals').delete().eq('id', animal.id).throwOnError();
    } catch (error) {
      console.error('Failed to archive animal in Supabase', error);
      await queueSync('archived_animals', animal.id, 'upsert', archivedAnimal);
      await queueSync('animals', animal.id, 'delete', { id: animal.id });
    }
  } else {
    await queueSync('archived_animals', animal.id, 'upsert', archivedAnimal);
    await queueSync('animals', animal.id, 'delete', { id: animal.id });
  }
}

/**
 * restoreAnimal
 * Moves an animal back to the animals table.
 */
export async function restoreAnimal(animal: Animal) {
  // Dexie transaction
  await db.transaction('rw', db.animals, db.archived_animals, async () => {
    await db.animals.add(animal);
    await db.archived_animals.delete(animal.id);
  });

  // Supabase
  if (navigator.onLine) {
    try {
      await supabase.from('animals').upsert(animal).throwOnError();
      await supabase.from('archived_animals').delete().eq('id', animal.id).throwOnError();
    } catch (error) {
      console.error('Failed to restore animal in Supabase', error);
      await queueSync('animals', animal.id, 'upsert', animal as unknown as Record<string, unknown>);
      await queueSync('archived_animals', animal.id, 'delete', { id: animal.id });
    }
  } else {
    await queueSync('animals', animal.id, 'upsert', animal as unknown as Record<string, unknown>);
    await queueSync('archived_animals', animal.id, 'delete', { id: animal.id });
  }
}

async function queueSync(tableName: string, recordId: string, operation: 'upsert' | 'delete', payload: Record<string, unknown>) {
  await db.sync_queue.add({
    table_name: tableName,
    record_id: recordId,
    operation,
    payload,
    created_at: new Date().toISOString()
  });
}

/**
 * useHybridQuery
 * Online-First with Reactive Offline Cache (Stale-While-Revalidate)
 */
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
    // Old signature: tableName, dexieQuery, deps
    onlineQuery = supabase.from(tableName as string).select('*');
    offlineQuery = queryOrDexieFn as () => T | Promise<T>;
    deps = (dexieFnOrDeps as unknown[]) || [];
  } else {
    // New signature: tableName, onlineQuery, offlineQuery, deps
    onlineQuery = queryOrDexieFn as PromiseLike<{ data: unknown; error: unknown }>;
    offlineQuery = typeof dexieFnOrDeps === 'function' ? (dexieFnOrDeps as () => T | Promise<T>) : (() => dexieFnOrDeps as T);
    deps = depsOrUndefined || [];
  }

  // 1. Reactive Dexie state
  const data = useLiveQuery(offlineQuery, deps);

  // 2. Background Supabase fetch
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: remoteData, error } = await onlineQuery;
        
        if (error) throw error;

        if (remoteData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const table = db[tableName] as import('dexie').Table<any, any>;
          const pk = table.schema.primKey.keyPath;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isValid = (item: any) => {
            if (typeof pk === 'string') {
              return item && item[pk] !== undefined && item[pk] !== null;
            }
            if (Array.isArray(pk)) {
              return item && pk.every(k => item[k] !== undefined && item[k] !== null);
            }
            return false;
          };

          if (Array.isArray(remoteData)) {
            const validItems = remoteData.filter(isValid);
            if (validItems.length > 0) {
              await table.bulkPut(validItems);
            }
            if (validItems.length === 0 && remoteData.length > 0) {
              console.warn(`[useHybridQuery] Primary key missing for table ${tableName}. Data not cached.`);
            }
          } else {
            if (isValid(remoteData)) {
              await table.put(remoteData);
            } else {
              console.warn(`[useHybridQuery] Primary key missing for table ${tableName}. Data not cached.`);
            }
          }
        }
      } catch (err) {
        console.error(`HybridQuery Error [${tableName}]:`, err);
      }
    }

    if (navigator.onLine) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, ...deps]);

  return data;
}

/**
 * mutateOnlineFirst
 * SaaS mutation pattern: Try cloud first, fallback to local queue.
 */
export async function mutateOnlineFirst<T extends { id?: string | number }>(
  tableName: keyof AppDatabase, 
  payload: T, 
  operation: 'upsert' | 'delete' = 'upsert'
) {
  if (!payload.id) payload.id = crypto.randomUUID();
  const table = db[tableName] as import('dexie').Table<unknown, string>;

  const pendingCount = await db.sync_queue.count();

  try {
    // Try online
    if (pendingCount === 0 && navigator.onLine && operation === 'upsert') {
      await supabase.from(tableName).upsert(payload).throwOnError();
      // Update local cache
      await table.put(payload);
    } else if (pendingCount === 0 && navigator.onLine && operation === 'delete') {
      await supabase.from(tableName).delete().eq('id', (payload as { id: string }).id).throwOnError();
      // Update local cache
      await table.delete((payload as { id: string }).id);
    } else {
      throw new Error('Offline or pending queue');
    }
  } catch (error) {
    console.warn('Offline mode: queuing mutation', error);
    // Queue for later
    const existing = await db.sync_queue.where({ table_name: tableName, record_id: payload.id }).first();
    if (existing) {
      await db.sync_queue.put({ ...existing, payload, operation });
    } else {
      await db.sync_queue.add({
        table_name: tableName,
        record_id: payload.id as string,
        operation,
        payload,
        created_at: new Date().toISOString()
      });
    }
    // Update local cache anyway
    if (operation === 'upsert') {
      await table.put(payload);
    } else {
      await table.delete((payload as { id: string }).id);
    }
  }
}
