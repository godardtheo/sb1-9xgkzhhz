import { create } from 'zustand';
import { supabase } from '../supabase';
import { Session } from '@supabase/supabase-js';

type UserProfile = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  height: number | null;
  weight: number | null;
};

interface AuthState {
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  userProfile: null,
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    try {
      set({ loading: true });
      
      // Get the initial session
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, initialized: true });
      
      // If we have a session, fetch the user profile
      if (session) {
        try {
          await get().fetchUserProfile();
        } catch (profileError) {
          console.warn('Error fetching initial profile:', profileError);
        }
      }
      
      // Only set up listeners in browser environment
      if (typeof window !== 'undefined') {
        // Listen for auth state changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
          set({ session });
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            try {
              await get().fetchUserProfile();
            } catch (profileError) {
              console.warn('Error fetching profile after auth change:', profileError);
            }
          } else if (event === 'SIGNED_OUT') {
            set({ userProfile: null });
          }
        });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchUserProfile: async () => {
    try {
      const currentSession = get().session;
      if (!currentSession) {
        console.warn('Attempted to fetch user profile without a session');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No user found in session');
        return;
      }

      console.log('Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      if (data) {
        console.log('User profile retrieved:', data.username);
        set({ userProfile: data as UserProfile });
      } else {
        console.warn('No user profile found for ID:', user.id);
      }
    } catch (error: any) {
      console.error('Error in fetchUserProfile:', error.message);
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      set({ session: data.session });
      
      // Fetch user profile after sign in
      if (data.session) {
        try {
          await get().fetchUserProfile();
        } catch (profileError) {
          console.warn('Error fetching profile after sign in:', profileError);
        }
      }
      
    } catch (error: any) {
      console.error('Sign in error:', error.message);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      set({ session: data.session });
      
      // The user profile will be created by a database trigger
      // but we need to fetch it
      if (data.session) {
        // Allow some time for the DB trigger to create the user
        setTimeout(async () => {
          try {
            await get().fetchUserProfile();
          } catch (profileError) {
            console.warn('Error fetching profile after sign up:', profileError);
          }
        }, 1000);
      }
      
    } catch (error: any) {
      console.error('Sign up error:', error.message);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      set({ session: null, userProfile: null });
      
    } catch (error: any) {
      console.error('Sign out error:', error.message);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));