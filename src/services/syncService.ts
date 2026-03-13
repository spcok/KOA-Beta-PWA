import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

/**
 * hydrateComplianceData
 * Eager Hydration: Fetches critical compliance data from the last 14 days
 * and upserts it into Dexie for offline availability.
 */
export async function hydrateComplianceData() {
  if (!navigator.onLine) return;

  console.log("🛠️ [SYNC] Hydrating compliance modules for offline failover...");

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const isoDate = fourteenDaysAgo.toISOString();

  // Mapping based on Zoo Licensing Act 1981 compliance requirements
  const complianceTables = [
    { supabase: 'medical_logs', dexie: 'medical_logs' },
    { supabase: 'quarantine_records', dexie: 'quarantine_records' },
    { supabase: 'mar_charts', dexie: 'mar_charts' },
    { supabase: 'animals', dexie: 'animals' }, // maps to animal_records
    { supabase: 'maintenance_logs', dexie: 'maintenance_logs' } // maps to enclosure_checks
  ];

  try {
    await Promise.all(complianceTables.map(async ({ supabase: supabaseTable, dexie: dexieTable }) => {
      // Fetch records created or updated in the last 14 days
      const { data, error } = await supabase
        .from(supabaseTable)
        .select('*')
        .gte('created_at', isoDate);

      if (error) {
        console.error(`[SYNC] Error fetching ${supabaseTable}:`, error);
        return;
      }

      if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const table = db[dexieTable as keyof typeof db] as any;
        if (table && typeof table.bulkPut === 'function') {
          await table.bulkPut(data);
          console.log(`[SYNC] Hydrated ${data.length} records for ${dexieTable}`);
        }
      }
    }));
  } catch (error) {
    console.error("[SYNC] Fatal hydration error:", error);
  }
}
