import { db } from '../../lib/db';
import { InternalMovement, MovementType } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export function useMovementsData() {
  const movements = useHybridQuery<InternalMovement[]>(
    'internal_movements',
    supabase.from('internal_movements').select('*'),
    () => db.internal_movements.toArray(),
    []
  );

  const addMovement = async (movement: Omit<InternalMovement, 'id' | 'created_by'>) => {
    const newMovement: InternalMovement = {
      ...movement,
      id: uuidv4(),
      created_by: 'SYS' // Mock user
    };
    await mutateOnlineFirst('internal_movements', newMovement as unknown as Record<string, unknown>, 'upsert');
  };

  const seedMovements = async () => {
    const count = await db.internal_movements.count();
    if (count === 0) {
      const animals = await db.animals.toArray();
      if (animals.length > 0) {
        const animal = animals[0];
        const movementsList = [
          {
            id: uuidv4(),
            animal_id: animal.id,
            animal_name: animal.name,
            log_date: new Date().toISOString().split('T')[0],
            movement_type: MovementType.TRANSFER,
            source_location: 'Main Aviary',
            destination_location: 'Flying Field',
            created_by: 'SYS'
          },
          {
            id: uuidv4(),
            animal_id: animal.id,
            animal_name: animal.name,
            log_date: new Date().toISOString().split('T')[0],
            movement_type: MovementType.TRANSFER,
            source_location: 'Flying Field',
            destination_location: 'Main Aviary',
            created_by: 'SYS'
          }
        ];
        
        for (const m of movementsList) {
            await mutateOnlineFirst('internal_movements', m as unknown as Record<string, unknown>, 'upsert');
        }
      }
    }
  };

  return {
    movements: movements || [],
    addMovement,
    seedMovements
  };
}
