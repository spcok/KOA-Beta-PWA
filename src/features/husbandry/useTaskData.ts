import { useState, useMemo } from 'react';
import { db } from '../../lib/db';
import { Task, User, UserRole, Animal } from '../../types';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

const mockUsers: User[] = [
  { id: 'u1', email: 'john@example.com', name: 'John Doe', initials: 'JD', role: UserRole.VOLUNTEER },
  { id: 'u2', email: 'jane@example.com', name: 'Jane Smith', initials: 'JS', role: UserRole.ADMIN }
];

export const useTaskData = () => {
  const tasks = useHybridQuery<Task[]>(
    'tasks',
    supabase.from('tasks').select('*'),
    async () => await db.tasks.toArray(),
    []
  );
  const activeAnimals = useHybridQuery<Animal[]>(
    'animals',
    supabase.from('animals').select('*'),
    async () => await db.animals.toArray(),
    []
  );

  const archivedAnimals = useHybridQuery<Animal[]>(
    'archived_animals',
    supabase.from('archived_animals').select('*'),
    async () => await db.archived_animals.toArray(),
    []
  );

  const animals = useMemo(() => {
    return activeAnimals && archivedAnimals ? [...activeAnimals, ...archivedAnimals] : undefined;
  }, [activeAnimals, archivedAnimals]);

  const [filter, setFilter] = useState<'assigned' | 'pending' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const currentUser = mockUsers[0];

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(task => {
      // Soft-delete check
      if ((task as Task & { is_deleted?: boolean }).is_deleted) return false;

      if (filter === 'completed' && !task.completed) return false;
      if (filter === 'pending' && task.completed) return false;
      if (filter === 'assigned' && (task.assigned_to !== currentUser.id || task.completed)) return false;

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const animalName = animals?.find(a => a.id === task.animal_id)?.name.toLowerCase() || '';
        const userName = mockUsers.find(u => u.id === task.assigned_to)?.name.toLowerCase() || '';
        
        return (
          task.title.toLowerCase().includes(searchLower) ||
          (task.type && task.type.toLowerCase().includes(searchLower)) ||
          animalName.includes(searchLower) ||
          userName.includes(searchLower)
        );
      }
      return true;
    });
  }, [tasks, filter, searchTerm, currentUser.id, animals]);

  const addTask = async (newTask: Omit<Task, 'id'>) => {
    const taskWithId = { 
      ...newTask, 
      id: crypto.randomUUID()
    } as Task;
    await mutateOnlineFirst('tasks', taskWithId, 'upsert');
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const task = await db.tasks.get(id);
    if (task) {
      const updatedTask = { ...task, ...updates };
      await mutateOnlineFirst('tasks', updatedTask, 'upsert');
    }
  };

  const deleteTask = async (id: string) => {
    const task = await db.tasks.get(id);
    if (task) {
      const updatedTask = { ...task, is_deleted: true };
      await mutateOnlineFirst('tasks', updatedTask, 'upsert');
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    const updatedTask = { ...task, completed: !task.completed };
    await mutateOnlineFirst('tasks', updatedTask, 'upsert');
  };

  return {
    tasks: filteredTasks,
    animals: animals || [],
    users: mockUsers,
    isLoading: tasks === undefined || animals === undefined,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    currentUser
  };
};
