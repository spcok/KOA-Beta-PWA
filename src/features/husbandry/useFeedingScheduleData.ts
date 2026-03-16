import { db } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { Animal, Task } from '../../types';

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
    isLoading,
    addTasks,
    deleteTask
  };
}
