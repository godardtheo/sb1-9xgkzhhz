import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Simple in-memory storage implementation
const memoryStorage = {
  data: new Map<string, string>(),
  getItem: async (key: string): Promise<string | null> => {
    return memoryStorage.data.get(key) || null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memoryStorage.data.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    memoryStorage.data.delete(key);
  }
};

// Determine storage based on platform
const getStorage = () => {
  if (Platform.OS === 'web') {
    // Use localStorage for web
    return {
      getItem: (key: string) => {
        try {
          const item = localStorage.getItem(key);
          return Promise.resolve(item);
        } catch (error) {
          return Promise.resolve(null);
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
          return Promise.resolve();
        } catch (error) {
          return Promise.resolve();
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
          return Promise.resolve();
        } catch (error) {
          return Promise.resolve();
        }
      }
    };
  }
  
  // Use our simple memory storage implementation for non-web platforms
  return memoryStorage;
};

// Handle environment variables properly with fallbacks
// These are the actual hardcoded values for development
const FALLBACK_URL = 'https://rokicoqziukzgvhpoclk.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJva2ljb3F6aXVremd2aHBvY2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTE0NTIxNDcsImV4cCI6MjAyNzAyODE0N30.2WExxcUCd1VHx6VGdG2fJP4MdJl3iL4XXkTTGl3VZUo';

// Try to get from env variables, fallback to hardcoded values if not available
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_URL).trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY).trim();

console.log('Supabase URL being used:', supabaseUrl);
console.log('API Key length:', supabaseAnonKey.length, 'characters');

// Configure custom fetch to handle CORS issues
const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
  // Add headers that might help with CORS
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // Explicitly add apikey header
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    // Log errors for debugging
    if (!response.ok) {
      console.error(`Supabase request failed: ${response.status} ${response.statusText}`);
      try {
        const errorData = await response.json();
        console.error('Error details:', errorData);
      } catch (e) {
        // If we can't parse the error as JSON, just log the raw text
        console.error('Error response:', await response.text());
      }
    }
    
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

// Create the Supabase client with proper configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  global: {
    fetch: customFetch as any,
    headers: {
      // Add the apikey to all requests
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  },
});

// Helper function to handle common API errors
export const handleApiError = (error: any): string => {
  console.error('API Error:', error);
  
  // Check if it's a CORS error
  if (error.message && error.message.includes('CORS')) {
    return 'Cross-origin request blocked. Please check your CORS configuration.';
  }
  
  // Check for network errors
  if (error.message && (error.message.includes('Network') || error.message.includes('fetch'))) {
    return 'Network error. Please check your connection.';
  }
  
  // Check for authentication errors
  if (error.status === 401 || (error.code && error.code === 'PGRST301')) {
    return 'Authentication error. Please sign in again.';
  }

  // Check for missing API key errors
  if (error.message && error.message.includes('No API key')) {
    return 'API key missing. Check your Supabase configuration.';
  }

  // Check for invalid refresh token
  if (error.message && error.message.includes('Invalid Refresh Token')) {
    return 'Your session has expired. Please sign in again.';
  }

  // Get the Supabase error message if available
  if (error.message) {
    return error.message;
  }
  
  return 'An unknown error occurred';
};