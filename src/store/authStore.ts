import { create } from 'zustand';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';
import { db } from '../lib/db';
import { mutateOnlineFirst } from '../lib/dataEngine';

interface AuthState {
  session: Session | null;
  user: SupabaseUser | null;
  currentUser: User | null; // Kept for compatibility with existing components
  isLoading: boolean;
  shiftPin: string | null;
  isUiLocked: boolean;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  initialize: () => Promise<(() => void) | void>;
  setShiftPin: (pin: string | null) => void;
  setUiLocked: (locked: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  currentUser: null,
  isLoading: true,
  shiftPin: null,
  isUiLocked: false,

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  setShiftPin: (pin) => set({ shiftPin: pin }),
  setUiLocked: (locked) => set({ isUiLocked: locked }),

  initialize: async () => {
    set({ isLoading: true });
    
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      await syncUserRole(session.user, set);
    } else {
      set({ session: null, user: null, currentUser: null, isLoading: false });
    }

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await syncUserRole(session.user, set);
      } else {
        set({ session: null, user: null, currentUser: null, isLoading: false });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },
}));

let isSyncing = false;
async function syncUserRole(supabaseUser: SupabaseUser, set: (state: Partial<AuthState>) => void) {
  if (isSyncing) return;
  isSyncing = true;

  if (!supabaseUser.email) {
    set({ session: null, user: null, currentUser: null, isLoading: false });
    isSyncing = false;
    return;
  }

  try {
    // 1. Check if user exists in Dexie
    let localUser = await db.users.where('email').equals(supabaseUser.email).first();

    if (!localUser) {
      // 1.5 Try fetching from Supabase directly if not in local cache
      const { data: remoteUser, error: remoteError } = await supabase
        .from('users')
        .select('*')
        .eq('email', supabaseUser.email)
        .maybeSingle();
      
      if (remoteUser && !remoteError) {
        localUser = remoteUser as User;
        await db.users.put(localUser);
      } else if (supabaseUser.email === 'admin@kentowlacademy.com') {
        // Bootstrap the primary admin if they exist in Auth but not in the users table
        const newAdmin: User = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: 'System Administrator',
          role: UserRole.ADMIN,
          initials: 'SA',
          permissions: {
            dashboard: true,
            dailyLog: true,
            tasks: true,
            medical: true,
            movements: true,
            safety: true,
            maintenance: true,
            settings: true,
            userManagement: true
          }
        };
        await mutateOnlineFirst('users', newAdmin, 'upsert');
        localUser = newAdmin;
      }
    }

    if (localUser) {
      // Update local user ID if it doesn't match Supabase (e.g. if created manually via email)
      if (localUser.id !== supabaseUser.id) {
        const oldId = localUser.id;
        const updatedUser = { ...localUser, id: supabaseUser.id };
        
        await mutateOnlineFirst('users', updatedUser, 'upsert');
        await mutateOnlineFirst('users', { id: oldId }, 'delete');
        
        localUser = updatedUser;
      }
      
      set({ 
        session: (await supabase.auth.getSession()).data.session, 
        user: supabaseUser, 
        currentUser: localUser, 
        isLoading: false 
      });
    } else {
      // 2. If localUser does NOT exist, treat as unauthorized
      console.warn('Unauthorized access attempt: User not found in local database', supabaseUser.email);
      await supabase.auth.signOut();
      set({ session: null, user: null, currentUser: null, isLoading: false });
    }
  } catch (error) {
    console.error('Error syncing user role:', error);
    set({ isLoading: false });
  } finally {
    isSyncing = false;
  }
}
