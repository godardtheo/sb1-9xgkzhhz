import { create } from 'zustand';
import { supabase, withTimeout } from '../supabase';
import { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';

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
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
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
  
  return setTimeout(callback, refreshDelay);
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Keep token refresh timeout ID
  let refreshTimeoutId: NodeJS.Timeout | null = null;
  
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

    initialize: async () => {
      try {
        set({ loading: true });
        
        // Get the initial session
        const { data, error } = await withTimeout(supabase.auth.getSession());
        
        if (error) {
          console.error('Session retrieval error:', error);
          set({ error: error.message, initialized: true });
          return;
        }
        
        set({ 
          session: data.session, 
          initialized: true
        });
        
        // If we have a session, fetch the user profile
        if (data.session) {
          try {
            await get().fetchUserProfile();
            
            // Schedule refresh
            clearRefreshTimeout();
            refreshTimeoutId = scheduleTokenRefresh(data.session, () => {
              get().refreshSession().catch(err => {
                console.warn('Auto-refresh failed:', err);
              });
            });
            
          } catch (profileError) {
            console.warn('Error fetching initial profile:', profileError);
          }
        }
        
        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
          
          // Update the session in our state
          set({ session });
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Schedule refresh for the new session
            clearRefreshTimeout();
            if (session) {
              refreshTimeoutId = scheduleTokenRefresh(session, () => {
                get().refreshSession().catch(err => {
                  console.warn('Auto-refresh failed:', err);
                });
              });
            }
            
            // Fetch user profile
            get().fetchUserProfile().catch(err => {
              console.warn('Error fetching profile after auth change:', err);
            });
          } 
          else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            clearRefreshTimeout();
            set({ userProfile: null });
          }
        });
        
        // Return cleanup function to remove subscription
        return () => {
          subscription.unsubscribe();
        };
      } catch (error: any) {
        console.error('Error initializing auth:', error);
        set({ error: error.message, initialized: true });
      } finally {
        set({ loading: false });
      }
    },

    fetchUserProfile: async () => {
      const currentState = get();
      
      try {
        if (!currentState.session?.user) {
          console.warn('No active session, cannot fetch user profile');
          return;
        }

        // Get user from auth
        const { data, error } = await withTimeout(supabase.auth.getUser());
        
        if (error || !data.user) {
          console.error('Error getting auth user:', error || 'No user found');
          return;
        }

        console.log('Fetching profile for user:', data.user.id);
        
        // Fetch user profile
        const { data: profile, error: profileError } = await withTimeout(
          supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()
        );

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          return;
        }

        if (profile) {
          console.log('User profile retrieved:', profile.username || profile.email);
          set({ userProfile: profile as UserProfile });
        } else {
          console.warn('No user profile found for ID:', data.user.id);
        }
      } catch (error: any) {
        console.error('Error in fetchUserProfile:', error.message);
        // Don't update state to avoid UI disruption
      }
    },

    refreshSession: async (): Promise<boolean> => {
      set({ loading: true });
      
      try {
        console.log('Manually refreshing auth session...');
        const { data, error } = await withTimeout(supabase.auth.refreshSession());
        
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

    signIn: async (email: string, password: string) => {
      try {
        set({ loading: true, error: null });
        
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email,
            password,
          })
        );
        
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

    signUp: async (email: string, password: string) => {
      try {
        set({ loading: true, error: null });
        
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
          })
        );
        
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

    signOut: async () => {
      try {
        set({ loading: true, error: null });
        
        // Important! Need to clear local state first to prevent navigation issues
        clearRefreshTimeout();
        set({ userProfile: null });
        
        // Sign out from Supabase with timeout for reliability
        const { error } = await withTimeout(supabase.auth.signOut(), 5000);
        
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