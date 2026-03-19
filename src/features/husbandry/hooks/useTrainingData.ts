import { useHybridQuery } from '../../../lib/dataEngine';
import { db } from '../../../lib/db';

export function useTrainingData(animalId?: string) {
  return useHybridQuery(
    'training_records',
    () => {
      if (animalId) {
        return db.training_records.where('animal_id').equals(animalId).toArray();
      }
      return db.training_records.toArray();
    },
    [animalId]
  );
}
