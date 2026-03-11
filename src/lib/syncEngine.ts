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
  
  for (const item of queue) {
    try {
      const payload = item.payload as Record<string, unknown>;
      if (item.operation === 'upsert') {
        await supabase.from(item.table_name).upsert(payload, { onConflict: 'id' }).throwOnError();
      } else if (item.operation === 'delete') {
        await supabase.from(item.table_name).delete().eq('id', payload.id as string).throwOnError();
      }
      await db.sync_queue.delete(item.id!);
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
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

