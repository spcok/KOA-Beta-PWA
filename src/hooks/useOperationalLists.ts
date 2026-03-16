import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { AnimalCategory } from '../types';

export function useOperationalLists(category: AnimalCategory = AnimalCategory.ALL) {
  const allLists = useLiveQuery(() => db.operational_lists.toArray());
  const lists = allLists || [];

  const foodTypes = lists.filter(l => l.type === 'food' && (l.category === category || l.category === AnimalCategory.ALL));
  const feedMethods = lists.filter(l => l.type === 'method' && (l.category === category || l.category === AnimalCategory.ALL));
  const eventTypes = lists.filter(l => l.type === 'event');
  const locations = lists.filter(l => l.type === 'location');

  const addListItem = async (type: 'food' | 'method' | 'location' | 'event', value: string, itemCategory: AnimalCategory = category) => {
    if (!value.trim()) return;
    if (!navigator.onLine) { alert("You must be online to modify global settings."); return; }
    
    const val = value.trim();
    
    const exists = lists.find(l => 
      l.type === type && 
      l.value.toLowerCase() === val.toLowerCase() && 
      (type === 'location' || type === 'event' || l.category === itemCategory)
    );
    
    if (exists) return;

    const payload = {
      id: uuidv4(),
      type,
      category: (type === 'location' || type === 'event') ? AnimalCategory.ALL : itemCategory,
      value: val
    };

    const { error } = await supabase.from('operational_lists').insert([payload]);
    if (error) { console.error(error); alert('Failed to save to server.'); return; }
    await db.operational_lists.put(payload);
  };

  const updateListItem = async (id: string, value: string) => {
    if (!value.trim()) return;
    if (!navigator.onLine) return;
    
    await supabase.from('operational_lists').update({ value: value.trim() }).eq('id', id);
    await db.operational_lists.update(id, { value: value.trim() });
  };

  const removeListItem = async (id: string) => {
    if (!navigator.onLine) return;
    
    await supabase.from('operational_lists').delete().eq('id', id);
    await db.operational_lists.delete(id);
  };

  return {
    foodTypes,
    feedMethods,
    eventTypes,
    locations,
    addListItem,
    updateListItem,
    removeListItem,
    isLoading: allLists === undefined
  };
}
