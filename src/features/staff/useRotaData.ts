import { db } from '../../lib/db';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { Shift } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const useRotaData = () => {
  const shifts = useHybridQuery<Shift[]>(
    'shifts',
    () => db.shifts.toArray(),
    []
  );

  const createShift = async (
    shift: Omit<Shift, 'id' | 'pattern_id'>,
    repeatDays: number[], // 0 = Sun, 1 = Mon, ..., 6 = Sat
    weeksToRepeat: number
  ) => {
    const pattern_id = uuidv4();
    const shiftsToCreate: Shift[] = [];

    for (let week = 0; week < weeksToRepeat; week++) {
      for (const day of repeatDays) {
        const date = new Date(shift.date);
        date.setDate(date.getDate() + (week * 7) + (day - date.getDay()));
        
        shiftsToCreate.push({
          ...shift,
          id: uuidv4(),
          date: date.toISOString().split('T')[0],
          pattern_id
        });
      }
    }

    // If not repeating, just create one shift
    if (repeatDays.length === 0 || weeksToRepeat === 0) {
      shiftsToCreate.push({
        ...shift,
        id: uuidv4(),
        date: shift.date
      });
    }

    await db.shifts.bulkAdd(shiftsToCreate);
    for (const s of shiftsToCreate) {
      await mutateOnlineFirst('shifts', s as unknown as Record<string, unknown>, 'upsert');
    }
  };

  const updateShift = async (id: string, updates: Partial<Shift>) => {
    await mutateOnlineFirst('shifts', { id, ...updates } as Record<string, unknown>, 'upsert');
  };

  const deleteShift = async (id: string) => {
    await mutateOnlineFirst('shifts', { id }, 'delete');
  };

  return { shifts, createShift, updateShift, deleteShift };
};
