import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

export const useInactivityTimer = () => {
  const { setUiLocked, session } = useAuthStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (session) {
        setUiLocked(true);
      }
    }, 300000); // 5 minutes
  }, [session, setUiLocked]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [session, resetTimer]);
};
