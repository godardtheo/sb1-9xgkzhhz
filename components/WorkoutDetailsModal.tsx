import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import NonDraggableExerciseCard from './NonDraggableExerciseCard';
import { supabase } from '@/lib/supabase';

type Exercise = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  instructions?: string;
  video_url?: string;
  type?: string;
  difficulty?: string;
  sets: {
    id: string;
    minReps: string;
    maxReps: string;
  }[];
};

type Workout = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  estimated_duration: string;
  exercise_count: number;
  set_count?: number;
  workout_id?: string; // Added for program workout
  exercises?: Exercise[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  workout: Workout | null;
  isInProgram?: boolean; // Flag to indicate if this is a program workout view
};

export default function WorkoutDetailsModal({ visible, onClose, workout, isInProgram = false }: Props) {
  const [workoutDetails, setWorkoutDetails] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && workout) {
      fetchWorkoutExercises();
    } else {
      // Reset state when modal closes
      setWorkoutDetails(null);
    }
  }, [visible, workout]);

  const fetchWorkoutExercises = async () => {
    if (!workout) return;
    
    try {
      setLoading(true);
      setError(null);

      // Create a workout details object with the current workout data
      const workoutData = { ...workout };

      // Determine the correct ID to use for querying (handle program workouts differently)
      const workoutId = isInProgram && workout.workout_id ? workout.workout_id : workout.id;

      // Fetch exercises for the workout
      const { data: exerciseData, error: exercisesError } = await supabase
        .from('template_exercises')
        .select(`
          id,
          exercise_id,
          exercises (
            id,
            name,
            muscle,
            equipment,
            instructions,
            video_url,
            type,
            difficulty
          ),
          template_exercise_sets (
            id,
            min_reps,
            max_reps,
            order
          )
        `)
        .eq('template_id', workoutId)
        .order('order');

      if (exercisesError) {
        console.error("Error fetching exercises:", exercisesError);
        setError("Failed to load workout exercises");
        return;
      }

      if (exerciseData && exerciseData.length > 0) {
        // Format exercises data
        const exercises = exerciseData.map(item => ({
          id: item.exercises.id,
          name: item.exercises.name,
          muscle: item.exercises.muscle,
          equipment: item.exercises.equipment,
          instructions: item.exercises.instructions,
          video_url: item.exercises.video_url,
          type: item.exercises.type,
          difficulty: item.exercises.difficulty,
          sets: item.template_exercise_sets.map(set => ({
            id: set.id,
            minReps: set.min_reps.toString(),
            maxReps: set.max_reps.toString()
          }))
        }));

        // Calculate the actual exercise count
        workoutData.exercise_count = exercises.length;
        
        // Calculate the total set count
        workoutData.set_count = exercises.reduce((total, exercise) => 
          total + exercise.sets.length, 0);
        
        workoutData.exercises = exercises;
      }

      setWorkoutDetails(workoutData);
    } catch (err) {
      console.error("Error in fetchWorkoutExercises:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // If workout is null, don't render anything
  if (!workout) return null;

  // Use either fetched details or the passed workout prop
  const displayWorkout = workoutDetails || workout;

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
      aria-modal="true"
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View 
          style={styles.modalContainer}
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.springify().damping(15)}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>{displayWorkout.name}</Text>
              <Pressable 
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <X size={24} color="#5eead4" />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {displayWorkout.description && (
                <View style={styles.section}>
                  <Text style={styles.description}>{displayWorkout.description}</Text>
                </View>
              )}

              <View style={styles.statsPanel}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{displayWorkout.exercise_count}</Text>
                  <Text style={styles.statLabel}>exercises</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{displayWorkout.set_count || 0}</Text>
                  <Text style={styles.statLabel}>sets</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{displayWorkout.estimated_duration}</Text>
                  <Text style={styles.statLabel}>duration</Text>
                </View>
              </View>

              <View style={styles.muscleSection}>
                <Text style={styles.sectionTitle}>Target Muscles</Text>
                <View style={styles.muscleChips}>
                  {displayWorkout.muscles && displayWorkout.muscles.map((muscle) => (
                    <View key={muscle} style={styles.muscleChip}>
                      <Text style={styles.muscleChipText}>
                        {muscle.charAt(0).toUpperCase() + muscle.slice(1).replace('_', ' ')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {loading ? (
                <View style={styles.loadingSection}>
                  <Text style={styles.loadingText}>Loading exercises...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorSection}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : displayWorkout.exercises && displayWorkout.exercises.length > 0 ? (
                <View style={styles.exercisesSection}>
                  <Text style={styles.sectionTitle}>Exercises</Text>
                  {displayWorkout.exercises.map((exercise, index) => (
                    <NonDraggableExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      index={index + 1}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.section}>
                  <Text style={styles.noExercisesText}>No exercises found for this workout</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.8)',
  },
  modalContainer: {
    backgroundColor: '#031A19',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 -8px 20px -5px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 20,
      },
    }),
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    lineHeight: 24,
  },
  statsPanel: {
    flexDirection: 'row',
    backgroundColor: '#0d3d56',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
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
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#115e59',
  },
  muscleSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 16,
  },
  muscleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleChip: {
    backgroundColor: '#0d3d56',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  muscleChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  exercisesSection: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  loadingSection: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  errorSection: {
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
  },
  noExercisesText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    textAlign: 'center',
  },
});