import { create } from 'zustand';
import { supabase } from '../supabase';
import { getWeightHistory, logWeight, getLatestWeight } from '../weightUtils';

export interface WeightData {
  date: string;
  weight: number;
  notes?: string;
}

interface WeightStore {
  // State
  weightHistory: WeightData[];
  currentWeight: number | null;
  initialWeight: number | null;
  targetWeight: number | null;
  loading: boolean;
  error: string | null;
  needsRefresh: boolean;
  
  // Actions
  fetchWeightHistory: (days?: number) => Promise<void>;
  fetchWeightStats: () => Promise<void>;
  logNewWeight: (weight: number, notes?: string) => Promise<boolean>;
  setNeedsRefresh: (value: boolean) => void;
}

export const useWeightStore = create<WeightStore>((set, get) => ({
  // Initial state
  weightHistory: [],
  currentWeight: null,
  initialWeight: null,
  targetWeight: null,
  loading: false,
  error: null,
  needsRefresh: false,
  
  // Actions
  fetchWeightHistory: async (days = 30) => {
    try {
      set({ loading: true, error: null });
      const history = await getWeightHistory(days);
      set({ weightHistory: history, loading: false });
    } catch (error) {
      console.error('Error fetching weight history:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch weight history', 
        loading: false 
      });
    }
  },
  
  fetchWeightStats: async () => {
    try {
      set({ loading: true, error: null });
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false });
        return;
      }
      
      // Get initial weight from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('initial_weight')
        .eq('id', user.id)
        .single();
        
      if (userError) {
        console.error('Error fetching user data:', userError);
      }
      
      // Get goal weight from user_goals table
      const { data: goalData, error: goalError } = await supabase
        .from('user_goals')
        .select('weight')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
        
      if (goalError && goalError.code !== 'PGRST116') {
        console.error('Error fetching goal data:', goalError);
      }
      
      // Get latest weight
      const latestWeight = await getLatestWeight();
      
      set({
        initialWeight: userData?.initial_weight || null,
        targetWeight: goalData?.weight || null,
        currentWeight: latestWeight,
        loading: false,
        needsRefresh: false
      });
    } catch (error) {
      console.error('Error fetching weight stats:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch weight statistics', 
        loading: false 
      });
    }
  },
  
  logNewWeight: async (weight, notes = '') => {
    try {
      const success = await logWeight(weight, notes);
      if (success) {
        set({ needsRefresh: true });
        await get().fetchWeightHistory();
        await get().fetchWeightStats();
      }
      return success;
    } catch (error) {
      console.error('Error logging weight:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to log weight', 
      });
      return false;
    }
  },
  
  setNeedsRefresh: (value) => set({ needsRefresh: value })
})); 