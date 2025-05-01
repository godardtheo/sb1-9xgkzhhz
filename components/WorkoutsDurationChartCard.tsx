import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import BarChartCard, { BarChartDataPoint } from './BarChartCard';
import { TimePeriod } from './TimeFilter';

// Define the workout data interface that matches our database
interface Workout {
  id: string;
  user_id: string;
  date: string;
  duration: string | number | null; // Could be stored in different formats
  name: string;
}

// Function to convert various duration formats to minutes
const durationToMinutes = (duration: string | number | null): number => {
  if (duration === null || duration === undefined) return 0;
  
  // If it's already a number
  if (typeof duration === 'number') {
    // Check if it might be seconds (larger than typical minutes value)
    if (duration > 500) { // Assuming workouts over 500 minutes are unlikely
      return Math.round(duration / 60); // Convert seconds to minutes
    }
    return duration; // Already in minutes
  }
  
  // Parse string formats
  if (typeof duration === 'string') {
    // Debug the actual format we're receiving
    console.log("Duration value from DB:", duration);
    
    // Handle PostgreSQL interval format (e.g. "01:30:00" for 1h30m)
    if (duration.includes(':')) {
      const parts = duration.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        return hours * 60 + minutes;
      }
    }
    
    // Parse ISO 8601 duration format (e.g. PT1H30M)
    if (duration.startsWith('PT')) {
      const hourMatch = duration.match(/(\d+)H/);
      const minuteMatch = duration.match(/(\d+)M/);
      
      const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
      const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
      
      return hours * 60 + minutes;
    }
    
    // Parse formats like "1 hour 30 minutes" or "90 minutes"
    const hourMatch = duration.match(/(\d+)\s*hour/i);
    const minuteMatch = duration.match(/(\d+)\s*minute/i);
    
    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
    
    if (hours > 0 || minutes > 0) {
      return hours * 60 + minutes;
    }
    
    // Try parsing as a simple number
    const numericValue = parseFloat(duration);
    if (!isNaN(numericValue)) {
      // If the value is large, assume it's in seconds
      if (numericValue > 500) {
        return Math.round(numericValue / 60); // Convert seconds to minutes
      }
      return numericValue;
    }
  }
  
  return 0;
};

interface WorkoutsDurationChartCardProps {
  period: TimePeriod;
}

export default function WorkoutsDurationChartCard({ period }: WorkoutsDurationChartCardProps) {
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch workouts from Supabase
  useEffect(() => {
    async function fetchWorkouts() {
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
        let query = supabase
          .from('workouts')
          .select('id, user_id, date, duration, name')
          .eq('user_id', user.id)
          .order('date', { ascending: true });
        
        // Add date range filter except for ALL
        if (period !== 'ALL') {
          query = query.gte('date', startDateStr).lte('date', endDateStr);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        // Debug the actual data received
        console.log("Raw workouts data:", data);
        if (data && data.length > 0) {
          console.log("First workout duration type:", typeof data[0].duration);
          console.log("First workout duration value:", data[0].duration);
        }
        
        setWorkouts(data || []);
      } catch (err: any) {
        console.error('Error fetching workouts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchWorkouts();
  }, [period]);

  // Transform workouts data for the bar chart
  const chartData: BarChartDataPoint[] = useMemo(() => {
    console.log("Recalculating chartData...");
    return workouts.map(workout => {
      const durationMinutes = durationToMinutes(workout.duration);
      console.log(`Workout ${workout.id} duration: ${workout.duration} → ${durationMinutes} minutes`);
      return {
        date: workout.date,
        value: durationMinutes,
      };
    });
  }, [workouts]); // Depend only on workouts

  // --- Calculate custom Y-axis ticks --- 
  const { yAxisTicks, maxDurationValue } = useMemo(() => {
    if (chartData.length === 0) {
      return { yAxisTicks: [0], maxDurationValue: 0 }; // Default for empty data
    }

    // Find the maximum duration in the current chart data
    const maxDuration = Math.max(...chartData.map(d => d.value), 0);

    // Determine tick interval based on max duration
    const tickInterval = maxDuration <= 45 ? 5 : 10;

    // Calculate the highest tick value needed (multiple of interval >= maxDuration)
    const maxTickValue = Math.ceil(maxDuration / tickInterval) * tickInterval;
    
    // Handle the case where maxTickValue is 0 (e.g., all workouts are 0 min)
    if (maxTickValue === 0) {
        return { yAxisTicks: [0], maxDurationValue: 0 };
    }

    // Generate the ticks from 0 up to maxTickValue
    const ticks: number[] = [];
    for (let i = 0; i <= maxTickValue; i += tickInterval) {
      ticks.push(i);
    }
    
    return { yAxisTicks: ticks, maxDurationValue: maxTickValue };

  }, [chartData]); // Recalculate when chartData changes

  // Calculate metrics for display
  const totalWorkouts = workouts.length;
  
  const totalDuration = workouts.reduce((sum, workout) => {
    return sum + durationToMinutes(workout.duration);
  }, 0);
  
  const averageDuration = totalWorkouts > 0 
    ? Math.round(totalDuration / totalWorkouts) 
    : 0;

  // Prepare the metrics display for the card
  const metrics = [
    { label: 'Total workouts', value: totalWorkouts.toString() },
    { label: 'Average duration', value: `${averageDuration} min` },
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
        <Text style={{ color: 'red' }}>Error loading workouts: {error}</Text>
      </View>
    );
  }

  // Handle empty state with a friendly message
  if (workouts.length === 0) {
    return (
      <BarChartCard
        title="Workouts"
        data={[]}
        period={period}
        metrics={[
          { label: 'Total workouts', value: '0' },
          { label: 'Average duration', value: '0 min' },
        ]}
        yAxisLabel=""
        yAxisSuffix=" min"
        color="#14b8a6"
        emptyStateMessage="No workouts in this period. Start logging your workouts to see statistics!"
      />
    );
  }

  return (
    <BarChartCard
      title="Workouts"
      data={chartData}
      period={period}
      metrics={metrics}
      yAxisLabel=""
      yAxisSuffix=""
      color="#14b8a6"
      formatYLabel={(yValue) => {
        // Format the exact tick value (already multiple of 5 or 10)
        const totalMinutes = parseInt(yValue, 10);
        if (isNaN(totalMinutes) || totalMinutes < 0) return '0:00';
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`; 
      }}
      yAxisLabelXOffset={32}
      yAxisTicks={yAxisTicks} // Pass the calculated custom ticks
    />
  );
} 