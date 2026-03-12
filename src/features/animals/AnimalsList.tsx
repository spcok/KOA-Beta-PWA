import React, { useState } from 'react';
import { useHybridQuery } from '../../lib/dataEngine';
import { db } from '../../lib/db';
import { Animal } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';

export const AnimalsList = ({ animals, onSelectAnimal }: { animals: Animal[], onSelectAnimal: (animal: Animal) => void }) => {
  const [activeTab, setActiveTab] = useState<'live' | 'archived'>('live');
  const permissions = usePermissions();
  const archivedAnimals = useHybridQuery<Animal[]>(
    'archived_animals',
    () => db.archived_animals.toArray(),
    []
  ) || [];

  const canViewArchived = permissions.isAdmin || permissions.isOwner;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Animals Directory</h1>
      {canViewArchived && (
        <div className="flex gap-2 border-b border-slate-200 pb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'live' ? 'bg-blue-50 text-blue-700 rounded-xl font-bold' : 'text-slate-600 hover:bg-slate-100 rounded-xl'
            }`}
          >
            Live Collection
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'archived' ? 'bg-blue-50 text-blue-700 rounded-xl font-bold' : 'text-slate-600 hover:bg-slate-100 rounded-xl'
            }`}
          >
            Archived Records
          </button>
        </div>
      )}

      {activeTab === 'live' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Render live animals here */}
            {animals.map(animal => (
                <div key={animal.id} className="p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50" onClick={() => onSelectAnimal(animal)}>
                    {animal.name} - {animal.species}
                </div>
            ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {archivedAnimals.map(animal => (
            <div key={animal.id} className="p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50" onClick={() => onSelectAnimal(animal)}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900">{animal.name}</div>
                  <div className="text-sm text-slate-500">{animal.species}</div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>Reason: {animal.archive_reason}</div>
                  <div>Archived: {new Date(animal.archived_at || '').toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
