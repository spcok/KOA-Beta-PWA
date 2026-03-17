import React, { useEffect, useState, useTransition } from 'react';
import { getFullWeather, FullWeatherData, WeatherDaily, WeatherHourly } from '../../services/weatherService';
import { analyzeFlightWeather } from '../../services/geminiService';
import { useOrgSettings } from '../settings/useOrgSettings';
import { 
    CloudSun, Wind, CloudRain, Sun, 
    Cloud, CloudLightning, Snowflake, Navigation, 
    Sparkles, Loader2, ShieldAlert, CheckCircle2, CloudFog, RefreshCw, Play
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const WeatherView: React.FC = () => {
  const { settings } = useOrgSettings();
  const [data, setData] = useState<FullWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // AI Advisor State
  const [isPendingAi, startTransitionAi] = useTransition();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Network State Listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Fetch Data with Cleanup and Error Handling
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const weather = await getFullWeather('Maidstone, Kent, UK');
        
        if (isMounted) {
          if (weather) {
            setData(weather);
            if (weather.daily && weather.daily.length > 0) {
              // Safely access the first daily date
              const firstDay = weather.daily[0];
              if (typeof firstDay.date === 'string') {
                setSelectedDate(firstDay.date);
              }
            }
          } else {
            setError('STATION OFFLINE');
          }
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
        if (isMounted) {
          setError('STATION OFFLINE');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadData();

    return () => { isMounted = false; };
  }, [settings?.address]);

  const handleGenerateAiAnalysis = () => {
      if (!navigator.onLine) {
          console.warn("Offline: AI Flight Advisor disabled.");
          return;
      }
      if (!data) return;
      const liveData24h = data.hourly.slice(0, 24);
      console.log("🌦️ [AI Advisor] Sending LIVE 24h data to Edge Function...");
      startTransitionAi(async () => {
          try {
            const analysis = await analyzeFlightWeather(liveData24h);
            console.log("Weather AI Analysis Received:", analysis);
            setAiAnalysis(analysis);
          } catch (err) {
            console.error('AI Analysis error:', err);
            setAiAnalysis('### Error\nFailed to generate safety audit. Please try again.');
          }
      });
  };

  useEffect(() => { setAiAnalysis(null); }, [selectedDate]);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-3">
            <Loader2 size={48} className="animate-spin text-emerald-600" />
            <p className="font-black uppercase tracking-[0.2em] text-xs">Initializing Telemetry...</p>
        </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-4">
        <ShieldAlert size={48} className="opacity-20" />
        <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">
          {error || 'STATION OFFLINE'}
        </div>
      </div>
    );
  }

  const { current, daily, hourly } = data;
  const selectedHourly = hourly.filter((h: WeatherHourly) => String(h.time).startsWith(selectedDate));

  const WeatherIcon = ({ code, size = 24, className = "" }: { code: number, size?: number, className?: string }) => {
     if (code === 0) return <Sun size={size} className={`text-yellow-400 ${className}`} />;
     if (code <= 3) return <CloudSun size={size} className={`text-slate-400 ${className}`} />;
     if (code <= 48) return <CloudFog size={size} className={`text-slate-400 ${className}`} />;
     if (code <= 67) return <CloudRain size={size} className={`text-blue-400 ${className}`} />;
     if (code <= 77) return <Snowflake size={size} className={`text-cyan-400 ${className}`} />;
     if (code <= 82) return <CloudRain size={size} className={`text-blue-500 ${className}`} />;
     if (code <= 99) return <CloudLightning size={size} className={`text-purple-500 ${className}`} />;
     return <Cloud size={size} className={`text-slate-400 ${className}`} />;
  };

  // Safely cast current values for logic
  const temp = typeof current.temperature === 'number' ? current.temperature : 0;
  const windGust = typeof current.windGust === 'number' ? current.windGust : 0;
  const windSpeed = typeof current.windSpeed === 'number' ? current.windSpeed : 0;

  const isFrostRisk = temp < 4;
  const isWindRisk = windGust > 18 || windSpeed > 15;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
           <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
             <CloudSun className="text-emerald-600" size={32} /> Meteorological Station
           </h1>
           <p className="text-sm text-slate-500 mt-1">Kent Owl Academy • Flight Safety Briefing</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
            {isFrostRisk && (
                <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-200">
                    <Snowflake size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">FROST RISK</span>
                </div>
            )}
            {isWindRisk && (
                <div className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-1 rounded-lg border border-rose-200">
                    <Wind size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">WIND WARNING</span>
                </div>
            )}
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">STATION ACTIVE</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 mx-4">
          
          {/* SIDEBAR: LIVE & AI */}
          <div className="xl:col-span-4 space-y-2">
              {/* CURRENT WEATHER CARD */}
              <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] -mr-10 -mt-10 rounded-full"></div>
                  <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">Local Telemetry</p>
                              <h1 className="text-3xl font-semibold tracking-tighter tabular-nums text-slate-900">{Math.round(temp)}<span className="text-xl text-slate-500">°C</span></h1>
                          </div>
                          <WeatherIcon code={Number(current.weatherCode) || 0} size={40} className="filter drop-shadow-lg" />
                      </div>
                      <p className="text-base font-semibold text-slate-800 mb-3">{String(current.description || 'Unknown')}</p>
                      
                      <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                              <p className="text-[7px] font-black uppercase text-slate-500 mb-0.5">WIND SPEED</p>
                              <p className="text-lg font-black">{String(windSpeed)}<span className="text-[9px] opacity-40 ml-0.5">MPH</span></p>
                              <div className="flex items-center gap-0.5 mt-0.5 opacity-60">
                                  <Navigation size={8} style={{transform: `rotate(${Number(current.windDirection) || 0}deg)`}}/>
                                  <span className="text-[7px] font-bold uppercase">{String(current.windDirection || 0)}°</span>
                              </div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                              <p className="text-[7px] font-black uppercase text-slate-500 mb-0.5">GUSTS</p>
                              <p className="text-lg font-black text-rose-400">{String(windGust)}<span className="text-[9px] opacity-40 ml-0.5">MPH</span></p>
                              <p className="text-[7px] font-bold text-slate-500 uppercase">PEAK</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* AI ADVISOR CARD */}
              <div className="bg-white rounded-lg border border-slate-300 shadow-lg overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h2 className="text-[9px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                              <Sparkles className="text-emerald-500" size={12}/> Flight AI Advisor
                          </h2>
                      </div>
                      <button 
                        onClick={handleGenerateAiAnalysis}
                        disabled={isPendingAi || isOffline}
                        className="bg-slate-900 hover:bg-black text-white px-1.5 py-0.5 rounded-md font-black uppercase text-[7px] tracking-widest transition-all flex items-center gap-1 disabled:opacity-50"
                        title={isOffline ? "AI Analysis requires an internet connection" : ""}
                      >
                        {isPendingAi ? <Loader2 size={8} className="animate-spin"/> : aiAnalysis ? <RefreshCw size={8}/> : <Play size={8}/>}
                        {isOffline ? 'Offline' : aiAnalysis ? 'Update' : 'Run Audit'}
                      </button>
                  </div>

                  <div className="p-2 overflow-y-auto max-h-32 scrollbar-thin">
                      {isOffline && !aiAnalysis && (
                          <div className="flex flex-col items-center justify-center py-4 text-amber-600 text-center bg-amber-50 rounded-lg mb-1">
                              <ShieldAlert size={16} className="mb-1" />
                              <p className="text-[8px] font-black uppercase tracking-[0.2em]">Connection Required</p>
                              <p className="text-[7px] font-medium mt-0.5">AI Analysis requires an internet connection.</p>
                          </div>
                      )}
                      {!aiAnalysis && !isPendingAi && !isOffline ? (
                          <div className="flex flex-col items-center justify-center py-4 text-slate-300 text-center">
                              <ShieldAlert size={20} className="mb-1 opacity-20" />
                              <p className="text-[8px] font-black uppercase tracking-[0.2em]">Safety Analysis Pending</p>
                              <p className="text-[7px] font-medium mt-0.5">Cross-reference forecast with flight protocols.</p>
                          </div>
                      ) : isPendingAi ? (
                          <div className="flex flex-col items-center justify-center py-4 space-y-1">
                              <Loader2 size={20} className="animate-spin text-emerald-500" />
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Analyzing Atmos...</p>
                          </div>
                      ) : (
                          <div className="prose prose-slate prose-xs max-w-none">
                               <ReactMarkdown 
                                components={{
                                    h3: ({...props}) => <h3 className="text-[9px] font-black uppercase tracking-widest text-emerald-800 mb-1 border-b border-emerald-100 pb-0.5" {...props} />,
                                    ul: ({...props}) => <ul className="list-disc pl-3 text-slate-700 font-bold text-[10px] space-y-0.5" {...props} />,
                                    p: ({...props}) => <p className="text-[10px] font-medium text-slate-600 leading-relaxed mb-1" {...props} />,
                                    strong: ({...props}) => <strong className="text-slate-900 font-black" {...props} />
                                }}
                              >
                                  {aiAnalysis || ''}
                              </ReactMarkdown>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* MAIN: FORECAST TABLE */}
          <div className="xl:col-span-8 space-y-2">
              
              {/* DATE TABS */}
              <div className="bg-white p-1 rounded-lg border border-slate-300 shadow-sm flex gap-1 overflow-x-auto scrollbar-hide">
                  {daily.slice(0, 7).map((day: WeatherDaily) => (
                      <button 
                        key={String(day.date)}
                        onClick={() => setSelectedDate(String(day.date))}
                        className={`flex-1 min-w-[70px] px-2 py-1 rounded-md flex flex-col items-center transition-all ${
                            day.date === selectedDate ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                          <span className="text-[7px] font-black uppercase tracking-widest opacity-60 mb-0">
                            {new Date(String(day.date)).toLocaleDateString('en-GB', {weekday: 'short'})}
                          </span>
                          <span className="text-[10px] font-black tabular-nums">
                            {new Date(String(day.date)).getDate()} {new Date(String(day.date)).toLocaleDateString('en-GB', {month: 'short'}).toUpperCase()}
                          </span>
                          <div className="mt-0 flex items-center gap-0.5">
                              <WeatherIcon code={Number(day.weatherCode) || 0} size={10} />
                              <span className="text-[8px] font-bold">{Math.round(Number(day.maxTemp) || 0)}°</span>
                          </div>
                      </button>
                  ))}
              </div>

              {/* HOURLY TABLE */}
              <div className="bg-white rounded-lg border border-slate-300 shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="text-base font-semibold text-slate-800">Hourly Operational Matrix</h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">High-Resolution Micro-Telemetry Forecast</p>
                        </div>
                        <div className="text-right">
                             <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-slate-700 shadow-sm">
                                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '---'}
                             </span>
                        </div>
                    </div>
                    
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-2 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Time</th>
                                    <th className="px-2 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                                    <th className="px-2 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Temp</th>
                                    <th className="px-2 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Wind / Gust</th>
                                    <th className="px-2 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Precip</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {selectedHourly.map((hour: WeatherHourly, idx: number) => {
                                    const dateObj = new Date(String(hour.time));
                                    const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                                    const isDaytime = dateObj.getHours() >= 7 && dateObj.getHours() <= 20;
                                    
                                    return (
                                        <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${!isDaytime ? 'bg-slate-50/30' : 'bg-white'}`}>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <span className="font-black text-slate-900 text-[10px] tabular-nums">{timeStr}</span>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <WeatherIcon code={Number(hour.weatherCode) || 0} size={12} />
                                                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wide truncate max-w-[80px]">{String(hour.description || 'Unknown')}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <span className="text-xs font-black text-slate-800 tabular-nums">{Math.round(Number(hour.temp) || 0)}°</span>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <Navigation 
                                                            size={10} 
                                                            style={{transform: `rotate(${Number(hour.windDirection) || 0}deg)`}} 
                                                            className="text-blue-500"
                                                        />
                                                        <span className="text-xs font-black text-slate-900 tabular-nums">{Math.round(Number(hour.windSpeed) || 0)}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[6px] font-black text-rose-500 uppercase leading-none">GUSTS</span>
                                                        <span className={`text-[9px] font-black tabular-nums ${Number(hour.windGust) > 18 ? 'text-rose-600' : 'text-slate-800'}`}>
                                                            {Math.round(Number(hour.windGust) || 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <div className="flex-1 h-0.5 bg-slate-100 rounded-full overflow-hidden w-6 hidden sm:block">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ${(Number(hour.precipProb) || 0) > 50 ? 'bg-blue-500' : (Number(hour.precipProb) || 0) > 20 ? 'bg-blue-300' : 'bg-slate-300'}`}
                                                            style={{ width: `${Number(hour.precipProb) || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[8px] font-black tabular-nums ${(Number(hour.precipProb) || 0) > 50 ? 'text-blue-600' : 'text-slate-400'}`}>{String(hour.precipProb || 0)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default WeatherView;
