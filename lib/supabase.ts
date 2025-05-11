import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, AuthError, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables');
}

// Custom storage implementation with error handling
const customStorage = {
  getItem: async (key: string) => {
    try {
      // For SSR or non-browser web environments, AsyncStorage might not be available immediately.
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return null;
      }
      const value = await AsyncStorage.getItem(key);
      if (value) {
        // Validate JWT data before returning to prevent app crashes with invalid stored sessions
        try {
          const parsed = JSON.parse(value);
          // A simple check for the existence of an access_token in the session structure
          if (parsed?.session?.access_token || parsed?.access_token) { // Check common session structures
            return value;
          }
        } catch (e) {
          // If parsing fails or structure is unexpected, remove the invalid item
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

// Determine schema based on environment
const schema = process.env.EXPO_PUBLIC_ENV === 'production' ? 'production' : 'public';

// Create the Supabase client with enhanced error handling and dynamic schema
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
    flowType: 'pkce', // Recommended for mobile and web apps
    debug: process.env.EXPO_PUBLIC_ENV !== 'production', // Enable debug only in non-production
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey, 
    },
    fetch: async (url, options = {}) => {
      const requestUrl = typeof url === 'string' ? url : (url as Request).url;
      console.log('[SupabaseClient Fetch] Global fetch intercepting:', requestUrl, options);

      // We will NOT manually add the Authorization header here anymore.
      // Trust the Supabase client (GoTrueClient, PostgrestClient) to add its own auth headers.
      // Our primary role here is to provide retry logic and centralized error observation.

      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          console.log(`[SupabaseClient Fetch] Attempt ${attempts + 1}/${maxAttempts} for ${requestUrl}`);
          
          // Use the options as passed by the Supabase client, which should include its own auth headers if needed.
          const response = await fetch(url, {
            ...options,
          });

          console.log(`[SupabaseClient Fetch] Response status for ${requestUrl}: ${response.status}`);

          if (response.status === 401) {
            let errorBody = {}; // Default to empty object
            try {
                errorBody = await response.clone().json(); // Clone to read body safely
            } catch (e) {
                console.warn('[SupabaseClient Fetch] Could not parse JSON from 401 response body for', requestUrl);
                // errorBody remains {}
            }
            console.log('[SupabaseClient Fetch] Received 401', { requestUrl, errorBody });

            // Check for typical Supabase JWT error messages
            const bodyAsAny = errorBody as any;
            if (bodyAsAny?.msg?.toLowerCase().includes('invalid jwt') || 
                bodyAsAny?.message?.toLowerCase().includes('jwt') || 
                bodyAsAny?.error_description?.toLowerCase().includes('invalid jwt')) {
              console.warn('[SupabaseClient Fetch] Invalid JWT detected. Throwing specific error.', { requestUrl });
              // Throw a specific error that can be caught by the calling function or auth store logic
              // This helps differentiate from other network or server errors.
              throw new Error('Invalid JWT Detected'); // Specific, catchable error message
            }
            // If it's a 401 but not a JWT error we recognize, it might be other auth logic (e.g. RLS)
            // In this case, we probably should not retry, and just return the response for the client to handle.
            // However, for simplicity now, if it is a 401, we will let it be returned directly after this block
            // unless it's an invalid JWT error which we throw above.
          }

          // If response is not ok (but not a handled 401 JWT error that throws), and we want to retry on 5xx for example:
          // if (!response.ok && response.status >= 500 && attempts < maxAttempts - 1) {
          //   console.warn(`[SupabaseClient Fetch] Server error ${response.status}, will retry...`);
          //   throw new Error(`Server error: ${response.status}`); // Generic error to trigger retry
          // }

          return response; // Return the response if it's ok, or if it's an error that Supabase client should handle (e.g. RLS 401)

        } catch (error: any) {
          attempts++;
          console.warn(`[SupabaseClient Fetch] Attempt ${attempts}/${maxAttempts} FAILED for ${requestUrl}:`, error.message);
          
          // If it's our specific JWT error, re-throw immediately, don't retry.
          if (error.message === 'Invalid JWT Detected') {
            console.error('[SupabaseClient Fetch] Propagating Invalid JWT error for:', requestUrl);
            throw error; 
          }

          if (attempts >= maxAttempts) {
            console.error('[SupabaseClient Fetch] Max attempts reached. Rethrowing last error for:', requestUrl, error);
            throw error; // Rethrow the last error after max attempts
          }
          
          const delay = 1000 * Math.pow(2, attempts - 1); // Exponential backoff
          console.log(`[SupabaseClient Fetch] Waiting ${delay}ms before next attempt for ${requestUrl}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      // This part should ideally not be reached if retries are exhausted and errors are thrown.
      // Adding a fallback throw to satisfy TypeScript and ensure an error is always propagated.
      throw new Error(`Request failed for ${requestUrl} after ${maxAttempts} attempts. Fallback error.`);
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 5, // Adjusted from 1 for potentially more responsive UI
    },
  },
  db: {
    schema: schema,
  },
});

// Set up onAuthStateChange listener separately
supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (!session?.user?.id || !session?.access_token) {
      console.warn('Invalid session detected during auth state change, attempting to sign out.');
      await supabase.auth.signOut();
      return;
    }
  }
  // console.log('Supabase auth event:', event, session); // Optional: for debugging auth flow
});

// Helper to check if an error is an auth error
export const isAuthError = (error: any): boolean => {
  return (
    error instanceof AuthError ||
    (error && typeof error === 'object' && 'status' in error && error.status === 401) ||
    (error?.message &&
      (error.message.toLowerCase().includes('jwt') ||
        error.message.toLowerCase().includes('token') ||
        error.message.toLowerCase().includes('auth')))
  );
};

// Add a simple timeout to any Supabase request
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 10000 // Default timeout 10 seconds
): Promise<T> {
  let timeoutId: number | undefined = undefined; // Use number for React Native's setTimeout return type

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

// Helper function to safely make authenticated requests
export async function withAuth<T>(
  callback: (accessToken: string) => Promise<T>, // Callback now receives token
  fallbackReturnValue: T // Value to return if not authenticated or on error
): Promise<T> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('Error getting session for authenticated request:', sessionError.message);
      return fallbackReturnValue;
    }
    
    if (!session?.user?.id || !session?.access_token) {
      console.warn('No valid session found for authenticated request.');
      return fallbackReturnValue;
    }
    
    // Pass the access token to the callback if needed for direct API calls outside Supabase client
    return await callback(session.access_token);
  } catch (error: any) {
    console.error('Error in withAuth helper:', error.message);
    if (isAuthError(error)) {
      // Optionally, trigger a sign-out or navigation to login
      console.warn('Authentication error in withAuth, session might be invalid.');
    }
    return fallbackReturnValue;
  }
}

// Helper function to handle Supabase errors consistently and provide user-friendly messages
export function handleSupabaseError(error: any, context?: string): string {
  const prefix = context ? `[${context}] ` : '';
  if (isAuthError(error)) {
    // Consider signing out the user if JWT is expired or invalid
    if (error?.message?.includes('JWTExpired')) {
        supabase.auth.signOut().catch(console.error); // Non-blocking sign out
        return `${prefix}Your session has expired. Please sign in again.`;
    }
    return `${prefix}Authentication failed. Please check your credentials or sign in again.`;
  }
  if (error?.message?.includes('Network request failed')) {
    return `${prefix}Network error. Please check your internet connection and try again.`;
  }
  if (error?.message?.includes('timeout')) {
    return `${prefix}The request timed out. Please try again.`;
  }
  if (error?.status === 429) {
    return `${prefix}Too many requests. Please wait a moment and try again.`;
  }
  if (error?.status === 503 || error?.status === 500) {
    return `${prefix}The service is temporarily unavailable or encountered an internal error. Please try again in a moment.`;
  }
  // Generic fallback
  return `${prefix}${error?.message || 'An unexpected error occurred. Please try again.'}`;
}
