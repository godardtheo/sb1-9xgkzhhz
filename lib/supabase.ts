import 'react-native-url-polyfill/auto';
import { createClient, AuthError } from '@supabase/supabase-js';
import { storageAdapter } from './storage-adapter';

// Initialize Supabase with custom storage adapter
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper to check if an error is an auth error
export const isAuthError = (error: any): boolean => {
  return (
    error instanceof AuthError ||
    error?.status === 401 ||
    (error?.message &&
      (error.message.includes('JWT') ||
        error.message.includes('token') ||
        error.message.includes('auth')))
  );
};

// Add a simple timeout to any Supabase request
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout = 10000
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Request timed out'));
    }, timeout);
  });

  try {
    // Race the original promise against a timeout
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}
