import { db } from '../../lib/db';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { Shift } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const useRotaData = () => {
  const shifts = useHybridQuery<Shift[]>('shifts', () => db.shifts.toArray(), []);

  const createShift = async (shift: Omit<Shift, 'id' | 'pattern_id'>, repeatDays: number[], weeksToRepeat: number) => {
    const pattern_id = uuidv4();
    const shiftsToCreate: Shift[] = [];
    
    if (repeatDays.length > 0 && weeksToRepeat > 0) {
      const startDate = new Date(shift.date);
      const startDay = startDate.getDay();
      const diffToMonday = startDate.getDate() - startDay + (startDay === 0 ? -6 : 1);
      const anchorMonday = new Date(startDate);
      anchorMonday.setDate(diffToMonday);

      for (let week = 0; week < weeksToRepeat; week++) {
        for (const day of repeatDays) {
          const date = new Date(anchorMonday);
          const daysToAdd = (day === 0 ? 6 : day - 1) + (week * 7);
          date.setDate(anchorMonday.getDate() + daysToAdd);
          
          if (date >= startDate) {
            shiftsToCreate.push({ ...shift, id: uuidv4(), date: date.toISOString().split('T')[0], pattern_id });
          }
        }
      }
    } else {
      shiftsToCreate.push({ ...shift, id: uuidv4(), date: shift.date });
    }

    await db.shifts.bulkAdd(shiftsToCreate);
    for (const s of shiftsToCreate) await mutateOnlineFirst('shifts', s as Record<string, unknown>, 'upsert');
  };

  const updateShift = async (id: string, updates: Partial<Shift>, updateSeries: boolean = false) => {
    if (updateSeries && updates.pattern_id) {
      const allShifts = await db.shifts.toArray();
      const seriesShifts = allShifts.filter(s => s.pattern_id === updates.pattern_id);
      for (const s of seriesShifts) {
        await mutateOnlineFirst('shifts', { ...updates, id: s.id, date: s.date } as Record<string, unknown>, 'upsert');
      }
    } else {
      await mutateOnlineFirst('shifts', { id, ...updates } as Record<string, unknown>, 'upsert');
    }
  };

  const replaceShiftPattern = async (existingShift: Shift, newShiftData: Omit<Shift, 'id' | 'pattern_id'>, repeatDays: number[], weeksToRepeat: number) => {
    if (existingShift.pattern_id) {
      const allShifts = await db.shifts.toArray();
      const futureShifts = allShifts.filter(s => s.pattern_id === existingShift.pattern_id && new Date(s.date) >= new Date(existingShift.date));
      for (const s of futureShifts) await mutateOnlineFirst('shifts', { id: s.id }, 'delete');
    } else {
      await mutateOnlineFirst('shifts', { id: existingShift.id }, 'delete');
    }
    await createShift(newShiftData, repeatDays, weeksToRepeat);
  };

  const deleteShift = async (shift: Shift, deleteSeries: boolean = false) => {
    if (deleteSeries && shift.pattern_id) {
      const allShifts = await db.shifts.toArray();
      const seriesShifts = allShifts.filter(s => s.pattern_id === shift.pattern_id);
      for (const s of seriesShifts) await mutateOnlineFirst('shifts', { id: s.id }, 'delete');
    } else {
      await mutateOnlineFirst('shifts', { id: shift.id }, 'delete');
    }
  };

  return { shifts, createShift, updateShift, replaceShiftPattern, deleteShift };
};
