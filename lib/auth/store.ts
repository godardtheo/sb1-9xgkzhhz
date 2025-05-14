import { create } from 'zustand';
import { supabase } from '../supabase';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Platform } from 'react-native';

type UserProfile = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  height: number | null;
  weight: number | null;
  gender: string | null;
  weight_unit: 'kg' | 'lb' | null;
  initial_weight?: number | null;
  target_weight?: number | null;
  language?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

interface AuthState {
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  isAppResuming: boolean;
  pendingModalPath: string | null;
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setAppResuming: (isResuming: boolean) => void;
  setPendingModalPath: (path: string | null) => void;
}

// Function to schedule token refresh
const scheduleTokenRefresh = (session: Session | null, callback: () => void) => {
  if (!session || !session.expires_at) return null;
  
  const expiresAt = session.expires_at * 1000; // Convert to milliseconds
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;
  
  // Schedule refresh for 5 minutes before expiration or immediately if close
  const refreshDelay = Math.max(0, timeUntilExpiry - 5 * 60 * 1000);
  
  return setTimeout(callback, refreshDelay) as unknown as number;
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Keep token refresh timeout ID
  let refreshTimeoutId: number | null = null;
  
  // Helper to clear refresh timeout
  const clearRefreshTimeout = () => {
    if (refreshTimeoutId) {
      clearTimeout(refreshTimeoutId);
      refreshTimeoutId = null;
    }
  };
  
  return {
    session: null,
    userProfile: null,
    loading: false,
    error: null,
    initialized: false,
    isAppResuming: false,
    pendingModalPath: null,

    initialize: async (): Promise<void> => {
      if (get().initialized) {
        return;
      }
      try {
        set({ loading: true, error: null, initialized: false }); // Ensure error/initialized are reset
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error.message);
          set({ error: error.message, initialized: true, loading: false }); // Ensure loading is false
          return;
        }
        
        set({ 
          session: data.session, 
          initialized: true
        });
        
        if (data.session) {
          try {
            await get().fetchUserProfile(); // fetchUserProfile has its own logs
            
            clearRefreshTimeout();
            refreshTimeoutId = scheduleTokenRefresh(data.session, () => {
              get().refreshSession().catch(err => {
              });
            });
            
          } catch (profileError: any) {
          }
        }
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
          
          set({ session });
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            clearRefreshTimeout();
            if (session) {
              refreshTimeoutId = scheduleTokenRefresh(session, () => {
                get().refreshSession().catch(err => {
                });
              });
            }
            
            get().fetchUserProfile().catch(err => {
            });
          } 
          else if ((event as string) === 'USER_DELETED' || event === 'SIGNED_OUT') { 
            clearRefreshTimeout();
            set({ userProfile: null, session: null, loading: false });
          }
        });
        
        return;

      } catch (error: any) {
        console.error('Critical error during initialization:', error.message);
        set({ error: error.message, initialized: true, loading: false });
      } finally {
        set({ loading: false });
      }
    },

    setAppResuming: (isResuming: boolean) => {
      set({ isAppResuming: isResuming });
    },

    setPendingModalPath: (path: string | null) => {
      set({ pendingModalPath: path });
    },

    fetchUserProfile: async (): Promise<void> => {
      const currentState = get();

      try {
        if (!currentState.session?.user) {
          set({ userProfile: null }); // Clear profile if no user/session
          return;
        }

        const { data: userAuth, error: authError } = await supabase.auth.getUser();
        
        if (authError || !userAuth.user) {
          console.error('Error getting auth user or no user found:', authError?.message || 'No user data');
          set({ userProfile: null }); // Clear profile on error
          return;
        }

        const { data: profile, error: profileError } = await supabase
            .schema('public')
            .from('users')
            .select('*')
            .eq('id', userAuth.user.id)
            .single();

        if (profileError) {
          console.error('Error fetching database profile:', profileError.message);
          set({ userProfile: null, error: profileError.message });
          return;
        }

        if (profile) {
          set({ userProfile: profile as UserProfile });
        } else {
          set({ userProfile: null }); // Clear profile if not found
        }
      } catch (error: any) {
        console.error('Critical error in fetchUserProfile:', error.message);
        set({ userProfile: null, error: error.message });
      }
    },

    refreshSession: async (): Promise<boolean> => {
      set({ loading: true, error: null });
      let success = false;
      try {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Error refreshing session:', error.message);
          set({ error: error.message, session: null, userProfile: null }); // Clear session/profile on error
          clearRefreshTimeout(); // Stop trying to refresh if it fails
        } else if (data.session) {
          set({ session: data.session });
          success = true;
        } else {
          set({ session: null, userProfile: null }); // Clear session/profile
          clearRefreshTimeout();
        }
      } catch (error: any) {
        console.error('Critical error during refreshSession:', error.message);
        set({ error: error.message, session: null, userProfile: null });
        clearRefreshTimeout();
      } finally {
        set({ loading: false });
      }
      return success;
    },

    signIn: async (email: string, password: string): Promise<void> => {
      set({ loading: true, error: null });
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        set({ session: data.session });
        
        if (data.session) {
          clearRefreshTimeout();
          refreshTimeoutId = scheduleTokenRefresh(data.session, () => {
            get().refreshSession().catch(err => {
            });
          });
          
          try {
            await get().fetchUserProfile();
          } catch (profileError) {
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

    signUp: async (email: string, password: string): Promise<void> => {
      set({ loading: true, error: null });
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        
        set({ session: data.session });
        
        if (data.session) {
          clearRefreshTimeout();
          refreshTimeoutId = scheduleTokenRefresh(data.session, () => {
            get().refreshSession().catch(err => {
            });
          });
          
          setTimeout(async () => {
            try {
              await get().fetchUserProfile();
            } catch (profileError) {
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

    signOut: async (): Promise<void> => {
        set({ loading: true, error: null });
        
        clearRefreshTimeout();
        set({ userProfile: null });
        
        const { error } = await supabase.auth.signOut();
        
        set({ session: null });
        
        if (error) {
          console.error('Sign out API error:', error.message);
      }
    },
  };
});

// Selectors (optional, but can be useful for memoization or derived state)
export const useIsAuthenticated = () => useAuthStore(state => !!state.session && !!state.userProfile);