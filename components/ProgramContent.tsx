import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import DraggableWorkoutCard from './DraggableWorkoutCard';
import { useWorkoutReorder } from '@/hooks/useWorkoutReorder';
import { Plus, AlertCircle } from 'lucide-react-native';
import { useRef, useEffect, useState } from 'react';

type Workout = {
  id: string;             // This is the program_workout id
  name: string;
  description: string | null;
  muscles: string[];
  estimated_duration: string;
  exercise_count: number;
  set_count: number;
  template_id: string;    // This refers to the original workout template
};

type ProgramContentProps = {
  workouts: Workout[];
  onWorkoutDelete: (workoutId: string) => void;
  onWorkoutInfo: (workout: Workout) => void;
  onWorkoutPress: (templateId: string) => void;
  onAddWorkout: () => void;
  onReorderWorkouts: (newOrder: Workout[]) => void;
  loading?: boolean;
  error?: string | null;
};

export default function ProgramContent({
  workouts,
  onWorkoutDelete,
  onWorkoutInfo,
  onWorkoutPress,
  onAddWorkout,
  onReorderWorkouts,
  loading = false,
  error = null
}: ProgramContentProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [isReordering, setIsReordering] = useState(false);
  
  const {
    workouts: reorderedWorkouts,
    setWorkouts: setReorderedWorkouts,
    activeIndex,
    itemOffsets,
    itemTranslations,
    updateItemHeight,
    handleDragActive,
    handleDragEnd,
  } = useWorkoutReorder(workouts);

  // Only update reorderedWorkouts when workouts change and we're not actively reordering
  useEffect(() => {
    if (!isReordering && workouts && workouts.length > 0) {
      console.log("Updating reordered workouts from props", workouts.length);
      setReorderedWorkouts(workouts);
    }
  }, [workouts, isReordering]);

  // Handle workout reordering
  const handleWorkoutReorder = (fromIndex: number, toIndex: number) => {
    setIsReordering(true);
    handleDragEnd(fromIndex, toIndex);
    
    // Notify parent component about the reordering
    onReorderWorkouts(reorderedWorkouts);
    
    // Reset reordering flag after a short delay
    setTimeout(() => {
      setIsReordering(false);
    }, 500);
  };

  // If in loading state, show spinner
  if (loading && workouts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading workouts...</Text>
      </View>
    );
  }

  // If there's an error, show error message
  if (error && workouts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={32} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        
        {error.includes('API key') && (
          <View style={styles.apiKeyErrorContainer}>
            <Text style={styles.apiKeyErrorText}>
              This error indicates missing Supabase credentials. Make sure your environment variables are set properly.
            </Text>
          </View>
        )}
        
        <Pressable style={styles.retryButton} onPress={onAddWorkout}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.workoutsList}
        showsVerticalScrollIndicator={true}
      >
        {workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Add workouts to create your program
            </Text>
            <Pressable 
              style={styles.addWorkoutButton}
              onPress={onAddWorkout}
            >
              <Plus size={20} color="#ccfbf1" />
              <Text style={styles.addWorkoutText}>Add Workout</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {reorderedWorkouts.map((workout, index) => (
              <DraggableWorkoutCard
                key={`workout-${workout.id}`}
                workout={workout}
                index={index}
                onDragEnd={handleWorkoutReorder}
                onRemove={onWorkoutDelete}
                onPress={() => onWorkoutPress(workout.template_id)}
                onInfo={() => onWorkoutInfo(workout)}
                totalWorkouts={workouts.length}
                isInProgram={true} // Flag that this is a program workout
                activeIndex={activeIndex}
                itemOffsets={itemOffsets}
                itemTranslations={itemTranslations}
                updateItemHeight={updateItemHeight}
                handleDragActive={handleDragActive}
              />
            ))}
            <Pressable 
              style={styles.addWorkoutButton}
              onPress={onAddWorkout}
            >
              <Plus size={20} color="#ccfbf1" />
              <Text style={styles.addWorkoutText}>Add Workout</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  workoutsList: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },
  emptyState: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
  },
  addWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3d56',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 16,
  },
  addWorkoutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#5eead4',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: 16,
    textAlign: 'center',
    maxWidth: '80%',
  },
  apiKeyErrorContainer: {
    backgroundColor: '#450a0a',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 16,
    maxWidth: '90%',
  },
  apiKeyErrorText: {
    color: '#fca5a5',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});