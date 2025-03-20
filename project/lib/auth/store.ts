import { create } from 'zustand';
import { supabase } from '../supabase';
import * as SecureStore from 'expo-secure-store';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    try {
      set({ loading: true });
      
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, initialized: true });
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      set({ loading: false });
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
    } catch (error: any) {
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
    } catch (error: any) {
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
      set({ session: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));