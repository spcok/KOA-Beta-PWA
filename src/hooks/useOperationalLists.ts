import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { AnimalCategory, OperationalList } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { mutateOnlineFirst } from '../lib/dataEngine';

export function useOperationalLists(category: AnimalCategory = AnimalCategory.ALL) {
  const allLists = useLiveQuery(() => db.operational_lists.toArray());
  const lists = allLists || [];

  const foodTypes = lists.filter(l => l.type === 'food' && (l.category === category || l.category === AnimalCategory.ALL));
  const feedMethods = lists.filter(l => l.type === 'method' && (l.category === category || l.category === AnimalCategory.ALL));
  const eventTypes = lists.filter(l => l.type === 'event');
  const locations = lists.filter(l => l.type === 'location');

  const addListItem = async (type: 'food' | 'method' | 'location' | 'event', value: string, itemCategory: AnimalCategory = category) => {
    if (!value.trim()) return;
    const val = value.trim();
    
    const exists = lists.find(l => 
      l.type === type && 
      l.value.toLowerCase() === val.toLowerCase() && 
      (type === 'location' || type === 'event' || l.category === itemCategory)
    );
    
    if (exists) return;

    await mutateOnlineFirst('operational_lists', {
      id: uuidv4(),
      type,
      category: (type === 'location' || type === 'event') ? AnimalCategory.ALL : itemCategory,
      value: val
    } as OperationalList);
  };

  const updateListItem = async (id: string, value: string) => {
    if (!value.trim()) return;
    const item = lists.find(l => l.id === id);
    if (item) {
      await mutateOnlineFirst('operational_lists', { ...item, value: value.trim() } as OperationalList);
    }
  };

  const removeListItem = async (id: string) => {
    await mutateOnlineFirst('operational_lists', { id } as OperationalList, 'delete');
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
