import { useState, useEffect, useMemo } from 'react';
import { AnimalCategory, DailyRound, Animal, LogType, LogEntry } from '../../types';
import { db } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { useHybridQuery, mutateOnlineFirst } from '../../lib/dataEngine';

interface AnimalCheckState {
    isAlive?: boolean;
    isWatered: boolean;
    isSecure: boolean;
    securityIssue?: string;
    healthIssue?: string;
}

export function useDailyRoundData(viewDate: string) {
    const liveAnimals = useHybridQuery<Animal[]>('animals', () => db.animals.toArray(), []);
    const allAnimals = useMemo(() => liveAnimals || [], [liveAnimals]);

    const liveLogs = useHybridQuery<LogEntry[]>('daily_logs', () => db.daily_logs.where('log_date').startsWith(viewDate).toArray(), [viewDate]);

    const [roundType, setRoundType] = useState<'Morning' | 'Evening'>('Morning');
    const [activeTab, setActiveTab] = useState<AnimalCategory>(AnimalCategory.OWLS);
    
    const [checks, setChecks] = useState<Record<string, AnimalCheckState>>({});
    const [signingInitials, setSigningInitials] = useState('');
    const [generalNotes, setGeneralNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isLoading = liveAnimals === undefined;

    useEffect(() => {
        const timer = setTimeout(() => {
            setChecks({});
            setSigningInitials('');
            setGeneralNotes('');
        }, 0);
        return () => clearTimeout(timer);
    }, [viewDate, roundType, activeTab]);

    const categoryAnimals = useMemo(() => {
        return allAnimals.filter(a => a.category === activeTab);
    }, [allAnimals, activeTab]);

    const freezingRisks = useMemo(() => {
        const risks: Record<string, boolean> = {};
        if (!liveLogs) return risks;

        categoryAnimals.forEach(animal => {
            if (animal.water_tipping_temp !== undefined) {
                const tempLog = liveLogs.find(l => l.animal_id === animal.id && l.log_type === LogType.TEMPERATURE);
                if (tempLog && tempLog.temperature_c !== undefined && tempLog.temperature_c <= animal.water_tipping_temp) {
                    risks[animal.id] = true;
                }
            }
        });
        return risks;
    }, [categoryAnimals, liveLogs]);

    const toggleHealth = (id: string, issue?: string) => {
        setChecks(prev => {
            const current = prev[id] || { isWatered: false, isSecure: false };
            if (current.isAlive === true) {
                return { ...prev, [id]: { ...current, isAlive: false, healthIssue: issue } };
            } else if (current.isAlive === false) {
                return { ...prev, [id]: { ...current, isAlive: true, healthIssue: undefined } };
            } else {
                return { ...prev, [id]: { ...current, isAlive: true } };
            }
        });
    };

    const toggleWater = (id: string) => {
        setChecks(prev => {
            const current = prev[id] || { isWatered: false, isSecure: false };
            return { ...prev, [id]: { ...current, isWatered: !current.isWatered } };
        });
    };

    const toggleSecure = (id: string, issue?: string) => {
        setChecks(prev => {
            const current = prev[id] || { isWatered: false, isSecure: false };
            if (current.isSecure) {
                return { ...prev, [id]: { ...current, isSecure: false, securityIssue: issue } };
            } else if (current.securityIssue) {
                return { ...prev, [id]: { ...current, isSecure: true, securityIssue: undefined } };
            } else {
                return { ...prev, [id]: { ...current, isSecure: true } };
            }
        });
    };

    const completedChecks = useMemo(() => {
        return categoryAnimals.filter(animal => {
            const state = checks[animal.id];
            if (!state) return false;
            
            const isDone = (activeTab === AnimalCategory.OWLS || activeTab === AnimalCategory.RAPTORS) 
                ? (state.isAlive !== undefined && (state.isSecure || Boolean(state.securityIssue)))
                : (state.isAlive !== undefined && state.isWatered && (state.isSecure || Boolean(state.securityIssue)));
            
            return isDone;
        }).length;
    }, [categoryAnimals, checks, activeTab]);

    const totalAnimals = categoryAnimals.length;
    const progress = totalAnimals === 0 ? 0 : Math.round((completedChecks / totalAnimals) * 100);
    const isComplete = totalAnimals > 0 && completedChecks === totalAnimals;
    
    const isNoteRequired = useMemo(() => {
        if (activeTab === AnimalCategory.OWLS || activeTab === AnimalCategory.RAPTORS) return false;
        return false;
    }, [activeTab]);

    const isPastRound = false;

    const handleSignOff = async () => {
        if (!isComplete || !signingInitials) return;
        
        setIsSubmitting(true);
        try {
            const round: DailyRound = {
                id: uuidv4(),
                date: viewDate,
                shift: roundType,
                status: 'Completed',
                completedBy: signingInitials,
                notes: generalNotes
            };
            
            await mutateOnlineFirst('daily_rounds', round, 'upsert');
            
            // Also create log entries for each check if needed, 
            // but for now we just save the round summary for the report.
            
            // alert('Round signed off successfully!');
        } catch (error) {
            console.error('Failed to sign off round:', error);
            // alert('Failed to sign off round. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentUser = {
        signature_data: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/John_Hancock_signature.png'
    };

    return {
        categoryAnimals,
        isLoading,
        roundType,
        setRoundType,
        activeTab,
        setActiveTab,
        checks,
        progress,
        isComplete,
        isNoteRequired,
        signingInitials,
        setSigningInitials,
        generalNotes,
        setGeneralNotes,
        isSubmitting,
        isPastRound,
        toggleWater,
        toggleSecure,
        toggleHealth,
        handleSignOff,
        currentUser,
        completedChecks,
        totalAnimals,
        freezingRisks
    };
}
