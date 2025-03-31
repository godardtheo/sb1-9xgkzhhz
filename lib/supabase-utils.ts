import { supabase, isAuthError } from './supabase';
import { sessionManager } from './session-manager';
import { useAuthStore } from './auth/store';

/**
 * Wrapper for Supabase queries that handles auth errors
 * by attempting to refresh the session
 * 
 * @param queryFn Function that performs the actual Supabase query
 * @param maxRetries Maximum number of retries on auth error
 * @returns Promise with the query result
 */
export async function withAuthRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries = 1
): Promise<T> {
  let retries = 0;
  
  while (true) {
    try {
      return await queryFn();
    } catch (error: any) {
      // Check if this is an auth error
      if (isAuthError(error) && retries < maxRetries) {
        console.log(`Auth error detected, retrying (${retries + 1}/${maxRetries})...`);
        
        // Try to refresh the session
        const refreshed = await sessionManager.refreshSession();
        
        if (refreshed) {
          retries++;
          // Continue to retry the query
          continue;
        }
      }
      
      // Either not an auth error, or we've exhausted retries, or refresh failed
      throw error;
    }
  }
}

/**
 * A higher-order function that adds auth retry logic to any Supabase query builder
 * 
 * @param queryBuilder A function that builds and executes a Supabase query
 * @returns The result of the query with auth retry logic
 */
export function withAuth<T>(
  queryBuilder: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  return withAuthRetry(async () => {
    const result = await queryBuilder();
    
    if (result.error && isAuthError(result.error)) {
      // Handle auth error by refreshing the session and retrying
      await sessionManager.refreshSession();
      
      // This will be caught by withAuthRetry and retried if refresh succeeded
      throw result.error;
    }
    
    return result;
  });
}

/**
 * Helper to check if user is authenticated and session is valid
 * Useful before making sensitive operations
 */
export async function ensureAuthenticated(): Promise<boolean> {
  const { session } = useAuthStore.getState();
  
  if (!session) {
    return false;
  }
  
  // Check if the session is close to expiry
  const expiresAt = session.expires_at;
  if (!expiresAt) return false;
  
  const expiryTime = expiresAt * 1000; // Convert to milliseconds
  const now = Date.now();
  const timeUntilExpiry = expiryTime - now;
  
  // If expiring within 5 minutes, try to refresh
  if (timeUntilExpiry < 5 * 60 * 1000) {
    return await sessionManager.refreshSession();
  }
  
  return true;
}