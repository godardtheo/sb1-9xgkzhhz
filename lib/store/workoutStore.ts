import { create } from 'zustand';
import { supabase } from '../supabase';

interface WorkoutStore {
  needsRefresh: boolean;
  setNeedsRefresh: (value: boolean) => void;
  workouts: any[];
  loading: boolean;
  error: string | null;
  fetchWorkouts: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  needsRefresh: false,
  setNeedsRefresh: (value) => set({ needsRefresh: value }),
  workouts: [],
  loading: false,
  error: null,
  fetchWorkouts: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          id,
          name,
          description,
          muscles,
          estimated_duration,
          template_exercises!inner (
            id,
            sets,
            exercise_id,
            exercises:exercise_id (
              id,
              name,
              muscle_primary,
              muscle_secondary
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedWorkouts = data?.map(workout => {
        // Extract unique primary muscles from all exercises in the workout
        const primaryMuscles = workout.template_exercises
          .filter(ex => ex.exercises && ex.exercises.muscle_primary)
          .flatMap(ex => ex.exercises.muscle_primary || [])
          .filter(Boolean);
        
        // Get unique muscles only
        const uniquePrimaryMuscles = [...new Set(primaryMuscles)];
        
        return {
          ...workout,
          // Override the muscles array with primary muscles from exercises
          muscles: uniquePrimaryMuscles.length > 0 ? uniquePrimaryMuscles : workout.muscles || [],
          exercise_count: workout.template_exercises.length,
          set_count: workout.template_exercises.reduce((total: number, ex: any) => total + (ex.sets || 0), 0)
        };
      }) || [];

      set({ workouts: formattedWorkouts, needsRefresh: false });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
}));