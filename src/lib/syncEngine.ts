import { db, AppDatabase } from './db';
import { supabase } from './supabase';

/**
 * prune14DayCache
 * Automated Janitor: Deletes time-series records older than 14 days from local cache.
 */
export async function prune14DayCache() {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const isoDate = fourteenDaysAgo.toISOString();

  try {
    await Promise.all([
      db.daily_logs.where('log_date').below(isoDate).delete(),
      db.tasks.where('due_date').below(isoDate).delete(),
      db.medical_logs.where('date').below(isoDate).delete()
    ]);
  } catch (error) {
    console.error('Janitor Error:', error);
  }
}

/**
 * forceHydrateFromCloud
 * Nuke & Rebuild: Paginated download of all records from Supabase into Dexie.
 */
export async function forceHydrateFromCloud() {
  const tables = [
    'animals', 'daily_logs', 'medical_logs', 'tasks', 'users', 
    'role_permissions', 'settings', 'contacts', 'zla_documents',
    'safety_drills', 'maintenance_logs', 'first_aid_logs', 'incidents', 'daily_rounds'
  ];

  try {
    // 1. Nuke
    await Promise.all(tables.map(t => {
      const table = db[t as keyof AppDatabase] as import('dexie').Table<unknown, string | number>;
      return table.clear();
    }));

    // 2. Rebuild with pagination
    for (const table of tables) {
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          const dbTable = db[table as keyof AppDatabase] as import('dexie').Table<unknown, string | number>;
          await dbTable.bulkPut(data);
          if (data.length < pageSize) hasMore = false;
          page++;
        } else {
          hasMore = false;
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Hydration Error:', error);
    return false;
  }
}

export async function processSyncQueue() {
  const queue = await db.sync_queue.toArray();
  
  // Verify session before syncing
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.warn('Sync aborted: User is not authenticated. RLS will reject the payload.');
    return;
  }
  
  // Group and order sync operations
  const operationsByTable: Record<string, { operation: 'upsert' | 'delete', payload: Record<string, unknown>, id: number }[]> = {};
  queue.forEach(item => {
    if (!operationsByTable[item.table_name]) {
      operationsByTable[item.table_name] = [];
    }
    operationsByTable[item.table_name].push({ operation: item.operation, payload: item.payload as Record<string, unknown>, id: item.id! });
  });

  // Define a safe sync order for upserts (Parents first)
  const upsertOrder = [
    'users',
    'animals', 
    'archived_animals',
    'shifts',
    'holidays',
    'timesheets',
    'medical_logs', 
    'mar_charts', 
    'quarantine_records',
    'internal_movements', 
    'external_transfers',
    'tasks',
    'daily_logs',
    'role_permissions'
  ];

  // Define a safe sync order for deletes (Children first)
  const deleteOrder = [...upsertOrder].reverse();

  const processedItemIds = new Set<number>();

  // 1. Process Deletes (Children first)
  for (const table of deleteOrder) {
    if (operationsByTable[table]) {
      for (const item of operationsByTable[table].filter(op => op.operation === 'delete')) {
        try {
          await supabase.from(table).delete().eq('id', item.payload.id as string).throwOnError();
          await db.sync_queue.delete(item.id);
          processedItemIds.add(item.id);
        } catch (error) {
          console.error(`Failed to sync delete item ${item.id} for table ${table}:`, error);
        }
      }
    }
  }

  // 2. Process Upserts (Parents first)
  for (const table of upsertOrder) {
    if (operationsByTable[table]) {
      for (const item of operationsByTable[table].filter(op => op.operation === 'upsert')) {
        try {
          await supabase.from(table).upsert(item.payload, { onConflict: 'id' }).throwOnError();
          await db.sync_queue.delete(item.id);
          processedItemIds.add(item.id);
        } catch (error) {
          console.error(`Failed to sync upsert item ${item.id} for table ${table}:`, error);
        }
      }
    }
  }

  // 3. Process any remaining items not in the defined syncOrder (fallback)
  for (const table in operationsByTable) {
    for (const item of operationsByTable[table]) {
      if (!processedItemIds.has(item.id)) {
        try {
          if (item.operation === 'upsert') {
            await supabase.from(table).upsert(item.payload, { onConflict: 'id' }).throwOnError();
          } else if (item.operation === 'delete') {
            await supabase.from(table).delete().eq('id', item.payload.id as string).throwOnError();
          }
          await db.sync_queue.delete(item.id);
        } catch (error) {
          console.error(`Failed to sync item ${item.id} for table ${table} (fallback):`, error);
        }
      }
    }
  }
}

export function startRealtimeSubscription() {
  const channel = supabase.channel('koa-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      async (payload) => {
        const { table, eventType } = payload;

        const dbTable = db[table as keyof AppDatabase] as import('dexie').Table<unknown, string | number>;
        if (!dbTable) return;

        try {
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            await dbTable.put(payload.new);
          } else if (eventType === 'DELETE') {
            await dbTable.delete(payload.old.id);
          }
        } catch (error) {
          console.error(`Realtime Sync Error on ${table}:`, error);
        }
      }
    )
    .subscribe();

  return channel;
}

