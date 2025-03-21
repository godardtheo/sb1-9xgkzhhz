import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface AuthState {
  session: any | null;
  user: any | null;
  initialized: boolean;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ data: any | null, error: any | null }>;
  signIn: (email: string, password: string) => Promise<{ data: any | null, error: any | null }>;
  signOut: () => Promise<{ error: any | null }>;
  initialize: () => Promise<void>;
  initializeUserData: () => Promise<void>;
}

// Create a safe storage implementation
const safeStorage = {
  getItem: async (...args: Parameters<typeof AsyncStorage.getItem>) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return null;
      }
      const value = await AsyncStorage.getItem(...args);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          // Validate session data structure
          if (parsed?.state?.session?.access_token && parsed?.state?.user?.id) {
            return value;
          }
        } catch (e) {
          console.warn('Invalid session data, clearing storage');
          await AsyncStorage.removeItem(...args);
        }
      }
      return null;
    } catch (error) {
      console.warn('Storage getItem error:', error);
      return null;
    }
  },
  setItem: async (...args: Parameters<typeof AsyncStorage.setItem>) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return;
      }
      await AsyncStorage.setItem(...args);
    } catch (error) {
      console.warn('Storage setItem error:', error);
    }
  },
  removeItem: async (...args: Parameters<typeof AsyncStorage.removeItem>) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return;
      }
      await AsyncStorage.removeItem(...args);
    } catch (error) {
      console.warn('Storage removeItem error:', error);
    }
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      initialized: false,
      loading: false,

      initialize: async () => {
        try {
          // Clear any existing invalid sessions
          const currentSession = await supabase.auth.getSession();
          if (!currentSession.data.session?.access_token) {
            await supabase.auth.signOut();
            await safeStorage.removeItem('auth-storage');
            set({ session: null, user: null, initialized: true });
            return;
          }

          const { data } = await supabase.auth.getSession();
          
          if (data && data.session) {
            // Validate session
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
              console.warn('Invalid user in session, clearing auth state');
              await supabase.auth.signOut();
              set({ session: null, user: null, initialized: true });
              return;
            }

            set({
              session: data.session,
              user: user,
              initialized: true
            });
            
            // Initialize user data after session is confirmed
            await get().initializeUserData();
          } else {
            set({
              session: null,
              user: null,
              initialized: true
            });
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          // Clear invalid state
          await supabase.auth.signOut();
          set({
            session: null,
            user: null,
            initialized: true
          });
        }
      },

      initializeUserData: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.warn('No authenticated user found');
            return;
          }

          // Fetch user profile data
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) {
            throw profileError;
          }

          // If no profile exists, create one
          if (!profile) {
            const { data: newProfile, error: createError } = await supabase
              .from('users')
              .insert([
                {
                  id: user.id,
                  email: user.email,
                  username: user.email?.split('@')[0] || 'user',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ])
              .select()
              .single();

            if (createError) throw createError;
            
            set({ user: { ...user, profile: newProfile } });
          } else {
            set({ user: { ...user, profile } });
          }
        } catch (error) {
          console.error('Error initializing user data:', error);
          // Don't throw, but log the error
        }
      },

      signUp: async (email, password) => {
        try {
          set({ loading: true });
          
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin
            }
          });
          
          if (error) throw error;
          
          if (data.session) {
            set({
              session: data.session,
              user: data.user,
              loading: false
            });
            
            // Initialize user data after successful signup
            await get().initializeUserData();
          }
          
          return { data, error: null };
        } catch (error) {
          console.error('Signup error:', error);
          set({ loading: false });
          return { data: null, error };
        }
      },

      signIn: async (email, password) => {
        try {
          set({ loading: true });
          
          // Clear any existing session
          await safeStorage.removeItem('auth-storage');
          await supabase.auth.signOut();
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (error) throw error;
          
          // Validate session
          if (!data.session?.access_token || !data.user?.id) {
            throw new Error('Invalid session data received');
          }
          
          set({
            session: data.session,
            user: data.user,
            loading: false
          });
          
          // Initialize user data after successful login
          await get().initializeUserData();
          
          return { data, error: null };
        } catch (error) {
          console.error('Login error:', error);
          set({ loading: false });
          return { data: null, error };
        }
      },

      signOut: async () => {
        try {
          set({ loading: true });
          
          // Local signout
          await supabase.auth.signOut();
          
          // Clear storage
          await safeStorage.removeItem('auth-storage');
          
          set({
            session: null,
            user: null,
            loading: false
          });
          
          return { error: null };
        } catch (error) {
          console.error('Error signing out:', error);
          // Force clear state even if error occurs
          set({
            session: null,
            user: null,
            loading: false
          });
          return { error };
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
      }),
    }
  )
);

// Setup auth state change listener
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(async (event, session) => {
    const store = useAuthStore.getState();
    
    if (event === 'SIGNED_IN' && session) {
      // Validate session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn('Invalid user in session event');
        await supabase.auth.signOut();
        useAuthStore.setState({
          session: null,
          user: null,
        });
        return;
      }
      
      useAuthStore.setState({
        session: session,
        user: user,
      });
      
      // Initialize user data when auth state changes to signed in
      await store.initializeUserData();
    } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      // Clear state and storage
      await safeStorage.removeItem('auth-storage');
      useAuthStore.setState({
        session: null,
        user: null,
      });
    }
  });
}