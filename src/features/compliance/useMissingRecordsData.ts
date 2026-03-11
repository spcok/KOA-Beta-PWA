import { useMemo } from 'react';
import { db } from '../../lib/db';
import { LogType, Animal, LogEntry, ClinicalNote } from '../../types';
import { useHybridQuery } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export interface MissingRecordAlert {
  id: string;
  animal_id: string;
  animal_name: string;
  animal_category: string;
  alert_type: 'Missing Weight' | 'Missing Feed' | 'Overdue Checkup' | 'Missing Details';
  days_overdue: number;
  severity: 'High' | 'Medium';
  category: 'Husbandry' | 'Health' | 'Details';
}

export interface HusbandryLogStatus {
  animal_id: string;
  animal_name: string;
  animal_category: string;
  weights: boolean[]; // 7 days
  feeds: boolean[];   // 7 days
}

export function useMissingRecordsData(anchorDate: Date = new Date()) {
  const animalsRaw = useHybridQuery<Animal[]>(
    'animals',
    supabase.from('animals').select('*'),
    () => db.animals.toArray(),
    []
  );
  const dailyLogsRaw = useHybridQuery<LogEntry[]>(
    'daily_logs',
    supabase.from('daily_logs').select('*'),
    () => db.daily_logs.toArray(),
    []
  );
  const medicalLogsRaw = useHybridQuery<ClinicalNote[]>(
    'medical_logs',
    supabase.from('medical_logs').select('*'),
    () => db.medical_logs.toArray(),
    []
  );

  const alerts = useMemo(() => {
    if (!animalsRaw || !dailyLogsRaw || !medicalLogsRaw) return [];
    
    const activeAnimals = animalsRaw.filter(a => !a.archived);
    const allAlerts: MissingRecordAlert[] = [];
    const now = new Date();

    for (const animal of activeAnimals) {
      const animalLogs = dailyLogsRaw.filter(l => l.animal_id === animal.id);
      
      // 1. Audit Weights (Last 14 days)
      const weightLogs = animalLogs
        .filter(log => log.log_type === LogType.WEIGHT)
        .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

      const latestWeight = weightLogs[0];
      const weightThreshold = 14;
      
      if (!latestWeight) {
        allAlerts.push({
          id: `weight-${animal.id}`,
          animal_id: animal.id,
          animal_name: animal.name,
          animal_category: animal.category,
          alert_type: 'Missing Weight',
          days_overdue: 999,
          severity: 'Medium',
          category: 'Husbandry'
        });
      } else {
        const lastDate = new Date(latestWeight.log_date);
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > weightThreshold) {
          allAlerts.push({
            id: `weight-${animal.id}`,
            animal_id: animal.id,
            animal_name: animal.name,
            animal_category: animal.category,
            alert_type: 'Missing Weight',
            days_overdue: diffDays,
            severity: 'Medium',
            category: 'Husbandry'
          });
        }
      }

      // 1b. Audit Feeds (Last 7 days)
      const feedLogs = animalLogs
        .filter(log => log.log_type === LogType.FEED)
        .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

      const latestFeed = feedLogs[0];
      const feedThreshold = 7;
      
      if (!latestFeed) {
        allAlerts.push({
          id: `feed-${animal.id}`,
          animal_id: animal.id,
          animal_name: animal.name,
          animal_category: animal.category,
          alert_type: 'Missing Feed',
          days_overdue: 999,
          severity: 'Medium',
          category: 'Husbandry'
        });
      } else {
        const lastDate = new Date(latestFeed.log_date);
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > feedThreshold) {
          allAlerts.push({
            id: `feed-${animal.id}`,
            animal_id: animal.id,
            animal_name: animal.name,
            animal_category: animal.category,
            alert_type: 'Missing Feed',
            days_overdue: diffDays,
            severity: 'Medium',
            category: 'Husbandry'
          });
        }
      }

      // 2. Audit Medical (Last 365 days)
      const animalMedicalLogs = medicalLogsRaw.filter(l => l.animal_id === animal.id);

      const checkupLogs = animalMedicalLogs
        .filter(log => 
          log.note_type.toLowerCase().includes('checkup') || 
          log.note_type.toLowerCase().includes('medical')
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const latestCheckup = checkupLogs[0];
      const checkupThreshold = 365;

      if (!latestCheckup) {
        allAlerts.push({
          id: `medical-${animal.id}`,
          animal_id: animal.id,
          animal_name: animal.name,
          animal_category: animal.category,
          alert_type: 'Overdue Checkup',
          days_overdue: 999,
          severity: 'High',
          category: 'Health'
        });
      } else {
        const lastDate = new Date(latestCheckup.date);
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > checkupThreshold) {
          allAlerts.push({
            id: `medical-${animal.id}`,
            animal_id: animal.id,
            animal_name: animal.name,
            animal_category: animal.category,
            alert_type: 'Overdue Checkup',
            days_overdue: diffDays,
            severity: 'High',
            category: 'Health'
          });
        }
      }

      // 3. Audit Animal Details
      if (!animal.ring_number || !animal.hazard_rating) {
        allAlerts.push({
          id: `details-${animal.id}`,
          animal_id: animal.id,
          animal_name: animal.name,
          animal_category: animal.category,
          alert_type: 'Missing Details',
          days_overdue: 0,
          severity: 'Medium',
          category: 'Details'
        });
      }
    }

    return allAlerts.sort((a, b) => {
      if (a.severity === b.severity) return b.days_overdue - a.days_overdue;
      return a.severity === 'High' ? -1 : 1;
    });
  }, [animalsRaw, dailyLogsRaw, medicalLogsRaw]);

  const husbandryStatus = useMemo(() => {
    if (!animalsRaw || !dailyLogsRaw) return [];
    
    const activeAnimals = animalsRaw.filter(a => !a.archived);
    const baseDate = new Date(anchorDate);
    const status: HusbandryLogStatus[] = [];

    for (const animal of activeAnimals) {
      const weights = Array(7).fill(false);
      const feeds = Array(7).fill(false);
      const animalLogs = dailyLogsRaw.filter(l => l.animal_id === animal.id);

      for (let i = 0; i < 7; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const dayLogs = animalLogs.filter(log => log.log_date.startsWith(dateStr));

        weights[i] = dayLogs.some(l => l.log_type === LogType.WEIGHT);
        feeds[i] = dayLogs.some(l => l.log_type === LogType.FEED);
      }
      status.push({ animal_id: animal.id, animal_name: animal.name, animal_category: animal.category, weights, feeds });
    }
    return status;
  }, [animalsRaw, dailyLogsRaw, anchorDate]);

  return {
    alerts,
    husbandryStatus,
    isLoading: animalsRaw === undefined || dailyLogsRaw === undefined || medicalLogsRaw === undefined
  };
}
