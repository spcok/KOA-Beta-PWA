import React, { useState, useEffect } from 'react';
import { Utensils, Ticket, Plus, Trash2, Activity, MapPin } from 'lucide-react';
import { AnimalCategory, OperationalList } from '../../../types';
import { db } from '../../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';

const OperationalLists: React.FC = () => {
  const allLists = useLiveQuery(() => db.operational_lists.toArray()) || [];
  const [listSection, setListSection] = useState<AnimalCategory>(AnimalCategory.OWLS);

  // Initialize default data if empty
  useEffect(() => {
    const initData = async () => {
      const count = await db.operational_lists.count();
      if (count === 0) {
        const defaults: Omit<OperationalList, 'id'>[] = [
          // Food
          { type: 'food', category: AnimalCategory.OWLS, value: 'Day Old Chick' },
          { type: 'food', category: AnimalCategory.OWLS, value: 'Mouse (S)' },
          { type: 'food', category: AnimalCategory.RAPTORS, value: 'Mouse (M)' },
          { type: 'food', category: AnimalCategory.RAPTORS, value: 'Rat (S)' },
          { type: 'food', category: AnimalCategory.MAMMALS, value: 'Rat (M)' },
          { type: 'food', category: AnimalCategory.MAMMALS, value: 'Quail' },
          { type: 'food', category: AnimalCategory.REPTILES, value: 'Rabbit' },
          { type: 'food', category: AnimalCategory.INVERTEBRATES, value: 'Insects' },
          { type: 'food', category: AnimalCategory.AMPHIBIANS, value: 'Insects' },
          { type: 'food', category: AnimalCategory.EXOTICS, value: 'Special Diet' },
          // Methods
          { type: 'method', category: AnimalCategory.OWLS, value: 'Hand Fed' },
          { type: 'method', category: AnimalCategory.OWLS, value: 'Bowl Fed' },
          { type: 'method', category: AnimalCategory.RAPTORS, value: 'Tongs' },
          { type: 'method', category: AnimalCategory.MAMMALS, value: 'Bowl Fed' },
          { type: 'method', category: AnimalCategory.REPTILES, value: 'Tongs' },
          { type: 'method', category: AnimalCategory.INVERTEBRATES, value: 'Scatter Fed' },
          { type: 'method', category: AnimalCategory.AMPHIBIANS, value: 'Scatter Fed' },
          { type: 'method', category: AnimalCategory.EXOTICS, value: 'Tongs' },
          // Events
          { type: 'event', category: AnimalCategory.ALL, value: 'Training' },
          { type: 'event', category: AnimalCategory.ALL, value: 'Public Display' },
          { type: 'event', category: AnimalCategory.ALL, value: 'Medical Treatment' },
          // Locations
          { type: 'location', category: AnimalCategory.ALL, value: 'Enclosure 1' },
          { type: 'location', category: AnimalCategory.ALL, value: 'Enclosure 2' },
          { type: 'location', category: AnimalCategory.ALL, value: 'Hospital' },
          { type: 'location', category: AnimalCategory.ALL, value: 'Quarantine' },
        ];

        await db.operational_lists.bulkAdd(defaults.map(d => ({ ...d, id: uuidv4() })));
      }
    };
    initData();
  }, []);

  const foodOptions = allLists.filter(l => l.type === 'food' && l.category === listSection);
  const feedMethods = allLists.filter(l => l.type === 'method' && l.category === listSection);
  const eventTypes = allLists.filter(l => l.type === 'event');
  const locations = allLists.filter(l => l.type === 'location');

  const handleAddList = async (type: 'food' | 'method' | 'location' | 'event', value: string) => {
    if (!value.trim()) return;
    const val = value.trim();
    
    // Check for duplicates
    const exists = allLists.find(l => l.type === type && l.value.toLowerCase() === val.toLowerCase() && (type === 'location' || type === 'event' || l.category === listSection));
    if (exists) return;

    await db.operational_lists.add({
      id: uuidv4(),
      type,
      category: (type === 'location' || type === 'event') ? AnimalCategory.ALL : listSection,
      value: val
    });
  };

  const handleRemoveList = async (id: string) => {
    await db.operational_lists.delete(id);
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-300 uppercase tracking-widest";

  return (
    <div className="max-w-4xl space-y-8 animate-in slide-in-from-right-4 duration-300 pb-24">
      <div className="border-b-2 border-slate-200 pb-6">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
          <Utensils size={28} className="text-orange-500" /> Operational Registries
        </h3>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Manage Dropdown Options & Standard Lists</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* EVENT TYPES */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col h-[500px]">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Ticket size={16} className="text-purple-600" /> Event Classifications
          </h4>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="New Event Type..." onKeyDown={(e) => { if (e.key === 'Enter') { handleAddList('event', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} className={inputClass} id="newEventInput" />
            <button onClick={() => { const input = document.getElementById('newEventInput') as HTMLInputElement; handleAddList('event', input.value); input.value = ''; }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-colors"><Plus size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {eventTypes.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-purple-200 transition-colors">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{item.value}</span>
                <button onClick={() => handleRemoveList(item.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* FOOD OPTIONS */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Utensils size={16} className="text-orange-500" /> Diet Inventory
            </h4>
            <select value={listSection} onChange={(e) => setListSection(e.target.value as AnimalCategory)} className="text-[10px] font-bold bg-slate-100 border-none rounded-lg py-1 pl-2 pr-6 uppercase tracking-widest focus:ring-0 cursor-pointer">
              {Object.values(AnimalCategory).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="New Food Item..." onKeyDown={(e) => { if (e.key === 'Enter') { handleAddList('food', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} className={inputClass} id="newFoodInput" />
            <button onClick={() => { const input = document.getElementById('newFoodInput') as HTMLInputElement; handleAddList('food', input.value); input.value = ''; }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-colors"><Plus size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {foodOptions.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-orange-200 transition-colors">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{item.value}</span>
                <button onClick={() => handleRemoveList(item.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* FEED METHODS */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-blue-500" /> Feed Methods
            </h4>
            <select value={listSection} onChange={(e) => setListSection(e.target.value as AnimalCategory)} className="text-[10px] font-bold bg-slate-100 border-none rounded-lg py-1 pl-2 pr-6 uppercase tracking-widest focus:ring-0 cursor-pointer">
              {Object.values(AnimalCategory).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="New Method..." onKeyDown={(e) => { if (e.key === 'Enter') { handleAddList('method', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} className={inputClass} id="newMethodInput" />
            <button onClick={() => { const input = document.getElementById('newMethodInput') as HTMLInputElement; handleAddList('method', input.value); input.value = ''; }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-colors"><Plus size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {feedMethods.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-colors">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{item.value}</span>
                <button onClick={() => handleRemoveList(item.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* LOCATIONS */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col h-[500px]">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-emerald-500" /> Site Locations
          </h4>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="New Location..." onKeyDown={(e) => { if (e.key === 'Enter') { handleAddList('location', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }} className={inputClass} id="newLocationInput" />
            <button onClick={() => { const input = document.getElementById('newLocationInput') as HTMLInputElement; handleAddList('location', input.value); input.value = ''; }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-colors"><Plus size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {locations.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{item.value}</span>
                <button onClick={() => handleRemoveList(item.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalLists;
