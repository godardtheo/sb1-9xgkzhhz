import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WorkoutHistoryListCardProps {
  workout: {
    id: string;
    name: string;
    formattedDate: string;
    exerciseCount: number;
    setCount: number;
    duration: string;
    muscles: string[];
  };
  onPress: (id: string) => void;
}

export default function WorkoutHistoryListCard({ workout, onPress }: WorkoutHistoryListCardProps) {
  // Format duration string from PostgreSQL interval to readable format
  const formatDuration = (duration: string | null | undefined): string => {
    // Add more robust check for null/undefined duration
    if (!duration || typeof duration !== 'string') return '--:--'; 
    
    // Parse PostgreSQL interval format
    const matches = duration.match(/(\d+):(\d+):(\d+)/);
    if (matches) {
      const [, hours, minutes] = matches;
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    
    return '--:--';
  };

  // Function to get chip color based on muscle group
  const getMuscleChipColor = (muscle: string) => {
    const colorMap: Record<string, { bg: string, text: string }> = {
      CHEST: { bg: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' },
      BACK: { bg: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' },
      LEGS: { bg: 'rgba(16, 185, 129, 0.3)', text: '#10b981' },
      SHOULDERS: { bg: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' },
      ARMS: { bg: 'rgba(168, 85, 247, 0.3)', text: '#a855f7' },
      CORE: { bg: 'rgba(236, 72, 153, 0.3)', text: '#ec4899' },
      CARDIO: { bg: 'rgba(14, 165, 233, 0.3)', text: '#0ea5e9' },
      FULL_BODY: { bg: 'rgba(249, 115, 22, 0.3)', text: '#f97316' },
    };
    
    return colorMap[muscle] || { bg: 'rgba(75, 85, 99, 0.3)', text: '#4b5563' };
  };

  // Provide default fallbacks for potentially missing data
  const exerciseCount = workout?.exerciseCount ?? 0;
  const setCount = workout?.setCount ?? 0;
  const formattedDate = workout?.formattedDate || 'Unknown Date';
  const name = workout?.name || 'Unnamed Workout';
  const duration = formatDuration(workout?.duration);

  return (
    <Pressable 
      style={styles.container}
      onPress={() => onPress(workout.id)}
    >
      {/* Card content container */}
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.date}>{formattedDate} - <Text style={styles.name}>{name}</Text></Text>
        </View>
        
        {/* Stats - Render each part separately with fallbacks */}
        <View style={styles.statsContainer}>
          <Text style={styles.statValue}>{exerciseCount}</Text>
          <Text style={styles.statLabel}> exercises</Text>
          <Text style={styles.separator}>  ·  </Text>
          <Text style={styles.statValue}>{setCount}</Text>
          <Text style={styles.statLabel}> sets</Text>
          <Text style={styles.separator}>  ·  </Text>
          <Text style={styles.statValue}>{duration}</Text>
        </View>
      </View>
      
      {/* Chevron icon */}
      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={20} color="#5eead4" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#042f2e',
    borderRadius: 24,
    padding: 16,
    marginBottom: 8,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  name: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    marginLeft: 4,
  },
  separator: {
    color: '#5eead4',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginHorizontal: 6,
  },
  chevronContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginLeft: 8,
  },
}); 