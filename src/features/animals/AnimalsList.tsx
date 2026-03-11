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
    <div className="space-y-4">
      {canViewArchived && (
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'live' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Live Collection
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'archived' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Archived Records
          </button>
        </div>
      )}

      {activeTab === 'live' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Render live animals here */}
            {animals.map(animal => (
                <div key={animal.id} className="p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50" onClick={() => onSelectAnimal(animal)}>
                    {animal.name} - {animal.species}
                </div>
            ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
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
