import React, { useState, useMemo } from 'react';
import { Info, ChevronRight } from 'lucide-react';
import { useMissingRecordsData } from './useMissingRecordsData';

const MissingRecords: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Husbandry' | 'Details' | 'Health'>('Husbandry');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { alerts, complianceStats, categoryCompliance } = useMissingRecordsData();

  const categories = useMemo(() => ['ALL', ...Object.keys(categoryCompliance)], [categoryCompliance]);

  const filteredComplianceStats = useMemo(() => {
    if (selectedCategory === 'ALL') return complianceStats;
    return complianceStats.filter(stat => {
        const animal = alerts.find(a => a.animal_id === stat.animal_id);
        return animal?.animal_category === selectedCategory;
    });
  }, [complianceStats, alerts, selectedCategory]);

  const currentCategoryScores = useMemo(() => {
    if (selectedCategory === 'ALL') {
        const categories = Object.values(categoryCompliance);
        if (categories.length === 0) return { husbandry: 0, details: 0, health: 0 };
        return {
            husbandry: Math.round(categories.reduce((a, b) => a + b.husbandry, 0) / categories.length),
            details: Math.round(categories.reduce((a, b) => a + b.details, 0) / categories.length),
            health: Math.round(categories.reduce((a, b) => a + b.health, 0) / categories.length),
        };
    }
    return categoryCompliance[selectedCategory] || { husbandry: 0, details: 0, health: 0 };
  }, [categoryCompliance, selectedCategory]);

  const renderStatusDot = (score: number) => {
    const color = score === 100 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500';
    return <div className={`w-2.5 h-2.5 rounded-full ${color}`} />;
  };

  const renderComplianceList = () => (
    <div className="space-y-6">
        {/* Internal Compliance Bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <h4 className="font-black text-slate-900 uppercase tracking-tight">{selectedCategory} Compliance</h4>
            <div className="flex gap-8 text-center">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Husbandry</p>
                    <p className="text-lg font-black text-slate-900">{currentCategoryScores.husbandry}%</p>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Details</p>
                    <p className="text-lg font-black text-slate-900">{currentCategoryScores.details}%</p>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Health</p>
                    <p className="text-lg font-black text-slate-900">{currentCategoryScores.health}%</p>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-widest font-black">
                <tr>
                    <th className="px-6 py-4">Animal</th>
                    {activeTab === 'Details' && <th className="px-6 py-4">Scientific Name</th>}
                    <th className="px-6 py-4">Days Overdue/Missing</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Action</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredComplianceStats.map(stat => {
                    const animalAlert = alerts.find(a => a.animal_id === stat.animal_id && a.category === activeTab);
                    if (!animalAlert) return null;
                    
                    const score = activeTab === 'Details' ? stat.detailsScore : activeTab === 'Health' ? stat.healthScore : stat.husbandryScore;
                    
                    return (
                    <tr key={stat.animal_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{animalAlert.animal_name}</td>
                        {activeTab === 'Details' && <td className="px-6 py-4 text-slate-500 italic">...</td>}
                        <td className="px-6 py-4 text-slate-500">{animalAlert.days_overdue}</td>
                        <td className="px-6 py-4">{renderStatusDot(score)}</td>
                        <td className="px-6 py-4">
                        <button className="flex items-center gap-1 text-emerald-600 font-bold hover:text-emerald-700">
                            Resolve <ChevronRight size={14} />
                        </button>
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ZLA Compliance</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Zoo Licensing Act (ZLA) Compliance Command Centre
          </p>
        </div>
        <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900"
        >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-4 overflow-x-auto">
        {(['Husbandry', 'Details', 'Health'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-50 text-blue-700 rounded-xl font-bold'
                : 'text-slate-600 hover:bg-slate-100 rounded-xl'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {renderComplianceList()}

      <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] flex gap-4 items-start shadow-sm">
        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
          <Info size={20} />
        </div>
        <div>
          <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Zoo Licensing Act Compliance</h4>
          <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
            Standard ZLA requirements mandate regular health monitoring. Weights should be recorded at least fortnightly (14 days), feeds daily/weekly (7 days), and a clinical health check must be performed annually (365 days) for active animals.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MissingRecords;

