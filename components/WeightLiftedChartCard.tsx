import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import BarChartCard, { BarChartDataPoint } from './BarChartCard';
import { TimePeriod } from './TimeFilter';

// Define the workout with weight data interface
interface WorkoutWithWeight {
  id: string;
  date: string;
  totalWeightLifted: number;
}

interface WeightLiftedChartCardProps {
  period: TimePeriod;
}

// Custom component for metric values with smaller unit text
function MetricValueWithUnit({ value, unit }: { value: number, unit: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={styles.valueText}>{value}</Text>
      <Text style={styles.unitText}>{unit}</Text>
    </View>
  );
}

export default function WeightLiftedChartCard({ period }: WeightLiftedChartCardProps) {
  const [loading, setLoading] = useState(true);
  const [workoutsWithWeight, setWorkoutsWithWeight] = useState<WorkoutWithWeight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [weightUnit, setWeightUnit] = useState('kg'); // Default to kg

  // Fetch user's weight unit and workouts data from Supabase
  useEffect(() => {
    async function fetchUserDataAndWorkouts() {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Fetch user's weight unit preference
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('weight_unit')
          .eq('id', user.id)
          .single();

        if (userError) {
          if (process.env.EXPO_PUBLIC_ENV !== 'production') {
            console.error('Error fetching user weight unit:', userError);
          }
          // Continue with default kg if there's an error
        } else if (userData) {
          setWeightUnit(userData.weight_unit || 'kg');
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
        
        // Query workouts - now including the total_weight_lifted field
        let workoutsQuery = supabase
          .from('workouts')
          .select('id, user_id, date, total_weight_lifted')
          .eq('user_id', user.id)
          .order('date', { ascending: true });
        
        // Add date range filter except for ALL
        if (period !== 'ALL') {
          workoutsQuery = workoutsQuery.gte('date', startDateStr).lte('date', endDateStr);
        }
        
        const { data: workoutsData, error: workoutsError } = await workoutsQuery;
        
        if (workoutsError) {
          if (process.env.EXPO_PUBLIC_ENV !== 'production') {
            console.error('Error fetching workouts and weight lifted:', workoutsError);
          }
          throw workoutsError;
        }
        
        if (!workoutsData || workoutsData.length === 0) {
          setWorkoutsWithWeight([]);
          return;
        }
        
        // Map workouts with their weight lifted data
        const workoutsWithWeightData: WorkoutWithWeight[] = workoutsData.map(workout => {
          return {
            id: workout.id,
            date: workout.date,
            totalWeightLifted: workout.total_weight_lifted || 0
          };
        });
        
        setWorkoutsWithWeight(workoutsWithWeightData);
      } catch (err: any) {
        if (process.env.EXPO_PUBLIC_ENV !== 'production') {
          console.error('Error fetching workouts and weight lifted:', err);
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserDataAndWorkouts();
  }, [period]);

  // Transform data for the bar chart
  const chartData: BarChartDataPoint[] = workoutsWithWeight.map(workout => ({
    date: workout.date,
    value: workout.totalWeightLifted,
  }));

  // Calculate metrics for display
  const totalWorkouts = workoutsWithWeight.length;
  
  const totalWeightLifted = workoutsWithWeight.reduce((sum, workout) => {
    return sum + workout.totalWeightLifted;
  }, 0);
  
  const averageWeightPerWorkout = totalWorkouts > 0 
    ? Math.round((totalWeightLifted / totalWorkouts) * 10) / 10 // Round to 1 decimal place
    : 0;

  // Find the maximum weight to determine Y-axis scale
  const maxWeight = Math.max(...workoutsWithWeight.map(workout => workout.totalWeightLifted), 1);

  // Determine the appropriate multiple for Y-axis based on the maximum value
  let yAxisMultiple = 100; // Default to multiples of 100
  
  if (maxWeight <= 100) {
    yAxisMultiple = 20; // Use multiples of 20 for small scales (0-100)
  } else if (maxWeight <= 500) {
    yAxisMultiple = 50; // Use multiples of 50 for medium scales (100-500)
  } else if (maxWeight <= 2000) {
    yAxisMultiple = 200; // Use multiples of 200 for larger scales (500-2000)
  } else {
    yAxisMultiple = 500; // Use multiples of 500 for very large scales (2000+)
  }
  
  // Calculate the appropriate number of segments based on actual data range
  const yAxisMax = Math.ceil(maxWeight / yAxisMultiple) * yAxisMultiple;
  // Calculate minimum required segments (allow as few as 1 if that's all the data needs)
  const requiredSegments = Math.max(Math.ceil(yAxisMax / yAxisMultiple), 1);
  // Cap at 8 segments maximum for readability
  const segments = Math.min(requiredSegments, 8);

  // Create Y-axis formatter function to format values as k for thousands and M for millions
  const formatYAxis = (value: string) => {
    // Parse the value to a number
    const numValue = parseInt(value, 10);
    
    // Force the value to be a multiple of our interval
    const snappedValue = Math.floor(numValue / yAxisMultiple) * yAxisMultiple;
    
    // Format large numbers (thousands and millions)
    if (snappedValue >= 1000000) {
      return (snappedValue / 1000000).toLocaleString(undefined, { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 1 
      }) + 'M';
    }
    
    if (snappedValue >= 1000) {
      return (snappedValue / 1000).toLocaleString(undefined, { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 1 
      }) + 'k';
    }
    
    return snappedValue.toString();
  };

  // Format the total weight for display
  const formatTotalWeight = (weight: number) => {
    if (weight >= 1000000) {
      return (weight / 1000000).toLocaleString(undefined, { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 1 
      }) + 'M';
    }
    
    if (weight >= 1000) {
      return (weight / 1000).toLocaleString(undefined, { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 1 
      }) + 'k';
    }
    
    return Math.round(weight).toString();
  };

  // Prepare the metrics display for the card with JSX values for custom styling
  const metrics = [
    { 
      label: 'Total weight lifted', 
      value: <MetricValueWithUnit value={Math.round(totalWeightLifted)} unit={weightUnit} />
    },
    { 
      label: 'Average/workout', 
      value: <MetricValueWithUnit value={Math.round(averageWeightPerWorkout)} unit={weightUnit} />
    },
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
        <Text style={{ color: 'red' }}>Error loading weight data: {error}</Text>
      </View>
    );
  }

  // Handle empty state with a friendly message
  if (workoutsWithWeight.length === 0) {
    return (
      <BarChartCard
        title={`Weight Lifted (${weightUnit})`}
        data={[]}
        period={period}
        metrics={[
          { 
            label: 'Total weight lifted', 
            value: <MetricValueWithUnit value={0} unit={weightUnit} />
          },
          { 
            label: 'Average/workout', 
            value: <MetricValueWithUnit value={0} unit={weightUnit} />
          },
        ]}
        yAxisLabel=""
        yAxisSuffix=""
        color="#14b8a6" // Changed to match WorkoutsDurationChartCard
        emptyStateMessage="No weight data available for this period. Complete some workouts with weights to see statistics!"
      />
    );
  }

  return (
    <BarChartCard
      title={`Weight Lifted (${weightUnit})`}
      data={chartData}
      period={period}
      metrics={metrics}
      yAxisLabel=""
      yAxisSuffix=""
      color="#14b8a6" // Changed to match WorkoutsDurationChartCard
      yAxisLabelXOffset={32}
      formatYLabel={formatYAxis}
      segments={segments}
      tooltipValueSuffix={weightUnit}
    />
  );
}

const styles = StyleSheet.create({
  valueText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
  },
  unitText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ccfbf1',
    marginLeft: 2,
  }
}); 