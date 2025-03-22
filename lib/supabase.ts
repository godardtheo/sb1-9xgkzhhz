import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { storageAdapter } from './storage-adapter';

// Initialize Supabase with custom storage adapter that works in both browser and server environments
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