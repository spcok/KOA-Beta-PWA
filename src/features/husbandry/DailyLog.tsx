import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Animal, LogEntry, LogType, AnimalCategory } from '../../types';
import { useDailyLogData } from './useDailyLogData';
import { useWeatherSync } from './hooks/useWeatherSync';
import AddEntryModal from './AddEntryModal';
import { BirdRow } from './components/BirdRow';
import { MammalRow } from './components/MammalRow';
import { ExoticRow } from './components/ExoticRow';

const DailyLog: React.FC = () => {
  const [viewDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeCategory, setActiveCategory] = useState<AnimalCategory>(AnimalCategory.OWLS);
  const isProcessing = useRef<Set<string>>(new Set());
  
  const { animals, getTodayLog, addLogEntry, isLoading } = useDailyLogData(viewDate, activeCategory);
  const { isSyncing } = useWeatherSync(animals, getTodayLog, addLogEntry, viewDate, isProcessing);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [selectedType, setSelectedType] = useState<LogType>(LogType.GENERAL);

  const categories = [
    AnimalCategory.OWLS,
    AnimalCategory.RAPTORS,
    AnimalCategory.MAMMALS,
    AnimalCategory.EXOTICS
  ];

  const handleCellClick = (animal: Animal, type: LogType) => {
    setSelectedAnimal(animal);
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const renderHeaders = () => {
    switch (activeCategory) {
      case AnimalCategory.EXOTICS:
        return (
          <tr>
            <th className="p-4 text-left text-xs font-semibold text-slate-900 uppercase">Animal</th>
            <th className="p-4 text-left text-xs font-semibold text-slate-900 uppercase">FEED</th>
            <th className="p-4 text-left text-xs font-semibold text-slate-900 uppercase">MISTING</th>
            <th className="p-4 text-left text-xs font-semibold text-slate-900 uppercase">ENV</th>
          </tr>
        );
      default:
        return (
          <tr>
            <th className="p-4 text-left text-xs font-semibold text-slate-900 uppercase">Animal</th>
            <th className="p-4 text-left text-xs font-semibold text-slate-900 uppercase">WT</th>
            <th className="p-4 text-left text-xs font-semibold text-slate-900 uppercase">FEED</th>
            <th className="p-4 text-left text-xs font-semibold text-slate-900 uppercase">ENV</th>
          </tr>
        );
    }
  };

  const renderRow = (animal: Animal) => {
    switch (animal.category) {
      case AnimalCategory.OWLS:
      case AnimalCategory.RAPTORS:
        return <BirdRow key={animal.id} animal={animal} getTodayLog={getTodayLog} onCellClick={handleCellClick} />;
      case AnimalCategory.MAMMALS:
        return <MammalRow key={animal.id} animal={animal} getTodayLog={getTodayLog} onCellClick={handleCellClick} />;
      case AnimalCategory.EXOTICS:
        return <ExoticRow key={animal.id} animal={animal} getTodayLog={getTodayLog} onCellClick={handleCellClick} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">DAILY LOG</h1>
            <p className="text-sm text-slate-500 mt-1">Log and track daily animal activities.</p>
        </div>
        {isSyncing && <span className="text-sm text-slate-500 animate-pulse">Syncing Weather...</span>}
      </div>

      <div className="flex overflow-x-auto scrollbar-hide bg-slate-100 p-1 rounded-xl gap-0.5 sm:gap-1 mb-4">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`flex-1 min-w-fit sm:min-w-[100px] py-1.5 px-1 sm:py-2.5 text-[11px] sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeCategory === category 
                ? 'bg-white text-blue-700 shadow-sm font-bold' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            {renderHeaders()}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 animate-pulse">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                    <div>
                      <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
                      <div className="h-3 w-16 bg-slate-200 rounded"></div>
                    </div>
                  </td>
                  <td className="p-4"><div className="h-8 w-16 bg-slate-200 rounded-lg"></div></td>
                  <td className="p-4"><div className="h-8 w-16 bg-slate-200 rounded-lg"></div></td>
                  <td className="p-4"><div className="h-8 w-16 bg-slate-200 rounded-lg"></div></td>
                </tr>
              ))
            ) : (
              animals.map(renderRow)
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedAnimal && (
        <AddEntryModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={async (entry) => {
            if (entry.animal_id && isProcessing.current.has(entry.animal_id)) return;
            if (entry.animal_id) isProcessing.current.add(entry.animal_id);
            try {
              if (!entry.id) entry.id = uuidv4();
              await addLogEntry(entry as LogEntry);
              setIsModalOpen(false);
            } finally {
              if (entry.animal_id) isProcessing.current.delete(entry.animal_id);
            }
          }}
          animal={selectedAnimal}
          initialType={selectedType}
          existingLog={getTodayLog(selectedAnimal.id, selectedType)}
          initialDate={viewDate}
          allAnimals={animals}
        />
      )}
    </div>
  );
};

export default DailyLog;
