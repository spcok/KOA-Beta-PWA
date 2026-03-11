import { db } from '../../lib/db';
import { Animal } from '../../types';
import { useHybridQuery } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export function useAnimalsData() {
  const animals = useHybridQuery<Animal[]>(
    'animals',
    supabase.from('animals').select('*'),
    () => db.animals.toArray(),
    []
  );

  return {
    animals: animals || [],
    isLoading: animals === undefined
  };
}
