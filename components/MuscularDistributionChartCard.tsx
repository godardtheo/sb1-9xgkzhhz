import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import PieChartCard, { DataPoint } from './PieChartCard';
import { TimePeriod } from './TimeFilter';
import ChartCard from './ChartCard';

// Define the workout and exercise data interfaces
interface Workout {
  id: string;
  date: string;
}

// Define the structure that matches the actual data returned from Supabase
interface WorkoutExerciseData {
  workout_id: string;
  sets: number;
  exercise: {
    muscle: string;
  };
}

interface MuscleSetCount {
  muscle: string;
  sets: number;
}

// Color generation function - converts HSL to hex
const hslToHex = (h: number, s: number, l: number): string => {
  // Ensure h, s, l are within proper ranges
  h = Math.max(0, Math.min(360, h));
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));
  
  // Convert to 0-1 range
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  // Convert to hex
  const toHex = (v: number): string => {
    const hex = Math.round((v + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Generate colors based on the number of data points
const generateColors = (count: number): string[] => {
  if (count === 0) return [];
  
  // Base teal color in HSL (primary app color #14b8a6 converted to HSL)
  const baseHue = 174; // Teal
  const baseSaturation = 80;
  
  const colors: string[] = [];
  
  // Strategy 1: For fewer muscles, vary lightness within teal color family
  if (count <= 5) {
    // Start with darkest shade
    const lightSteps = 70 / (count || 1);
    
    for (let i = 0; i < count; i++) {
      // Calculate lightness: starts around 25% and gets lighter
      const lightness = 25 + (i * lightSteps);
      
      // Generate color
      colors.push(hslToHex(baseHue, baseSaturation, lightness));
    }
  } 
  // Strategy 2: For more muscles, vary both hue and lightness for more distinction
  else {
    // Use adjacent hues from the teal base (avoid going into fully different colors)
    // This gives us a range of teals, blue-greens, and greens
    const hueRange = 40; // How far to deviate from base hue
    const hueStep = hueRange / (count - 1);
    
    for (let i = 0; i < count; i++) {
      // Calculate hue: vary within a range of teal-adjacent colors
      const hue = baseHue - hueRange/2 + (i * hueStep);
      
      // Calculate lightness: alternate between lighter and darker shades
      // Even indices are darker, odd indices are lighter
      const lightness = i % 2 === 0 ? 
        30 + (i * 3) : // Darker shades with slight progression
        50 + (i * 2);  // Lighter shades with slight progression
      
      // Generate color
      colors.push(hslToHex(hue, baseSaturation, Math.min(lightness, 80)));
    }
    
    // If we have enough colors, ensure first and last have good contrast
    if (count > 3) {
      // First color - always darker teal
      colors[0] = hslToHex(baseHue, baseSaturation, 30);
      
      // Last color - lighter teal-adjacent
      colors[count-1] = hslToHex(baseHue + 15, baseSaturation - 10, 65);
    }
  }
  
  return colors;
};

interface MuscularDistributionChartCardProps {
  period: TimePeriod;
}

export default function MuscularDistributionChartCard({ period }: MuscularDistributionChartCardProps) {
  const [loading, setLoading] = useState(true);
  const [muscleData, setMuscleData] = useState<MuscleSetCount[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch workouts and exercise data from Supabase
  useEffect(() => {
    async function fetchMuscleData() {
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
        
        // Query workouts for the selected period
        let workoutsQuery = supabase
          .from('workouts')
          .select('id, date')
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
          setMuscleData([]);
          return;
        }
        
        // Get all workout IDs to query their exercises
        const workoutIds = workoutsData.map(workout => workout.id);
        
        // Query workout exercises to get muscle and sets information
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('workout_exercises')
          .select(`
            workout_id,
            sets,
            exercise:exercise_id (
              muscle
            )
          `)
          .in('workout_id', workoutIds);
        
        if (exercisesError) {
          throw exercisesError;
        }

        if (!exercisesData || exercisesData.length === 0) {
          setMuscleData([]);
          return;
        }
        
        // Aggregate sets by muscle group
        const muscleSetCounts: Record<string, number> = {};
        
        // Safely cast the data or use type assertion
        (exercisesData as any[]).forEach(exerciseData => {
          // Skip if muscle data is missing
          if (!exerciseData.exercise || !exerciseData.exercise.muscle) return;
          
          const muscle = exerciseData.exercise.muscle.toLowerCase();
          const sets = exerciseData.sets || 0;
          
          // Increment the count for this muscle
          muscleSetCounts[muscle] = (muscleSetCounts[muscle] || 0) + sets;
        });
        
        // Convert aggregated data to array format
        const muscleDataArray: MuscleSetCount[] = Object.entries(muscleSetCounts)
          .map(([muscle, sets]) => ({
            muscle,
            sets
          }))
          .sort((a, b) => b.sets - a.sets); // Sort by set count (descending)
        
        setMuscleData(muscleDataArray);
      } catch (err: any) {
        console.error('Error fetching muscle distribution data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMuscleData();
  }, [period]);

  // Generate colors for the pie chart based on number of muscle groups
  const muscleColors = useMemo(() => {
    return generateColors(muscleData.length);
  }, [muscleData.length]);

  // Transform data for the pie chart
  const chartData: DataPoint[] = useMemo(() => {
    return muscleData.map((item, index) => ({
      name: item.muscle.charAt(0).toUpperCase() + item.muscle.slice(1), // Capitalize first letter
      value: item.sets,
      color: muscleColors[index],
    }));
  }, [muscleData, muscleColors]);

  // Calculate metrics for display
  const mostTrainedMuscle = useMemo(() => {
    if (muscleData.length === 0) return 'None';
    
    // Get the muscle with the most sets (already sorted)
    const topMuscle = muscleData[0].muscle;
    return topMuscle.charAt(0).toUpperCase() + topMuscle.slice(1); // Capitalize first letter
  }, [muscleData]);

  const leastTrainedMuscle = useMemo(() => {
    if (muscleData.length === 0) return 'None';
    
    // Get the muscle with the least sets (last in sorted array)
    const bottomMuscle = muscleData[muscleData.length - 1].muscle;
    return bottomMuscle.charAt(0).toUpperCase() + bottomMuscle.slice(1); // Capitalize first letter
  }, [muscleData]);

  // Total number of sets across all muscles
  const totalSets = useMemo(() => {
    return muscleData.reduce((sum, muscle) => sum + muscle.sets, 0);
  }, [muscleData]);

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
        <Text style={{ color: 'red' }}>Error loading muscle data: {error}</Text>
      </View>
    );
  }

  // Handle empty state with a friendly message
  if (muscleData.length === 0) {
    return (
      <ChartCard
        title="Muscular Distribution"
        metrics={[
          { label: 'Most trained', value: 'None' },
          { label: 'Least trained', value: 'None' },
        ]}
      >
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            No muscle data available for this period. Complete some workouts to see your muscular distribution!
          </Text>
        </View>
      </ChartCard>
    );
  }

  return (
    <PieChartCard
      title="Muscular Distribution"
      metrics={[
        { label: 'Most trained', value: mostTrainedMuscle },
        { label: 'Least trained', value: leastTrainedMuscle },
      ]}
      data={chartData}
    />
  );
}

const styles = StyleSheet.create({
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  emptyStateText: {
    color: '#5eead4',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
  },
}); 