import React from 'react';
import { X } from 'lucide-react';
import { Animal, LogType } from '../../types';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: Animal;
  initialType: LogType;
  foodOptions: string[];
  feedMethods: string[];
  eventTypes: string[];
  allAnimals: Animal[];
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({ isOpen, onClose, animal, initialType }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-lg">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Log Activity: {animal.name}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="bg-slate-50 p-8 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-500">
            <p className="text-sm font-medium">Add Entry: {initialType}</p>
            <p className="text-xs">This module is part of Phase 2B.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEntryModal;
