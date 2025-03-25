import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { getWorkoutCalendarData } from '@/lib/workoutUtils';
import { startOfWeek, addDays, format } from 'date-fns';

export default function HistoryHomeCard() {
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchWorkoutHistory();
  }, []);

  const fetchWorkoutHistory = async () => {
    try {
      setLoading(true);
      const calendarData = await getWorkoutCalendarData();
      setMarkedDates(calendarData);
    } catch (error) {
      console.error('Error fetching workout history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate days of the week (Mon-Sun)
  const generateWeekDays = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday as start of week
    
    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(weekStart, index);
      const dayName = format(date, 'EEEEEE'); // 2-letter day name
      const dayNumber = format(date, 'd'); // Day of month
      const dateString = format(date, 'yyyy-MM-dd');
      const isMarked = markedDates[dateString]?.marked || false;
      
      return { dayName, dayNumber, dateString, isMarked };
    });
  };

  const handlePress = () => {
    // Navigate to history screen (to be implemented later)
    alert('History screen will be implemented later');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Workout History</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </View>
    );
  }

  const weekDays = generateWeekDays();

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout History</Text>
      </View>
      
      <View style={styles.weekCalendar}>
        {weekDays.map((day, index) => (
          <View key={index} style={styles.dayColumn}>
            <Text style={styles.dayName}>{day.dayName}</Text>
            <View style={[styles.dayCircle, day.isMarked && styles.dayCircleMarked]}>
              <Text style={[styles.dayNumber, day.isMarked && styles.dayNumberMarked]}>
                {day.dayNumber}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d3d56',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
  },
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    paddingTop: 0,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dayCircleMarked: {
    backgroundColor: '#14b8a6',
  },
  dayNumber: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ccfbf1',
  },
  dayNumberMarked: {
    color: '#042f2e',
    fontFamily: 'Inter-Bold',
  },
  loadingContainer: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
});