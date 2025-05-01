import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, Platform } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { format, addMonths, subMonths, isSameMonth, isAfter } from 'date-fns';
import WorkoutHistoryListCard from '@/components/WorkoutHistoryListCard';
import { 
  getMonthlyWorkoutCalendarData, 
  getWorkoutHistory, 
  getWorkoutByDate 
} from '@/lib/workoutUtils';

export default function WorkoutHistoryModal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isMonthSelectorVisible, setMonthSelectorVisible] = useState(false);
  
  // Check if current month is the actual current month
  const isCurrentMonthToday = isSameMonth(currentMonth, new Date());
  
  // Format current month for display
  const formattedMonth = format(currentMonth, 'MMMM yyyy');
  
  // Load data when component mounts or month changes
  const loadData = useCallback(async () => {
    // Only show full screen loading on initial load (when workouts array is empty)
    if (workouts.length === 0) {
      setLoading(true);
    }
    try {
      // Load calendar data for current month
      const calendarData = await getMonthlyWorkoutCalendarData(currentMonth);
      setMarkedDates(calendarData);
      
      // Load workout history
      const historyData = await getWorkoutHistory();
      setWorkouts(historyData);
    } catch (error) {
      console.error('Error loading workout history data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, workouts.length]);
  
  // Use useFocusEffect to load data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]) // Dependency array includes loadData (which depends on currentMonth)
  );
  
  const handleBack = () => {
    router.back();
  };
  
  const handleWorkoutPress = (id: string) => {
    console.log(`Navigating to workout detail with ID: ${id}`);
    // Use a proper path format that works with Expo Router
    router.push(`/modals/workout-history/${id}`);
  };
  
  const handleDatePress = async (date: DateData) => {
    // Check if there's a workout on this date
    const workoutId = await getWorkoutByDate(date.dateString);
    if (workoutId) {
      console.log(`Found workout for date ${date.dateString}: ${workoutId}`);
      // Use string-based navigation which is more reliable
      router.push(`/modals/workout-history/${workoutId}`);
    } else {
      console.log(`No workout found for date ${date.dateString}`);
    }
  };
  
  const handlePrevMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };
  
  const handleNextMonth = () => {
    // Only allow going forward if not on current month
    if (!isCurrentMonthToday) {
      setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
    }
  };
  
  const handleMonthPress = () => {
    setMonthSelectorVisible(true);
  };
  
  const renderCalendarHeader = () => {
    return (
      <View style={styles.calendarHeader}>
        <Pressable onPress={handlePrevMonth} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={22} color="#5eead4" />
        </Pressable>
        
        <Pressable onPress={handleMonthPress} style={styles.monthButton}>
          <Text style={styles.monthText}>{formattedMonth || 'Loading Month...'}</Text>
          <Ionicons name="caret-down" size={16} color="#5eead4" style={{ marginLeft: 4 }} />
        </Pressable>
        
        {/* Only show next month button if not on current month */}
        {!isCurrentMonthToday ? (
          <Pressable onPress={handleNextMonth} style={styles.arrowButton}>
            <Ionicons name="chevron-forward" size={22} color="#5eead4" />
          </Pressable>
        ) : (
          <View style={styles.emptyArrowSpace} />
        )}
      </View>
    );
  };
  
  // Month selector modal
  const renderMonthSelector = () => {
    const today = new Date();
    
    return (
      <Modal
        visible={isMonthSelectorVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMonthSelectorVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setMonthSelectorVisible(false)}
        >
          <View 
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Select Month</Text>
            
            <ScrollView style={styles.monthList}>
              {Array.from({ length: 12 }).map((_, index) => {
                const month = new Date(today.getFullYear(), index);
                
                // Skip future months
                if (isAfter(month, today) && !isSameMonth(month, today)) {
                  return null;
                }
                
                const monthName = format(month, 'MMMM yyyy');
                const isCurrentMonth = isSameMonth(month, currentMonth);
                
                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.monthOption,
                      isCurrentMonth && styles.selectedMonthOption
                    ]}
                    onPress={() => {
                      setCurrentMonth(new Date(today.getFullYear(), index));
                      setMonthSelectorVisible(false);
                    }}
                  >
                    <Text 
                      style={[
                        styles.monthOptionText,
                        isCurrentMonth && styles.selectedMonthOptionText
                      ]}
                    >
                      {monthName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            
            <Pressable 
              style={styles.closeModalButton}
              onPress={() => setMonthSelectorVisible(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    );
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Workout History',
          headerShown: false,
          presentation: 'modal'
        }} 
      />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#ccfbf1" />
        </Pressable>
        <Text style={styles.title}>Workout History</Text>
        <View style={{ width: 24 }} /> {/* Empty space for layout balance */}
      </View>
      
      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading workout history...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Restore Calendar Section View */}
          <View style={styles.calendarSection}>
            {/* Keep header */}
            {renderCalendarHeader()}
            
            {/* Restore Calendar component */}
            <Calendar
              theme={{
                calendarBackground: 'transparent',
                textSectionTitleColor: '#5eead4',
                selectedDayBackgroundColor: '#14b8a6',
                selectedDayTextColor: '#042f2e',
                todayTextColor: '#042f2e',
                todayBackgroundColor: '#14b8a6',
                dayTextColor: '#ccfbf1',
                textDisabledColor: 'rgba(204, 251, 241, 0.3)',
                dotColor: '#14b8a6',
                selectedDotColor: '#042f2e',
                arrowColor: 'transparent', // Hide default arrows
                monthTextColor: 'transparent', // Hide default month text
                indicatorColor: '#14b8a6',
                textDayFontFamily: 'Inter-Medium',
                textMonthFontFamily: 'Inter-SemiBold',
                textDayHeaderFontFamily: 'Inter-Medium',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
              markingType={'dot'}
              markedDates={markedDates}
              onDayPress={handleDatePress}
              hideArrows={true}
              hideExtraDays={false}
              disableMonthChange={true}
              firstDay={1} // Monday
              renderHeader={() => <View />} // Empty header as we have our custom one
              enableSwipeMonths={false}
              current={currentMonth.toISOString().split('T')[0]}
            />
          </View>
          
          
          {/* Restore Recent Workouts Section */}
          <View style={styles.workoutsSection}>
            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            
            {workouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No workouts found. Start training to see your workout history!
                </Text>
              </View>
            ) : (
              <View style={styles.workoutList}>
                {workouts.map((workout) => (
                  <WorkoutHistoryListCard
                    key={workout.id}
                    workout={workout}
                    onPress={handleWorkoutPress}
                  />
                ))}
              </View>
            )}
          </View>
          
        </ScrollView>
      )}
      
      {/* Restore Month selector modal */}
      {renderMonthSelector()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#042f2e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94, 234, 212, 0.1)',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100, // Add extra padding at the bottom to avoid navigation bar overlap
  },
  calendarSection: {
    margin: 16,
    marginBottom: 24, // Increased from 8 to 24 for more spacing
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyArrowSpace: {
    width: 40, 
    height: 40,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  monthText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  workoutsSection: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 20, // Added extra padding at the bottom
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#5eead4',
    marginBottom: 12,
  },
  workoutList: {
    gap: 8, // Reduced from 12
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  emptyState: {
    padding: 20,
    backgroundColor: '#042f2e',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#042f2e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 16,
  },
  monthList: {
    width: '100%',
    maxHeight: 300,
  },
  monthOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedMonthOption: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
  },
  monthOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ccfbf1',
    textAlign: 'center',
  },
  selectedMonthOptionText: {
    color: '#14b8a6',
    fontFamily: 'Inter-SemiBold',
  },
  closeModalButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#14b8a6',
    borderRadius: 20,
  },
  closeModalText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#042f2e',
  },
}); 