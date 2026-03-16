import { db, AppDatabase } from './db';
import { supabase } from './supabase';
import { SyncQueueItem } from '../types';

/**
 * resolvePayloadMedia
 * Scans a payload for 'local://' placeholders and uploads the corresponding 
 * blobs from the media_upload_queue before the database sync.
 */
async function resolvePayloadMedia(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const resolvedPayload = { ...payload };
  const BUCKET_NAME = 'koa-attachments';

  for (const key in resolvedPayload) {
    const value = resolvedPayload[key];
    
    if (typeof value === 'string' && value.startsWith('local://')) {
      const fileName = value.replace('local://', '');
      const mediaItem = await db.media_upload_queue.where('fileName').equals(fileName).first();
      
      if (mediaItem) {
        console.log(`🛠️ [Sync Engine] Resolving staged media: ${fileName}`);
        
        // Mark as uploading to prevent storageEngine from picking it up
        await db.media_upload_queue.update(mediaItem.id!, { status: 'uploading' });
        
        const filePath = `${mediaItem.folder}/${mediaItem.fileName}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, mediaItem.fileData);

        if (uploadError && !uploadError.message.includes('already exists')) {
          throw new Error(`Media upload failed: ${uploadError.message}`);
        }

        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        resolvedPayload[key] = data.publicUrl;
        
        // Update local Dexie record so the cache is consistent with the cloud
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const table = (db as any)[mediaItem.tableName];
        if (table) {
          await table.update(mediaItem.recordId, { [mediaItem.columnName]: data.publicUrl });
        }
        
        // Mark as uploaded in the media queue or delete it
        await db.media_upload_queue.delete(mediaItem.id!);
      }
    } else if (value instanceof Blob || value instanceof File) {
      console.log(`🛠️ [Sync Engine] Resolving raw blob in payload: ${key}`);
      const fileExt = (value as File).name?.split('.').pop() || 'bin';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `sync-uploads/${fileName}`; 
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, value);

      if (uploadError && !uploadError.message.includes('already exists')) {
        throw new Error(`Raw blob upload failed: ${uploadError.message}`);
      }

      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      resolvedPayload[key] = data.publicUrl;
    }
  }
  
  return resolvedPayload;
}

/**
 * bulkShouldUpsert
 * Conflict Resolution: Checks multiple records against the server in a single batch.
 */
async function bulkShouldUpsert(table: string, items: { id: string, updated_at: string }[]): Promise<Set<string>> {
  const ids = items.map(i => i.id);
  const validIds = new Set<string>();

  try {
    const { data: remoteRecords, error } = await supabase
      .from(table)
      .select('id, updated_at')
      .in('id', ids);

    if (error) {
      console.warn(`🛠️ [Bulk Collision Check] Error fetching remote records for ${table}:`, error);
      // If check fails, we assume all are valid to prevent data loss
      return new Set(ids);
    }

    const remoteMap = new Map(remoteRecords?.map(r => [r.id, r.updated_at]));

    for (const item of items) {
      const remoteUpdatedAt = remoteMap.get(item.id);
      if (!remoteUpdatedAt) {
        validIds.add(item.id);
        continue;
      }

      const remoteTime = new Date(remoteUpdatedAt).getTime();
      const localTime = new Date(item.updated_at).getTime();

      if (localTime >= remoteTime) {
        validIds.add(item.id);
      } else {
        console.warn(`🛠️ [Collision] Skipping sync for ${table}/${item.id}. Server version is newer (${remoteUpdatedAt}) than local (${item.updated_at}).`);
      }
    }

    return validIds;
  } catch (err) {
    console.error(`🛠️ [Bulk Collision Check] Fatal error for ${table}:`, err);
    return new Set(ids);
  }
}

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
    'safety_drills', 'maintenance_logs', 'first_aid_logs', 'incidents', 'daily_rounds', 'operational_lists'
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

let isProcessing = false;

export async function processSyncQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('🛠️ [Sync Engine] Aborted: Offline.');
      return;
    }

    // 1. Fetch chunk (limit 50) where status !== 'quarantined'
    // We sort by priority (1 is highest)
    const queue = await db.sync_queue
      .where('status')
      .notEqual('quarantined')
      .limit(50)
      .toArray();
    
    if (queue.length === 0) return;

    // 2. Sort strictly by priority (1 goes first)
    queue.sort((a, b) => a.priority - b.priority);

    // Verify session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('🛠️ [Sync Engine] Aborted: No session.');
      return;
    }

    // 3. Group by table to enable bulk operations
    const tableGroups: Record<string, { upserts: SyncQueueItem[], deletes: SyncQueueItem[] }> = {};
    queue.forEach(item => {
      if (!tableGroups[item.table_name]) {
        tableGroups[item.table_name] = { upserts: [], deletes: [] };
      }
      if (item.operation === 'upsert') {
        tableGroups[item.table_name].upserts.push(item);
      } else {
        tableGroups[item.table_name].deletes.push(item);
      }
    });

    // 4. Process each table group
    // We iterate through the unique tables in the order they appeared in the prioritized queue
    const uniqueTables = [...new Set(queue.map(i => i.table_name))];

    for (const table of uniqueTables) {
      const { upserts, deletes } = tableGroups[table];

      // A. Process Deletes (Bulk)
      if (deletes.length > 0) {
        const deleteIds = deletes.map(d => (d.payload as { id: string }).id);
        try {
          console.log(`🛠️ [Sync Engine] Bulk deleting ${deletes.length} records from ${table}`);
          await supabase.from(table).delete().in('id', deleteIds).throwOnError();
          await db.sync_queue.bulkDelete(deletes.map(d => d.id!));
        } catch (err) {
          for (const d of deletes) await handleSyncFailure(d, err);
        }
      }

      // B. Process Upserts (Bulk with Conflict Resolution)
      if (upserts.length > 0) {
        try {
          console.log(`🛠️ [Sync Engine] Bulk upserting ${upserts.length} records to ${table}`);
          
          // i. Resolve Media for each item (individual staged upload)
          const resolvedItems: { queueItem: SyncQueueItem, payload: Record<string, unknown> }[] = [];
          for (const item of upserts) {
            const resolvedPayload = await resolvePayloadMedia(item.payload as Record<string, unknown>);
            resolvedItems.push({ queueItem: item, payload: resolvedPayload });
          }

          // ii. Bulk Conflict Check
          // Split items into those requiring conflict resolution and those that bypass it
          const itemsRequiringCheck = resolvedItems.filter(ri => ri.payload.updated_at !== undefined);
          const itemsBypassingCheck = resolvedItems.filter(ri => ri.payload.updated_at === undefined);

          // Only run bulkShouldUpsert on items that actually have timestamps
          let validIds = new Set<string>();
          if (itemsRequiringCheck.length > 0) {
            const checkData = itemsRequiringCheck.map(ri => ({
              id: ri.payload.id as string,
              // Fallback to queueItem.created_at ONLY if we know this table tracks timestamps
              updated_at: (ri.payload.updated_at || ri.queueItem.created_at) as string
            }));
            validIds = await bulkShouldUpsert(table, checkData);
          }

          // Combine the valid timestamped items with the bypassed items
          itemsBypassingCheck.forEach(ri => validIds.add(ri.payload.id as string));

          // iii. Filter valid payloads
          const finalPayloads = resolvedItems
            .filter(ri => validIds.has(ri.payload.id as string))
            .map(ri => {
              const payload = { ...ri.payload as Record<string, unknown> };
              
              // Sanitization Step: To ensure Supabase doesn't choke on empty timestamp columns during the actual .upsert(), 
              // explicitly delete the updated_at and created_at keys if they are undefined.
              if (payload.updated_at === undefined) delete payload.updated_at;
              if (payload.created_at === undefined) delete payload.created_at;
              
              // Strip undefined properties
              Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
              return payload;
            });
          
          const staleItems = resolvedItems.filter(ri => !validIds.has(ri.payload.id as string));

          // iv. Bulk Upsert
          if (finalPayloads.length > 0) {
            // Pre-flight serialization check for the whole batch
            JSON.stringify(finalPayloads);
            
            await supabase.from(table).upsert(finalPayloads, { onConflict: 'id' }).throwOnError();
            
            const successIds = resolvedItems
              .filter(ri => validIds.has(ri.payload.id as string))
              .map(ri => ri.queueItem.id!);
            await db.sync_queue.bulkDelete(successIds);
          }

          // v. Clean up stale items (already newer on server)
          if (staleItems.length > 0) {
            await db.sync_queue.bulkDelete(staleItems.map(si => si.queueItem.id!));
          }

        } catch (err) {
          for (const item of upserts) await handleSyncFailure(item, err);
        }
      }
    }

    // 5. Recursion: If we processed a full chunk, trigger again to drain the queue
    if (queue.length === 50) {
      console.log('🛠️ [Sync Engine] Chunk complete. Draining remaining queue...');
      setTimeout(() => processSyncQueue(), 500);
    }

  } catch (error) {
    console.error('🛠️ [Sync Engine] Critical error in processSyncQueue:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * handleSyncFailure
 * Capped Exponential Backoff & Dead Letter Queue (Quarantine) logic.
 */
async function handleSyncFailure(item: SyncQueueItem, error: unknown) {
  const retryCount = (item.retry_count || 0) + 1;
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Quarantine logic:
  // - 3 failed retries
  // - Definitive Supabase rejection (400 series, FK violations starting with 23)
  const supabaseError = error as { code?: string; status?: number };
  const isDefinitiveError = supabaseError?.code?.startsWith('23') || (supabaseError?.status !== undefined && supabaseError.status >= 400 && supabaseError.status < 500);
  const shouldQuarantine = retryCount >= 3 || isDefinitiveError;
  
  const status = shouldQuarantine ? 'quarantined' : 'pending';

  console.error(`🛠️ [Sync Engine] Failure for ${item.table_name}/${item.record_id} (Retry ${retryCount}):`, errorMessage);

  await db.sync_queue.update(item.id!, {
    retry_count: retryCount,
    status,
    error_log: errorMessage,
    updated_at: new Date().toISOString()
  });

  if (status === 'pending') {
    // Capped Exponential Backoff: 2s, 4s, 8s... capped at 60s
    const delay = Math.min(60000, 2000 * Math.pow(2, retryCount));
    console.warn(`🛠️ [Sync Engine] Backing off for ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  } else {
    console.error(`🛠️ [Sync Engine] Item ${item.id} QUARANTINED. Manual intervention required.`);
  }
}

/**
 * reconcileMissedEvents
 * Fetches records updated since the last sync to bridge gaps from offline periods.
 */
export async function reconcileMissedEvents() {
  const tables = ['animals', 'daily_logs', 'medical_logs', 'tasks', 'incidents', 'internal_movements', 'external_transfers', 'operational_lists', 'daily_rounds'];
  
  // We look back 1 hour by default or use a stored timestamp
  const lastSync = localStorage.getItem('last_sync_reconcile') || new Date(Date.now() - 3600000).toISOString();
  
  console.log(`🌐 [Sync Engine] Reconciling events since ${lastSync}...`);

  try {
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .gt('updated_at', lastSync);

      if (error) throw error;

      if (data && data.length > 0) {
        const dbTable = db[table as keyof AppDatabase] as import('dexie').Table<unknown, string | number>;
        await dbTable.bulkPut(data);
        console.log(`✅ [Sync Engine] Reconciled ${data.length} records for ${table}`);
      }
    }
    localStorage.setItem('last_sync_reconcile', new Date().toISOString());
  } catch (err) {
    console.error('🛠️ [Sync Engine] Reconciliation failed:', err);
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

/**
 * pushChangesToSupabase
 * Alias for processSyncQueue to match architectural requirements.
 */
export const pushChangesToSupabase = processSyncQueue;

// Setup global event listeners for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 [Sync Engine] Network connection restored. Reconciling and flushing queue.');
    reconcileMissedEvents().then(() => processSyncQueue()).catch(console.error);
  });
  
  window.addEventListener('offline', () => {
    console.warn('🌐 [Sync Engine] Network connection lost. Operating in offline mode.');
  });
}

