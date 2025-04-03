import { supabase } from '@/lib/supabase';
import { startOfWeek, endOfWeek, isWithinInterval, format, parseISO } from 'date-fns';

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

/**
 * Gets workout calendar data for a specific month
 */
export async function getMonthlyWorkoutCalendarData(monthDate: Date) {
  try {
    const logs = await getMonthWorkoutLogs(monthDate);
    
    // Map the logs to dates
    const markedDates: Record<string, { marked: boolean, selectedColor: string, selected?: boolean, dotColor?: string }> = {};
    
    logs.forEach(log => {
      const date = new Date(log.date);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Store the workout ID with the date to enable navigation
      markedDates[dateString] = {
        marked: true,
        selectedColor: '#14b8a6',
        dotColor: '#14b8a6'
      };
    });
    
    // Add today's date with a different style
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // If today already has a workout, merge the styles
    if (markedDates[todayString]) {
      markedDates[todayString] = {
        ...markedDates[todayString],
        selected: true,
      };
    } else {
      markedDates[todayString] = {
        marked: true,
        selected: true,
        selectedColor: '#0d3d56',
      };
    }
    
    return markedDates;
  } catch (error) {
    console.error('Error in getMonthlyWorkoutCalendarData:', error);
    return {};
  }
}

/**
 * Gets complete workout history with workout details
 */
export async function getWorkoutHistory(limit = 20) {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get all workouts performed by the user, ordered by date
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select(`
        id, 
        name, 
        date, 
        duration,
        workout_exercises (
          id,
          exercise_id
        )
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching workout history:', error);
      return [];
    }

    // Process the workouts to get additional data
    const processedWorkouts = [];
    
    if (workouts) {
      for (const workout of workouts) {
        try {
          const exercises = workout.workout_exercises || [];
          const exerciseCount = exercises.length;
          
          // Get all exercise IDs for this workout
          const exerciseIds = exercises.map((ex: any) => ex.id);
          
          // Get set count if there are exercises
          let setCount = 0;
          if (exerciseIds.length > 0) {
            try {
              // Get count of sets for these exercises
              const { count, error: setsError } = await supabase
                .from('sets')
                .select('*', { count: 'exact', head: true })
                .in('workout_exercise_id', exerciseIds);
                
              if (!setsError && count !== null) {
                setCount = count;
              } else if (setsError) {
                console.error('Error counting sets:', setsError);
              }
            } catch (countError) {
              console.error('Error in set counting:', countError);
            }
          }
          
          // Get muscles data through a separate query
          const muscles: string[] = [];
          
          processedWorkouts.push({
            id: workout.id,
            name: workout.name,
            date: workout.date,
            formattedDate: format(new Date(workout.date), 'MMM d, yyyy'),
            duration: workout.duration,
            exerciseCount,
            setCount,
            muscles
          });
        } catch (processError) {
          console.error('Error processing workout:', processError);
        }
      }
    }

    return processedWorkouts;
  } catch (error) {
    console.error('Error in getWorkoutHistory:', error);
    return [];
  }
}

/**
 * Gets a workout by date
 */
export async function getWorkoutByDate(date: string) {
  try {
    console.log(`Searching for workout on date: ${date}`);
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Format the date strings for comparison (YYYY-MM-DD)
    const searchDateStart = new Date(date);
    searchDateStart.setHours(0, 0, 0, 0);
    
    const searchDateEnd = new Date(date);
    searchDateEnd.setHours(23, 59, 59, 999);
    
    console.log(`Searching for workouts between ${searchDateStart.toISOString()} and ${searchDateEnd.toISOString()}`);

    // Get workouts for that date range
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('id, date')
      .eq('user_id', user.id)
      .gte('date', searchDateStart.toISOString())
      .lte('date', searchDateEnd.toISOString())
      .order('date', { ascending: false }); // Get the latest workout first

    if (error) {
      console.error('Error fetching workout by date:', error);
      return null;
    }

    if (!workouts || workouts.length === 0) {
      console.log('No workout found for date:', date);
      return null;
    }

    // Return the latest workout if multiple were found
    console.log(`Found ${workouts.length} workout(s) for date ${date}, using latest:`, workouts[0]);
    return workouts[0].id;
  } catch (error) {
    console.error('Error in getWorkoutByDate:', error);
    return null;
  }
}