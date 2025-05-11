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
  
  console.log(`Scheduling token refresh in ${Math.floor(refreshDelay / 1000)} seconds`);
  
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
        console.log('[AuthStore Initialize] Already initialized, skipping.');
        return;
      }
      console.log('[AuthStore Initialize] Starting initialization...');
      try {
        set({ loading: true, error: null, initialized: false }); // Ensure error/initialized are reset
        
        console.log('[AuthStore Initialize] Attempting to get session...');
        const { data, error } = await supabase.auth.getSession();
        console.log('[AuthStore Initialize] getSession response:', { sessionExists: !!data.session, error });
        
        if (error) {
          console.error('[AuthStore Initialize] Error getting session:', error.message);
          set({ error: error.message, initialized: true, loading: false }); // Ensure loading is false
          return;
        }
        
        set({ 
          session: data.session, 
          initialized: true
        });
        console.log('[AuthStore Initialize] Session set in store. Current session:', data.session ? 'Exists' : 'Null');
        
        if (data.session) {
          console.log('[AuthStore Initialize] Session exists, attempting to fetch user profile...');
          try {
            await get().fetchUserProfile(); // fetchUserProfile has its own logs
            console.log('[AuthStore Initialize] User profile fetch attempt completed.');
            
            clearRefreshTimeout();
            console.log('[AuthStore Initialize] Scheduling token refresh.');
            refreshTimeoutId = scheduleTokenRefresh(data.session, () => {
              console.log('[AuthStore Initialize] Scheduled token refresh triggered.');
              get().refreshSession().catch(err => {
                console.warn('[AuthStore Initialize] Auto-refresh from schedule failed:', err);
              });
            });
            
          } catch (profileError: any) {
            console.warn('[AuthStore Initialize] Error during initial profile fetch or refresh scheduling:', profileError.message);
            // Do not set loading to false here, finally block will do it.
          }
        } else {
          console.log('[AuthStore Initialize] No session found after getSession.');
        }
        
        console.log('[AuthStore Initialize] Setting up onAuthStateChange listener...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
          console.log('[AuthStore onAuthStateChange] Event:', event, '; Session:', session ? 'Exists' : 'Null');
          
          set({ session });
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            console.log('[AuthStore onAuthStateChange] SIGNED_IN or TOKEN_REFRESHED. Fetching profile & scheduling refresh.');
            clearRefreshTimeout();
            if (session) {
              refreshTimeoutId = scheduleTokenRefresh(session, () => {
                console.log('[AuthStore onAuthStateChange] Scheduled token refresh triggered.');
                get().refreshSession().catch(err => {
                  console.warn('[AuthStore onAuthStateChange] Auto-refresh from schedule failed:', err);
                });
              });
            }
            
            get().fetchUserProfile().catch(err => {
              console.warn('[AuthStore onAuthStateChange] Error fetching profile after auth change:', err);
            });
          } 
          else if ((event as string) === 'USER_DELETED' || event === 'SIGNED_OUT') { 
            console.log('[AuthStore onAuthStateChange] USER_DELETED or SIGNED_OUT. Clearing profile/session.');
            clearRefreshTimeout();
            set({ userProfile: null, session: null });
          }
        });
        console.log('[AuthStore Initialize] onAuthStateChange listener set up.');
        
        return;

      } catch (error: any) {
        console.error('[AuthStore Initialize] Critical error during initialization:', error.message);
        set({ error: error.message, initialized: true, loading: false });
      } finally {
        console.log('[AuthStore Initialize] Initialization function finally block. Setting loading to false.');
        set({ loading: false });
      }
    },

    setAppResuming: (isResuming: boolean) => {
      console.log(`[AuthStore setAppResuming] Setting isAppResuming to: ${isResuming}`);
      set({ isAppResuming: isResuming });
    },

    setPendingModalPath: (path: string | null) => {
      console.log(`[AuthStore setPendingModalPath] Setting pendingModalPath to: ${path}`);
      set({ pendingModalPath: path });
    },

    fetchUserProfile: async (): Promise<void> => {
      const currentState = get();
      console.log('[AuthStore fetchUserProfile] Attempting to fetch profile. User session exists:', !!currentState.session?.user);

      try {
        if (!currentState.session?.user) {
          console.warn('[AuthStore fetchUserProfile] No active session or user, cannot fetch profile.');
          set({ userProfile: null }); // Clear profile if no user/session
          return;
        }

        console.log(`[AuthStore fetchUserProfile] Fetching auth user (ID: ${currentState.session.user.id})...`);
        const { data: userAuth, error: authError } = await supabase.auth.getUser();
        console.log('[AuthStore fetchUserProfile] supabase.auth.getUser response:', { userAuth, authError });
        
        if (authError || !userAuth.user) {
          console.error('[AuthStore fetchUserProfile] Error getting auth user or no user found:', authError?.message || 'No user data');
          set({ userProfile: null }); // Clear profile on error
          return;
        }

        console.log(`[AuthStore fetchUserProfile] Fetching database profile for user ID: ${userAuth.user.id}`);
        const { data: profile, error: profileError } = await supabase
            .schema('public')
            .from('users')
            .select('*')
            .eq('id', userAuth.user.id)
            .single();
        console.log('[AuthStore fetchUserProfile] Database profile response:', { profile, profileError });

        if (profileError) {
          console.error('[AuthStore fetchUserProfile] Error fetching database profile:', profileError.message);
          set({ userProfile: null }); // Clear profile on error
          return;
        }

        if (profile) {
          console.log('[AuthStore fetchUserProfile] User profile retrieved:', profile.username || profile.email);
          set({ userProfile: profile as UserProfile });
        } else {
          console.warn('[AuthStore fetchUserProfile] No database profile found for ID:', userAuth.user.id);
          set({ userProfile: null }); // Clear profile if not found
        }
      } catch (error: any) {
        console.error('[AuthStore fetchUserProfile] Critical error in fetchUserProfile:', error.message);
        set({ userProfile: null }); // Clear profile on critical error
      }
    },

    refreshSession: async (): Promise<boolean> => {
      set({ loading: true });
      
      try {
        console.log('Manually refreshing auth session...');
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Session refresh failed:', error.message);
          return false;
        }
        
        if (data.session) {
          console.log('Session refreshed successfully');
          set({ session: data.session });
          
          // Schedule next refresh
          clearRefreshTimeout();
          refreshTimeoutId = scheduleTokenRefresh(data.session, () => {
            get().refreshSession().catch(err => {
              console.warn('Auto-refresh failed:', err);
            });
          });
          
          return true;
        }
        
        return false;
      } catch (error: any) {
        console.error('Error refreshing session:', error);
        set({ error: error.message });
        return false;
      } finally {
        set({ loading: false });
      }
    },

    signIn: async (email: string, password: string): Promise<void> => {
      try {
        set({ loading: true, error: null });
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        set({ session: data.session });
        
        // Schedule refresh if needed
        if (data.session) {
          clearRefreshTimeout();
          refreshTimeoutId = scheduleTokenRefresh(data.session, () => {
            get().refreshSession().catch(err => {
              console.warn('Auto-refresh failed:', err);
            });
          });
          
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

    signUp: async (email: string, password: string): Promise<void> => {
      try {
        set({ loading: true, error: null });
        
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
              console.warn('Auto-refresh failed:', err);
            });
          });
          
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

    signOut: async (): Promise<void> => {
      try {
        set({ loading: true, error: null });
        
        // Important! Need to clear local state first to prevent navigation issues
        clearRefreshTimeout();
        set({ userProfile: null });
        
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        
        // Always reset local state regardless of errors
        set({ session: null });
        
        if (error) {
          // Log but don't throw - we've already cleaned up local state
          console.error('Sign out API error:', error.message);
        }
      } catch (error: any) {
        console.error('Sign out error:', error.message);
        // Still reset local state
        set({ session: null });
      } finally {
        set({ loading: false });
      }
    },
  };
});