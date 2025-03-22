import { create } from 'zustand';
import { supabase } from '../supabase';

interface ProgramStore {
  needsRefresh: boolean;
  setNeedsRefresh: (value: boolean) => void;
  programs: any[];
  loading: boolean;
  error: string | null;
  fetchPrograms: () => Promise<void>;
  getActiveProgram: () => Promise<{ id: string; name: string } | null>;
  updateProgramActiveState: (programId: string, isActive: boolean, previousProgramId?: string) => Promise<boolean>;
}

export const useProgramStore = create<ProgramStore>((set, get) => ({
  needsRefresh: false,
  setNeedsRefresh: (value) => set({ needsRefresh: value }),
  programs: [],
  loading: false,
  error: null,
  fetchPrograms: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          description,
          weekly_workouts,
          is_active,
          created_at,
          updated_at,
          program_workouts(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPrograms = data?.map(program => ({
        ...program,
        workout_count: program.program_workouts[0].count
      })) || [];

      set({ programs: formattedPrograms, needsRefresh: false });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  getActiveProgram: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get all active programs and order by most recently updated
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      // Return the most recently updated active program, or null if none exists
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching active program:', error);
      return null;
    }
  },
  updateProgramActiveState: async (programId: string, isActive: boolean, previousProgramId?: string) => {
    try {
      // Start a batch of updates
      if (isActive && previousProgramId) {
        // Deactivate previous program
        const { error: deactivateError } = await supabase
          .from('programs')
          .update({ is_active: false })
          .eq('id', previousProgramId);

        if (deactivateError) throw deactivateError;
      }

      // Update new program state
      const { error: updateError } = await supabase
        .from('programs')
        .update({ is_active: isActive })
        .eq('id', programId);

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      console.error('Error updating program active state:', error);
      return false;
    }
  },
}));