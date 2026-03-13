import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { AppProvider } from './context/AppContext';
import { useAuthStore } from './store/authStore';
import LoginScreen from './features/auth/LoginScreen';
import LockScreen from './features/auth/LockScreen';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import DashboardContainer from './features/dashboard/DashboardContainer';
import WeatherView from './features/dashboard/WeatherView';
import Tasks from './features/husbandry/Tasks';
import FeedingSchedule from './features/husbandry/FeedingSchedule';
import DailyLog from './features/husbandry/DailyLog';
import DailyRounds from './features/husbandry/DailyRounds';
import MedicalRecords from './features/medical/MedicalRecords';
import Movements from './features/logistics/Movements';
import FlightRecords from './features/logistics/FlightRecords';
import Timesheets from './features/staff/Timesheets';
import Holidays from './features/staff/Holidays';
import StaffRota from './features/staff/StaffRota';
import MissingRecords from './features/compliance/MissingRecords';
import SettingsLayout from './features/settings/SettingsLayout';
import HelpSupport from './features/help/HelpSupport';
import Incidents from './features/safety/tabs/Incidents';
import FirstAidLog from './features/safety/tabs/FirstAid';
import SafetyDrills from './features/safety/tabs/SafetyDrills';
import SiteMaintenance from './features/safety/tabs/SiteMaintenance';
import ReportsDashboard from './features/reports/ReportsDashboard';
import { processSyncQueue, prune14DayCache, startRealtimeSubscription } from './lib/syncEngine';
import { hydrateComplianceData } from './services/syncService';
import PwaManager from './components/ui/PwaManager';

export default function App() {
  const { initialize, isLoading, session } = useAuthStore();
  useInactivityTimer();

  useEffect(() => {
    let cleanup: () => void;
    initialize().then(c => {
      if (typeof c === 'function') cleanup = c;
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, [initialize]);

  useEffect(() => {
    if (session) {
      // 1. Run Janitor
      prune14DayCache();
      
      // 2. Start Realtime
      const sub = startRealtimeSubscription();
      
      // 3. Process queue and hydrate if online
      if (navigator.onLine) {
        processSyncQueue();
        hydrateComplianceData();
      }

      return () => {
        sub.unsubscribe();
      };
    }
  }, [session]);

  // Network Resilience
  useEffect(() => {
    const handleOnline = () => {
      processSyncQueue();
      hydrateComplianceData();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-emerald-500 font-black uppercase tracking-widest text-[10px]">Verifying Session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <AppProvider>
      <LockScreen />
      <PwaManager />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* COMPLETED MILESTONE 1 ROUTES */}
            <Route index element={<DashboardContainer />} />
            <Route path="weather" element={<div className="p-2 md:p-4"><WeatherView /></div>} />
            <Route path="daily-log" element={<DailyLog />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="feeding-schedule" element={<FeedingSchedule />} />
            <Route path="daily-rounds" element={<DailyRounds />} />

            {/* PHASE 4: MEDICAL & QUARANTINE */}
            <Route path="medical" element={<MedicalRecords />} />
            <Route path="first-aid" element={<FirstAidLog />} />

            {/* PHASE 5: LOGISTICS & SAFETY */}
            <Route path="movements" element={<Movements />} />
            <Route path="flight-records" element={<FlightRecords />} />
            <Route path="maintenance" element={<SiteMaintenance />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="safety-drills" element={<SafetyDrills />} />

            {/* PHASE 6: STAFF & COMPLIANCE */}
            <Route path="timesheets" element={<Timesheets />} />
            <Route path="holidays" element={<Holidays />} />
            <Route path="rota" element={<StaffRota />} />
            <Route path="compliance" element={<MissingRecords />} />
            <Route path="reports" element={<ReportsDashboard />} />
            <Route path="missing-records" element={<MissingRecords />} />

            {/* PHASE 7: SETTINGS */}
            <Route path="settings" element={<SettingsLayout />} />
            <Route path="help" element={<HelpSupport />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
