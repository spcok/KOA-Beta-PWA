import { db } from '../../lib/db';
import { useHybridQuery, archiveAnimal as archiveAnimalDataEngine } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';
import { Animal, LogEntry, Task } from '../../types';

export function useAnimalProfileData(animalId: string) {
  const animal = useHybridQuery<Animal | undefined>(
    'animals',
    supabase.from('animals').select('*').eq('id', animalId),
    () => (animalId ? db.animals.get(animalId) : undefined),
    [animalId]
  );

  const logs = useHybridQuery<LogEntry[]>(
    'daily_logs',
    supabase.from('daily_logs').select('*').eq('animal_id', animalId),
    () => (animalId ? db.daily_logs.where('animal_id').equals(animalId).toArray() : []),
    [animalId]
  );

  const tasks = useHybridQuery<Task[]>(
    'tasks',
    supabase.from('tasks').select('*').eq('animal_id', animalId),
    () => (animalId ? db.tasks.where('animal_id').equals(animalId).toArray() : []),
    [animalId]
  );
  
  const isLoading = animal === undefined || logs === undefined || tasks === undefined;

  const archiveAnimal = async (reason: string, type: NonNullable<Animal['archive_type']>) => {
    if (animal) {
      await archiveAnimalDataEngine(animal, reason, type);
    }
  };

  return {
    animal: animal || null,
    logs: logs || [],
    tasks: tasks || [],
    orgProfile: { name: 'Kent Owl Academy', logo_url: '' },
    allAnimals: [],
    isLoading,
    archiveAnimal
  };
}
