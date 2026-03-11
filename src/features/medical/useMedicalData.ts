import { ClinicalNote, MARChart, QuarantineRecord, Animal } from '../../types';
import { db } from '../../lib/db';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export function useMedicalData() {
  const clinicalNotes = useHybridQuery<ClinicalNote[]>(
    'medical_logs',
    supabase.from('medical_logs').select('*'),
    () => db.medical_logs.toArray(),
    []
  );
  const marCharts = useHybridQuery<MARChart[]>(
    'mar_charts',
    supabase.from('mar_charts').select('*'),
    () => db.mar_charts.toArray(),
    []
  );
  const quarantineRecords = useHybridQuery<QuarantineRecord[]>(
    'quarantine_records',
    supabase.from('quarantine_records').select('*'),
    () => db.quarantine_records.toArray(),
    []
  );
  const animals = useHybridQuery<Animal[]>(
    'animals',
    supabase.from('animals').select('*'),
    () => db.animals.toArray(),
    []
  );

  const isLoading = clinicalNotes === undefined || marCharts === undefined || quarantineRecords === undefined || animals === undefined;

  const addClinicalNote = async (note: Omit<ClinicalNote, 'id' | 'animal_name'>) => {
    const animal = await db.animals.get(note.animal_id);
    const newNote: ClinicalNote = {
      ...note,
      id: crypto.randomUUID(),
      animal_name: animal?.name || 'Unknown'
    };
    await mutateOnlineFirst('medical_logs', newNote, 'upsert');
  };

  const updateClinicalNote = async (note: ClinicalNote) => {
    await mutateOnlineFirst('medical_logs', note, 'upsert');
  };

  const addMarChart = async (chart: Omit<MARChart, 'id' | 'animal_name' | 'administered_dates' | 'status'>) => {
    const animal = await db.animals.get(chart.animal_id);
    const newChart: MARChart = {
      ...chart,
      id: crypto.randomUUID(),
      animal_name: animal?.name || 'Unknown',
      administered_dates: [],
      status: 'Active'
    };
    await mutateOnlineFirst('mar_charts', newChart, 'upsert');
  };

  const updateMarChart = async (chart: MARChart) => {
    await mutateOnlineFirst('mar_charts', chart, 'upsert');
  };

  const signOffDose = async (chartId: string, dateIso: string) => {
    const chart = await db.mar_charts.get(chartId);
    if (chart) {
      const updatedChart = {
        ...chart,
        administered_dates: [...chart.administered_dates, dateIso]
      };
      await mutateOnlineFirst('mar_charts', updatedChart, 'upsert');
    }
  };

  const addQuarantineRecord = async (record: Omit<QuarantineRecord, 'id' | 'animal_name' | 'status'>) => {
    const animal = await db.animals.get(record.animal_id);
    const newRecord: QuarantineRecord = {
      ...record,
      id: crypto.randomUUID(),
      animal_name: animal?.name || 'Unknown',
      status: 'Active'
    };
    await mutateOnlineFirst('quarantine_records', newRecord, 'upsert');
  };

  const updateQuarantineRecord = async (record: QuarantineRecord) => {
    await mutateOnlineFirst('quarantine_records', record, 'upsert');
  };

  return { 
    clinicalNotes: clinicalNotes || [], 
    marCharts: marCharts || [], 
    quarantineRecords: quarantineRecords || [], 
    animals: animals || [], 
    isLoading, 
    addClinicalNote, 
    updateClinicalNote, 
    addMarChart, 
    updateMarChart, 
    signOffDose, 
    addQuarantineRecord, 
    updateQuarantineRecord 
  };
}
