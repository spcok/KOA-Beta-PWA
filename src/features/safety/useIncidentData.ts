import { useState } from 'react';
import { db } from '../../lib/db';
import { Incident } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';
import { supabase } from '../../lib/supabase';

export const useIncidentData = () => {
  const incidentsData = useHybridQuery<Incident[]>(
    'incidents',
    supabase.from('incidents').select('*'),
    () => db.incidents.toArray(),
    []
  );
  const incidents = incidentsData || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const filteredIncidents = incidents.filter(i => {
    const matchesSearch = i.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'ALL' || i.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  const addIncident = async (incident: Omit<Incident, 'id'>) => {
    const newIncident = { ...incident, id: uuidv4() };
    await mutateOnlineFirst('incidents', newIncident as Record<string, unknown>, 'upsert');
  };

  const deleteIncident = async (id: string) => {
    await mutateOnlineFirst('incidents', { id }, 'delete');
  };

  return {
    incidents: filteredIncidents,
    isLoading: incidentsData === undefined,
    searchTerm,
    setSearchTerm,
    filterSeverity,
    setFilterSeverity,
    addIncident,
    deleteIncident
  };
};
