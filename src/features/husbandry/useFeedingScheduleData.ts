import { db } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { Animal, Task, AnimalCategory } from '../../types';

export const FOOD_OPTIONS: Record<string, string[]> = {
  [AnimalCategory.OWLS]: ['Day Old Chick', 'Mouse', 'Rat', 'Quail'],
  [AnimalCategory.RAPTORS]: ['Day Old Chick', 'Mouse', 'Rat', 'Quail', 'Rabbit'],
  [AnimalCategory.MAMMALS]: ['Fruit/Veg', 'Meat', 'Insects', 'Pellets', 'Fish'],
  [AnimalCategory.REPTILES]: ['Mice', 'Rats', 'Insects', 'Salad'],
  [AnimalCategory.EXOTICS]: ['Insects', 'Fruit', 'Nectar', 'Pellets'],
  [AnimalCategory.INVERTEBRATES]: ['Fruit', 'Insects', 'Jelly'],
  [AnimalCategory.AMPHIBIANS]: ['Insects', 'Worms'],
  [AnimalCategory.ALL]: ['Standard Diet']
};

export function useFeedingScheduleData() {
  const animalsRaw = useHybridQuery<Animal[]>(
    'animals',
    supabase.from('animals').select('*'),
    () => db.animals.toArray(),
    []
  );

  const tasksRaw = useHybridQuery<Task[]>(
    'tasks',
    supabase.from('tasks').select('*'),
    () => db.tasks.toArray(),
    []
  );

  const isLoading = animalsRaw === undefined || tasksRaw === undefined;

  const addTasks = async (newTasks: Task[]) => {
    for (const task of newTasks) {
      await mutateOnlineFirst('tasks', task as unknown as Record<string, unknown>, 'upsert');
    }
  };

  const deleteTask = async (id: string) => {
    await mutateOnlineFirst('tasks', { id }, 'delete');
  };

  return {
    animals: animalsRaw || [],
    tasks: tasksRaw || [],
    foodOptions: FOOD_OPTIONS,
    isLoading,
    addTasks,
    deleteTask
  };
}
