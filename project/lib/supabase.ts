import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Custom storage implementation with error handling
const customStorage = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return null;
      }
      const value = await AsyncStorage.getItem(key);
      if (value) {
        // Validate JWT data before returning
        try {
          const parsed = JSON.parse(value);
          if (parsed?.session?.access_token) {
            return value;
          }
        } catch (e) {
          await AsyncStorage.removeItem(key);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting item from AsyncStorage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in AsyncStorage:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from AsyncStorage:', error);
    }
  }
};

// Create the Supabase client with enhanced error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    debug: true,
    // Add JWT claim validation
    onAuthStateChange: async (event, session) => {
      if (event === 'SIGNED_IN') {
        if (!session?.user?.id || !session?.access_token) {
          console.warn('Invalid session detected, clearing auth state');
          await supabase.auth.signOut();
          return;
        }
      }
    },
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
    },
    fetch: async (url, options = {}) => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        // Set up headers
        const headers = {
          ...options.headers,
          'apikey': supabaseAnonKey,
        };

        // Add Authorization header if we have a session
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        // Add retry logic for failed requests
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          try {
            const response = await fetch(url, {
              ...options,
              headers,
            });

            // Handle auth errors
            if (response.status === 401 || response.status === 403) {
              const data = await response.json();
              if (data?.message?.includes('JWT') || data?.message?.includes('invalid')) {
                console.warn('Invalid JWT detected, signing out');
                await supabase.auth.signOut();
                throw new Error('Session expired. Please sign in again.');
              }
            }

            return response;
          } catch (error: any) {
            attempts++;
            if (attempts === maxAttempts || error.message.includes('Session expired')) {
              throw error;
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }

        throw new Error('Request failed after multiple attempts');
      } catch (error: any) {
        console.error('Supabase request failed:', {
          url,
          error: error.message,
        });
        throw error;
      }
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 1,
    },
  },
  db: {
    schema: 'public',
  },
});

// Helper function to safely make authenticated requests
export async function withAuth<T>(
  callback: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id || !session?.access_token) {
      console.warn('No valid session found for authenticated request');
      return fallback;
    }
    
    return await callback();
  } catch (error) {
    console.error('Error in authenticated request:', error);
    return fallback;
  }
}

// Helper function to handle Supabase errors consistently
export function handleSupabaseError(error: any): string {
  if (error?.message?.includes('JWT') || error?.message?.includes('claim')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (error?.message?.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }
  if (error?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (error?.status === 503) {
    return 'The service is temporarily unavailable. Please try again in a moment.';
  }
  if (error?.status === 401 || error?.status === 403) {
    return 'Authentication failed. Please sign in again.';
  }
  return error?.message || 'An unexpected error occurred';
}