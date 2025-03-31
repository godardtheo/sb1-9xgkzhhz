import { AuthError, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Platform } from 'react-native';

/**
 * SessionManager provides centralized session management for Supabase
 * - Handles token refresh
 * - Provides session recovery mechanisms
 */
class SessionManager {
  private refreshTimeoutId: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private lastRefreshAttempt = 0;
  private MIN_REFRESH_INTERVAL = 30000; // 30 seconds minimum between refresh attempts
  
  constructor() {
    // Initialize platform-specific behavior
    this.setupPlatformSpecifics();
  }

  /**
   * Setup any platform specific behavior
   */
  private setupPlatformSpecifics() {
    // Add platform-specific setup if needed in the future
  }

  /**
   * Initialize the session manager
   * Should be called early in the app lifecycle
   */
  initialize() {
    // Setup auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this.scheduleTokenRefresh(session);
      } else if (event === 'SIGNED_OUT') {
        this.clearRefreshTimeout();
      }
    });
    
    // Check current session immediately
    this.checkSession();
  }
  
  /**
   * Check the current session and schedule refresh if needed
   */
  async checkSession() {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        this.scheduleTokenRefresh(data.session);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  }
  
  /**
   * Force a session refresh now
   * @returns Promise that resolves to true if refresh was successful
   */
  async refreshSession(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      return false;
    }
    
    // Enforce minimum time between refresh attempts
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.MIN_REFRESH_INTERVAL) {
      return false;
    }
    
    this.isRefreshing = true;
    this.lastRefreshAttempt = now;
    
    try {
      console.log('Manually refreshing auth session...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error.message);
        return false;
      }
      
      if (data.session) {
        console.log('Session refreshed successfully');
        this.scheduleTokenRefresh(data.session);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Unexpected error during session refresh:', error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }
  
  /**
   * Handle a Supabase error by checking if it's an auth error
   * and refreshing the session if needed
   * @param error The error from a Supabase operation
   * @returns True if this was an auth error and refresh was attempted
   */
  async handleError(error: any): Promise<boolean> {
    // Check if this is an auth error (status 401)
    const isAuthError = 
      (error instanceof AuthError) || 
      (error?.status === 401) ||
      (error?.message?.includes('JWT')) ||
      (error?.message?.includes('token')) ||
      (error?.message?.includes('auth'));
      
    if (isAuthError) {
      console.warn('Auth error detected, attempting refresh:', error.message || error);
      return await this.refreshSession();
    }
    
    return false;
  }
  
  /**
   * Schedule a token refresh before the session expires
   * @param session The current session
   */
  private scheduleTokenRefresh(session: Session | null) {
    // Clear any existing timeout
    this.clearRefreshTimeout();
    
    if (!session) return;
    
    // Calculate time until expiration (in milliseconds)
    const expiresAt = session.expires_at;
    if (!expiresAt) return;
    
    const expiresAtMs = expiresAt * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAtMs - now;
    
    // Schedule refresh for 5 minutes before expiration or immediately if close to expiry
    const refreshDelay = Math.max(0, timeUntilExpiry - 5 * 60 * 1000);
    
    console.log(`Scheduling token refresh in ${Math.floor(refreshDelay / 1000)} seconds`);
    
    this.refreshTimeoutId = setTimeout(async () => {
      await this.refreshSession();
    }, refreshDelay);
  }
  
  /**
   * Clear any scheduled token refresh
   */
  private clearRefreshTimeout() {
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }
  }
  
  /**
   * Clean up resources (should be called when app is shutting down)
   */
  cleanup() {
    this.clearRefreshTimeout();
  }
}

// Create a singleton instance
export const sessionManager = new SessionManager();