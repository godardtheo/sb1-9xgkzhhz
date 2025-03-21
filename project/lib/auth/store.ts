import { create } from 'zustand';
import { supabase } from '../supabase';

type AuthState = {
  session: any | null;
  user: any | null;
  initialized: boolean;
  loading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  needsRefresh: boolean;
  setNeedsRefresh: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  initialized: false,
  loading: false,
  needsRefresh: false,
  
  initialize: async () => {
    try {
      console.log('Initializing auth store...');
      set({ loading: true });
      
      // Attempt to refresh the session first
      try {
        await supabase.auth.refreshSession();
        console.log('Session refreshed successfully');
      } catch (error) {
        console.log('Session refresh failed:', error);
        // We'll continue anyway and check the session below
      }

      // Get the current session
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        throw error;
      }
      
      if (data?.session) {
        const { data: userData } = await supabase.auth.getUser();
        set({ 
          session: data.session, 
          user: userData?.user || null,
          initialized: true 
        });
        console.log('User authenticated:', userData?.user?.email);
      } else {
        set({ 
          session: null, 
          user: null,
          initialized: true 
        });
        console.log('No authenticated session found');
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ initialized: true });
    } finally {
      set({ loading: false });
    }
  },
  
  signIn: async (email, password) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      set({ 
        session: data.session, 
        user: data.user
      });
    } finally {
      set({ loading: false });
    }
  },
  
  signUp: async (email, password) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      set({ 
        session: data.session, 
        user: data.user
      });
    } finally {
      set({ loading: false });
    }
  },
  
  signOut: async () => {
    try {
      set({ loading: true });
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      set({ 
        session: null, 
        user: null
      });
    } finally {
      set({ loading: false });
    }
  },

  refreshSession: async () => {
    try {
      set({ loading: true });
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Failed to refresh session:', error);
        // If refresh fails, we sign out to prevent infinite refresh attempts
        await supabase.auth.signOut();
        set({ 
          session: null, 
          user: null 
        });
        throw error;
      }
      
      set({ 
        session: data.session, 
        user: data.user 
      });
    } finally {
      set({ loading: false });
    }
  },

  setNeedsRefresh: (value) => {
    set({ needsRefresh: value });
  }
}));