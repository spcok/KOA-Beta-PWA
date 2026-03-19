import React from 'react';
import { Zap, Plus, Loader2 } from 'lucide-react';
import { useTrainingData } from './hooks/useTrainingData';

interface TrainingProps {
  animalId?: string;
}

const Training: React.FC<TrainingProps> = ({ animalId }) => {
  const trainingRecords = useTrainingData(animalId);
  const isLoading = trainingRecords === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!animalId && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <Zap className="text-blue-600" size={24} /> Training Records
          </h2>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm">
            <Plus size={18} /> Add Record
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {trainingRecords && trainingRecords.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-700">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-700">Behavior</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-700">Notes</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-700 text-right">Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trainingRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{new Date(record.date).toLocaleDateString('en-GB')}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">{record.behavior}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 italic">{record.notes || '-'}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-500">{record.staff_initials}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-slate-500 italic">No training records found.</div>
        )}
      </div>
    </div>
  );
};

export default Training;
