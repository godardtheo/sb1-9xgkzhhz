import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WorkoutStatsCardProps {
  exerciseCount: number;
  setCount: number;
  duration: string;
  isTemplate?: boolean;
}

export default function WorkoutStatsCard({ 
  exerciseCount, 
  setCount, 
  duration, 
  isTemplate = false 
}: WorkoutStatsCardProps) {
  // Format duration string from PostgreSQL interval to readable format if not template
  const formatDuration = (duration: string) => {
    if (!duration) return '--:--';
    
    // If it's already formatted as HH:MM, return it
    if (/^\d+:\d+$/.test(duration)) {
      return duration;
    }
    
    // Parse PostgreSQL interval format (HH:MM:SS)
    const matches = duration.match(/(\d+):(\d+):(\d+)/);
    if (matches) {
      const [, hours, minutes] = matches;
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    
    return duration;
  };

  return (
    <View style={styles.statsPanel}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{exerciseCount || 0}</Text>
        <Text style={styles.statLabel}>exercises</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{setCount || 0}</Text>
        <Text style={styles.statLabel}>sets</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{isTemplate ? duration : formatDuration(duration)}</Text>
        <Text style={styles.statLabel}>duration</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsPanel: {
    flexDirection: 'row',
    backgroundColor: '#042f2e',
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(94, 234, 212, 0.2)',
  },
}); 