import { supabase, isAuthError, withTimeout } from './supabase';
import { useAuthStore } from './auth/store';

/**
 * A utility function to wrap any Supabase query with authentication
 * error handling and refresh logic
 *
 * @param queryFn Function that performs the Supabase query
 * @returns Result of the query, with handled auth errors
 */
export async function withAuthHandling<T>(
  queryFn: () => Promise<T>
): Promise<T> {
  try {
    // First attempt the query
    return await queryFn();
  } catch (error) {
    // If this is an auth error, try refreshing the session
    if (isAuthError(error)) {
      const refreshed = await useAuthStore.getState().refreshSession();

      if (refreshed) {
        // If refresh succeeded, retry the query
        try {
          return await queryFn();
        } catch (retryError) {
          // If retry also fails, throw the original error
          console.error('Query failed after session refresh:', retryError);
          throw error;
        }
      }
    }

    // Not an auth error or refresh failed
    throw error;
  }
}

/**
 * Helper function for common data fetching patterns
 * Handles auth errors and timeouts
 */
export async function fetchData<T>(
  tableName: string,
  queryModifier?: (query: any) => any,
  options = { timeout: 10000 }
): Promise<T[]> {
  return withAuthHandling(async () => {
    // Build the query
    let query = supabase.from(tableName).select('*');

    // Apply any modifiers
    if (queryModifier) {
      query = queryModifier(query);
    }

    // Execute with timeout
    const { data, error } = await withTimeout(query, options.timeout);

    if (error) throw error;
    return data as T[];
  });
}

/**
 * Simplified auth checking function that returns true if there's
 * a valid session, false otherwise
 */
export function isAuthenticated(): boolean {
  const { session } = useAuthStore.getState();
  return !!session;
}
