import React, { memo } from 'react';
import { Animal, LogType, LogEntry } from '../../../types';

interface ExoticRowProps {
  animal: Animal;
  getTodayLog: (animalId: string, type: LogType) => LogEntry | undefined;
  onCellClick: (animal: Animal, type: LogType) => void;
}

export const ExoticRow: React.FC<ExoticRowProps> = memo(({ animal, getTodayLog, onCellClick }) => {
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
        <button onClick={() => onCellClick(animal, LogType.FEED)} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-xs font-bold text-emerald-800">
          {getTodayLog(animal.id, LogType.FEED)?.value || 'Feed'}
        </button>
      </td>
      <td className="p-4">
        <button onClick={() => onCellClick(animal, LogType.MISTING)} className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-xs font-bold text-blue-800">
          {getTodayLog(animal.id, LogType.MISTING)?.value || 'Mist'}
        </button>
      </td>
      <td className="p-4">
        <button 
          onClick={() => onCellClick(animal, LogType.TEMPERATURE)}
          className="w-full grid grid-cols-2 divide-x-2 divide-slate-200 border-2 border-slate-200 rounded-xl overflow-hidden hover:border-emerald-500 transition-all bg-white"
        >
          {getTodayLog(animal.id, LogType.TEMPERATURE) ? (
            <>
              <div className="py-2 flex flex-col items-center bg-slate-50/50">
                <span className="text-[8px] font-black text-slate-400 uppercase">BASK</span>
                <span className="text-xs font-bold text-slate-800">
                  {getTodayLog(animal.id, LogType.TEMPERATURE)?.value?.split('|')[0] ?? '--'}
                </span>
              </div>
              <div className="py-2 flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-400 uppercase">COOL</span>
                <span className="text-xs font-bold text-slate-800">
                  {getTodayLog(animal.id, LogType.TEMPERATURE)?.value?.split('|')[1] ?? '--'}
                </span>
              </div>
            </>
          ) : (
            <div className="col-span-2 py-3 text-[10px] font-black text-slate-400 uppercase text-center">
              Add Temps
            </div>
          )}
        </button>
      </td>
    </tr>
  );
});
