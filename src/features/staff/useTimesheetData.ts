import { db } from '@/src/lib/db';
import { Timesheet, TimesheetStatus } from '@/src/types';
import { v4 as uuidv4 } from 'uuid';
import { useHybridQuery, mutateOnlineFirst } from '@/src/lib/dataEngine';
import { supabase } from '@/src/lib/supabase';

export function useTimesheetData() {
  const timesheets = useHybridQuery<Timesheet[]>(
    'timesheets',
    supabase.from('timesheets').select('*'),
    () => db.timesheets.toArray(),
    []
  );

  const clockIn = async (staff_name: string) => {
    console.log('Clocking in:', staff_name);
    const newTimesheet: Timesheet = {
      id: uuidv4(),
      staff_name,
      date: new Date().toISOString().split('T')[0],
      clock_in: new Date().toISOString(),
      status: TimesheetStatus.ACTIVE
    };
    await mutateOnlineFirst('timesheets', newTimesheet as unknown as Record<string, unknown>, 'upsert');
  };

  const clockOut = async (id: string) => {
    console.log('Clocking out:', id);
    const timesheet = await db.timesheets.get(id);
    if (timesheet) {
      const updatedTimesheet = {
        ...timesheet,
        clock_out: new Date().toISOString(),
        status: TimesheetStatus.COMPLETED
      };
      await mutateOnlineFirst('timesheets', updatedTimesheet as unknown as Record<string, unknown>, 'upsert');
    }
  };

  const getCurrentlyClockedInStaff = async () => {
    const active = await db.timesheets.where('status').equals(TimesheetStatus.ACTIVE).toArray();
    return active.map(t => t.staff_name);
  };

  const addTimesheet = async (timesheet: Omit<Timesheet, 'id'>) => {
    const newTimesheet = {
      ...timesheet,
      id: uuidv4()
    };
    await mutateOnlineFirst('timesheets', newTimesheet as unknown as Record<string, unknown>, 'upsert');
  };

  const deleteTimesheet = async (id: string) => {
    await mutateOnlineFirst('timesheets', { id }, 'delete');
  };

  return {
    timesheets: timesheets || [],
    clockIn,
    clockOut,
    getCurrentlyClockedInStaff,
    addTimesheet,
    deleteTimesheet
  };
}
