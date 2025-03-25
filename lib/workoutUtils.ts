import { supabase } from '@/lib/supabase';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

/**
 * Determines the next workout in the active program based on program order and 
 * which workouts have already been completed this week
 */
export async function getNextWorkout(): Promise<{
  programName: string;
  nextWorkout: { id: string; name: string; template_id: string } | null;
} | null> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get the user's active program
    const { data: activeProgram, error: programError } = await supabase
      .from('programs')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (programError || !activeProgram) {
      console.log('No active program found:', programError?.message);
      return null;
    }

    // Get all workouts in the active program ordered by their order field
    const { data: programWorkouts, error: workoutsError } = await supabase
      .from('program_workouts')
      .select('id, name, template_id, order')
      .eq('program_id', activeProgram.id)
      .order('order');

    if (workoutsError || !programWorkouts || programWorkouts.length === 0) {
      console.log('No workouts found in program:', workoutsError?.message);
      return null;
    }

    // Calculate the current week's start and end dates
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday as week start
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Get the workouts completed this week
    const { data: completedWorkouts, error: logsError } = await supabase
      .from('workouts')
      .select('name, date')
      .eq('user_id', user.id)
      .gte('date', weekStart.toISOString())
      .lte('date', weekEnd.toISOString());

    if (logsError) {
      console.log('Error fetching workouts:', logsError.message);
      return null;
    }

    // Create a set of completed workout names (assuming unique names within a program)
    const completedWorkoutNames = new Set(
      completedWorkouts?.map(workout => workout.name) || []
    );

    // Find the first workout in the program that hasn't been completed this week
    const nextWorkout = programWorkouts.find(
      workout => !completedWorkoutNames.has(workout.name)
    );

    // If all workouts are completed this week, suggest the first workout again
    const suggestedWorkout = nextWorkout || programWorkouts[0];

    return {
      programName: activeProgram.name,
      nextWorkout: suggestedWorkout ? {
        id: suggestedWorkout.id,
        name: suggestedWorkout.name,
        template_id: suggestedWorkout.template_id
      } : null
    };
  } catch (error) {
    console.error('Error in getNextWorkout:', error);
    return null;
  }
}

/**
 * Gets the workout logs for the current week for a user
 */
export async function getWeeklyWorkoutLogs() {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Calculate the current week's start and end dates
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday as week start
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Get all workouts for the current week
    const { data: workoutLogs, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', weekStart.toISOString())
      .lte('date', weekEnd.toISOString())
      .order('date');

    if (error) {
      console.error('Error fetching workout logs:', error);
      return [];
    }

    return workoutLogs || [];
  } catch (error) {
    console.error('Error in getWeeklyWorkoutLogs:', error);
    return [];
  }
}

/**
 * Gets workouts for a specific month range
 */
export async function getMonthWorkoutLogs(monthDate: Date) {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Calculate the month's start and end dates
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    // Get all workouts for the month
    const { data: workoutLogs, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date');

    if (error) {
      console.error('Error fetching workout logs:', error);
      return [];
    }

    return workoutLogs || [];
  } catch (error) {
    console.error('Error in getMonthWorkoutLogs:', error);
    return [];
  }
}

/**
 * Gets a mapping of dates to workout completion status
 */
export async function getWorkoutCalendarData() {
  try {
    const logs = await getMonthWorkoutLogs(new Date());
    
    // Map the logs to dates
    const markedDates: Record<string, { marked: boolean, dotColor: string }> = {};
    
    logs.forEach(log => {
      const date = new Date(log.date);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      markedDates[dateString] = {
        marked: true,
        dotColor: '#14b8a6' // Teal color from your design system
      };
    });
    
    return markedDates;
  } catch (error) {
    console.error('Error in getWorkoutCalendarData:', error);
    return {};
  }
}