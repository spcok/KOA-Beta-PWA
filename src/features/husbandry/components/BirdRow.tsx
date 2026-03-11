import React from 'react';
import { Animal, LogType, LogEntry } from '../../../types';

interface BirdRowProps {
  animal: Animal;
  getTodayLog: (animalId: string, type: LogType) => LogEntry | undefined;
  onCellClick: (animal: Animal, type: LogType) => void;
}

export const BirdRow: React.FC<BirdRowProps> = ({ animal, getTodayLog, onCellClick }) => {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="p-4 flex items-center gap-3">
        <img src={animal.image_url || '/placeholder.png'} alt={animal.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
        <div>
          <div className="font-bold text-slate-800">{animal.name}</div>
          <div className="text-xs text-slate-500">{animal.species}</div>
        </div>
      </td>
      <td className="p-4">
        <button onClick={() => onCellClick(animal, LogType.WEIGHT)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold">
          {getTodayLog(animal.id, LogType.WEIGHT)?.value || '--'}
        </button>
      </td>
      <td className="p-4">
        <button onClick={() => onCellClick(animal, LogType.FEED)} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-xs font-bold text-emerald-800">
          {getTodayLog(animal.id, LogType.FEED)?.value || 'Feed'}
        </button>
      </td>
      <td className="p-4">
        <button onClick={() => onCellClick(animal, LogType.TEMPERATURE)} className="text-xs font-bold text-slate-600 hover:text-emerald-600">
          {getTodayLog(animal.id, LogType.TEMPERATURE)?.value || '--'}
        </button>
      </td>
    </tr>
  );
};
