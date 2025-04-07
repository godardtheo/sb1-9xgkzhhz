import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import BarChartCard, { BarChartDataPoint } from './BarChartCard';
import { TimePeriod } from './TimeFilter';

// Define the workout and workout_exercises data interfaces
interface Workout {
  id: string;
  user_id: string;
  date: string;
  name: string;
}

interface WorkoutExercise {
  id: string;
  workout_id: string;
  sets: number;
}

// Data structure for workouts with set counts
interface WorkoutWithSets {
  id: string;
  date: string;
  totalSets: number;
}

interface SetsChartCardProps {
  period: TimePeriod;
}

export default function SetsChartCard({ period }: SetsChartCardProps) {
  const [loading, setLoading] = useState(true);
  const [workoutsWithSets, setWorkoutsWithSets] = useState<WorkoutWithSets[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch workouts and their sets from Supabase
  useEffect(() => {
    async function fetchWorkoutsAndSets() {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Calculate date range based on selected period
        const now = new Date();
        let startDate = new Date();
        
        switch(period) {
          case '7D':
            startDate.setDate(now.getDate() - 7);
            break;
          case '14D':
            startDate.setDate(now.getDate() - 14);
            break;
          case '1M':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case '12M':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          case 'ALL':
            // No date filter for all time
            startDate = new Date(0); // Jan 1, 1970
            break;
        }
        
        // Format dates for query
        const startDateStr = startDate.toISOString();
        const endDateStr = now.toISOString();
        
        // Query workouts
        let workoutsQuery = supabase
          .from('workouts')
          .select('id, user_id, date, name')
          .eq('user_id', user.id)
          .order('date', { ascending: true });
        
        // Add date range filter except for ALL
        if (period !== 'ALL') {
          workoutsQuery = workoutsQuery.gte('date', startDateStr).lte('date', endDateStr);
        }
        
        const { data: workoutsData, error: workoutsError } = await workoutsQuery;
        
        if (workoutsError) {
          throw workoutsError;
        }
        
        if (!workoutsData || workoutsData.length === 0) {
          setWorkoutsWithSets([]);
          return;
        }
        
        // Get all workout IDs to query their exercises
        const workoutIds = workoutsData.map(workout => workout.id);
        
        // Query workout exercises to get sets information
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('workout_exercises')
          .select('workout_id, sets')
          .in('workout_id', workoutIds);
        
        if (exercisesError) {
          throw exercisesError;
        }
        
        // Calculate total sets per workout
        const workoutsWithSetCounts: WorkoutWithSets[] = workoutsData.map(workout => {
          // Filter exercises for this workout
          const workoutExercises = exercisesData?.filter(ex => ex.workout_id === workout.id) || [];
          
          // Sum up the sets
          const totalSets = workoutExercises.reduce((sum, exercise) => {
            return sum + (exercise.sets || 0);
          }, 0);
          
          return {
            id: workout.id,
            date: workout.date,
            totalSets: totalSets
          };
        });
        
        console.log("Workouts with sets:", workoutsWithSetCounts);
        
        setWorkoutsWithSets(workoutsWithSetCounts);
      } catch (err: any) {
        console.error('Error fetching workouts and sets:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchWorkoutsAndSets();
  }, [period]);

  // Transform data for the bar chart
  const chartData: BarChartDataPoint[] = workoutsWithSets.map(workout => ({
    date: workout.date,
    value: workout.totalSets,
  }));

  // Calculate metrics for display
  const totalWorkouts = workoutsWithSets.length;
  
  const totalSets = workoutsWithSets.reduce((sum, workout) => {
    return sum + workout.totalSets;
  }, 0);
  
  const averageSetsPerWorkout = totalWorkouts > 0 
    ? Math.round((totalSets / totalWorkouts) * 10) / 10 // Round to 1 decimal place
    : 0;

  // Find the maximum number of sets to determine Y-axis scale
  const maxSets = Math.max(...workoutsWithSets.map(workout => workout.totalSets), 1);

  // Determine the appropriate multiple for Y-axis based on the maximum value
  let yAxisMultiple = 5; // Default to multiples of 5
  
  if (maxSets <= 10) {
    yAxisMultiple = 2; // Use multiples of 2 for small scales (0-10)
  } else if (maxSets <= 20) {
    yAxisMultiple = 5; // Use multiples of 5 for medium scales (10-20)
  } else if (maxSets <= 50) {
    yAxisMultiple = 10; // Use multiples of 10 for larger scales (20-50)
  } else {
    yAxisMultiple = 20; // Use multiples of 20 for very large scales (50+)
  }
  
  // Calculate the appropriate number of segments based on actual data range
  const yAxisMax = Math.ceil(maxSets / yAxisMultiple) * yAxisMultiple;
  // Calculate minimum required segments (allow as few as 1 if that's all the data needs)
  const requiredSegments = Math.max(Math.ceil(yAxisMax / yAxisMultiple), 1);
  // Cap at 8 segments maximum for readability
  const segments = Math.min(requiredSegments, 8);

  // Create Y-axis formatter function to ensure values are exact multiples
  const formatYAxis = (value: string) => {
    // Parse the value to a number
    const numValue = parseInt(value, 10);
    
    // Force the value to be a multiple of our interval
    // We don't round here because the chart library already interpolates values
    // Instead, we snap to the nearest lower multiple to ensure consistency
    const snappedValue = Math.floor(numValue / yAxisMultiple) * yAxisMultiple;
    
    return snappedValue.toString();
  };

  // Prepare the metrics display for the card
  const metrics = [
    { label: 'Total sets', value: totalSets.toString() },
    { label: 'Average sets/workout', value: averageSetsPerWorkout.toString() },
  ];

  if (loading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: 'red' }}>Error loading set data: {error}</Text>
      </View>
    );
  }

  // Handle empty state with a friendly message
  if (workoutsWithSets.length === 0) {
    return (
      <BarChartCard
        title="Sets"
        data={[]}
        period={period}
        metrics={[
          { label: 'Total sets', value: '0' },
          { label: 'Average sets/workout', value: '0' },
        ]}
        yAxisLabel=""
        yAxisSuffix=""
        color="#14b8a6" // Changed to match WorkoutsDurationChartCard
        emptyStateMessage="No sets data available for this period. Complete some workout sets to see statistics!"
      />
    );
  }

  return (
    <BarChartCard
      title="Sets"
      data={chartData}
      period={period}
      metrics={metrics}
      yAxisLabel=""
      yAxisSuffix=""
      color="#14b8a6" // Changed to match WorkoutsDurationChartCard
      yAxisLabelXOffset={32}
      formatYLabel={formatYAxis}
      segments={segments}
      tooltipValueSuffix="sets"
    />
  );
} 