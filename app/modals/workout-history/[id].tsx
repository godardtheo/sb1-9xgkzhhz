import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NonDraggableDoneExercise from '@/components/NonDraggableDoneExercise';
import WorkoutStatsCard from '@/components/WorkoutStatsCard';
import DeleteWorkoutConfirmation from '@/components/DeleteWorkoutConfirmation';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export default function WorkoutDetailModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : null;
  
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [workoutData, setWorkoutData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  useEffect(() => {
    if (id) {
      console.log(`Fetching workout with ID: ${id}`);
      fetchWorkoutDetails();
    } else {
      console.error('No workout ID provided');
      setError('No workout ID provided');
      setLoading(false);
    }
  }, [id]);
  
  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting workout data fetch...');
      
      // Get the workout basic data first
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('id, name, date, duration')
        .eq('id', id)
        .single();
      
      if (workoutError) {
        console.error('Error fetching workout basic data:', workoutError);
        setError(`Error fetching workout: ${workoutError.message}`);
        setLoading(false);
        return;
      }
      
      if (!workout) {
        console.error('No workout found with ID:', id);
        setError('Workout not found');
        setLoading(false);
        return;
      }
      
      console.log('Found workout:', workout);
      
      // Format the date
      const formattedDate = workout.date 
        ? format(new Date(workout.date), 'MMMM d, yyyy') 
        : 'Unknown Date';
      
      // Get exercises for this workout (without the relationship that's causing issues)
      const { data: workoutExercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('id, exercise_id, parent_workout_id')
        .eq('parent_workout_id', id);
      
      if (exercisesError) {
        console.error('Error fetching workout exercises:', exercisesError);
        setError(`Error fetching exercises: ${exercisesError.message}`);
        setLoading(false);
        return;
      }
      
      console.log(`Found ${workoutExercises?.length || 0} exercises`);
      
      // Format the exercises with their sets
      const formattedExercises = [];
      let totalSetCount = 0;
      
      if (workoutExercises && workoutExercises.length > 0) {
        for (const workoutExercise of workoutExercises) {
          // Get the exercise details
          const { data: exerciseDetails, error: exerciseError } = await supabase
            .from('exercises')
            .select('name')
            .eq('id', workoutExercise.exercise_id)
            .single();
          
          if (exerciseError) {
            console.error(`Error fetching exercise details for ${workoutExercise.exercise_id}:`, exerciseError);
          }
          
          // Get sets for this exercise using the 'sets' table (not 'workout_sets')
          const { data: exerciseSets, error: setsError } = await supabase
            .from('sets')  // Changed from 'workout_sets' to 'sets'
            .select('*')  // Select all columns to see what's available
            .eq('workout_exercise_id', workoutExercise.id);
          
          if (setsError) {
            console.error(`Error fetching sets for exercise ${workoutExercise.id}:`, setsError);
            continue;
          }
          
          console.log(`Found ${exerciseSets?.length || 0} sets for exercise ${workoutExercise.id}`);
          if (exerciseSets && exerciseSets.length > 0) {
            console.log('Example set data:', exerciseSets[0]);
          }
          
          totalSetCount += exerciseSets?.length || 0;
          
          // Use exercise name from details or fallback
          const exerciseName = exerciseDetails?.name || 'Unknown Exercise';
          
          // Determine the correct property names for weight, reps and completed
          const formattedSets = exerciseSets?.map(set => {
            // Look for possible column names based on common naming patterns
            const weight = set.weight || set.weight_kg || set.weightkg || set.weight_lbs || set.weightlbs || '0';
            const reps = set.reps || set.rep_count || set.repcount || set.num_reps || set.numreps || '0';
            const completed = set.completed || set.is_completed || set.iscompleted || set.done || true;
            
            return {
              weight: String(weight),
              reps: String(reps),
              completed: Boolean(completed)
            };
          }) || [];
          
          formattedExercises.push({
            id: workoutExercise.id,
            name: exerciseName,
            sets: formattedSets
          });
        }
      }
      
      setWorkoutData({
        ...workout,
        formattedDate,
        exerciseCount: workoutExercises?.length || 0,
        setCount: totalSetCount,
        exercises: formattedExercises
      });
      
      console.log('Workout data processing complete');
    } catch (error: any) {
      console.error('Unexpected error in fetchWorkoutDetails:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    router.back();
  };
  
  const handleDeletePress = useCallback(() => {
    console.log('Delete button pressed, showing confirmation modal...');
    setForceUpdateCounter(prev => prev + 1);
    setTimeout(() => {
      setDeleteConfirmVisible(true);
    }, 50);
  }, []);
  
  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      
      console.log(`Deleting workout: ${id}`);
      
      // First we need to get all workout exercise IDs to delete their sets
      const { data: workoutExercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('id')
        .eq('parent_workout_id', id);
      
      if (exercisesError) {
        console.error('Error fetching workout exercises for deletion:', exercisesError);
        return;
      }
      
      // Extract exercise IDs
      const exerciseIds = workoutExercises?.map(ex => ex.id) || [];
      console.log(`Found ${exerciseIds.length} workout exercises to delete`);
      
      // Delete related workout sets first (if there are any exercises)
      if (exerciseIds.length > 0) {
        try {
          // Delete all sets for these exercises using the 'sets' table
          const { error: setsDeleteError } = await supabase
            .from('sets')  // Changed from 'workout_sets' to 'sets'
            .delete()
            .in('workout_exercise_id', exerciseIds);
          
          if (setsDeleteError) {
            console.error('Error deleting workout sets:', setsDeleteError);
            return;
          }
          
          console.log('Successfully deleted related workout sets');
        } catch (deleteError) {
          console.error('Error in deleting sets:', deleteError);
        }
        
        // Now delete the workout exercises
        const { error: exercisesDeleteError } = await supabase
          .from('workout_exercises')
          .delete()
          .eq('parent_workout_id', id);
        
        if (exercisesDeleteError) {
          console.error('Error deleting workout exercises:', exercisesDeleteError);
          return;
        }
        
        console.log('Successfully deleted workout exercises');
      }
      
      // Finally delete the workout itself
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting workout:', error);
        return;
      }
      
      console.log('Successfully deleted workout');
      setDeleteConfirmVisible(false);
      setForceUpdateCounter(prev => prev + 1);
      
      // Navigate back to refresh the workout history
      router.replace('/modals/workout-history');
    } catch (error) {
      console.error('Error in handleDeleteConfirm:', error);
    } finally {
      setDeleteLoading(false);
    }
  };
  
  const handleDeleteCancel = useCallback(() => {
    console.log('Delete cancelled, hiding modal...');
    setDeleteConfirmVisible(false);
    setForceUpdateCounter(prev => prev + 1);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ 
          title: 'Workout Details',
          headerShown: false,
          presentation: 'modal'
        }} />
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ccfbf1" />
          </Pressable>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Workout Details</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading workout details...</Text>
        </View>
      </View>
    );
  }

  if (!workoutData) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ 
          title: 'Workout Details',
          headerShown: false,
          presentation: 'modal'
        }} />
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ccfbf1" />
          </Pressable>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Workout Not Found</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || 'Workout could not be found.'}
          </Text>
          <Pressable onPress={handleBack} style={styles.goBackButton}>
            <Text style={styles.goBackText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} key={`workout-detail-${forceUpdateCounter}`}>
      <Stack.Screen options={{ 
        title: 'Workout Details',
        headerShown: false,
        presentation: 'modal'
      }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ccfbf1" />
        </Pressable>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {workoutData.name} - <Text style={styles.dateText}>{workoutData.formattedDate}</Text>
          </Text>
        </View>
        <Pressable onPress={handleDeletePress} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </Pressable>
      </View>
      
      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics Card */}
        <WorkoutStatsCard 
          exerciseCount={workoutData.exerciseCount}
          setCount={workoutData.setCount}
          duration={workoutData.duration}
        />
        
        {/* Exercises Section */}
        <Text style={styles.sectionTitle}>Exercises</Text>
        
        {workoutData.exercises && workoutData.exercises.length > 0 ? (
          workoutData.exercises.map((exercise: any) => (
            <NonDraggableDoneExercise 
              key={exercise.id} 
              exercise={exercise}
            />
          ))
        ) : (
          <View style={styles.emptyExercisesContainer}>
            <Text style={styles.emptyExercisesText}>No exercises found for this workout.</Text>
          </View>
        )}
      </ScrollView>
      
      {/* Delete Confirmation Modal */}
      <DeleteWorkoutConfirmation
        visible={deleteConfirmVisible}
        onConfirm={handleDeleteConfirm}
        onClose={handleDeleteCancel}
        loading={deleteLoading}
        workoutName={workoutData?.name || 'this workout'}
        context="history"
      />
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#042f2e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94, 234, 212, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    textAlign: 'center',
  },
  dateText: {
    color: '#5eead4',
    fontFamily: 'Inter-SemiBold',
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#5eead4',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
    marginBottom: 20,
  },
  goBackButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#14b8a6',
    borderRadius: 20,
  },
  goBackText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#042f2e',
  },
  emptyExercisesContainer: {
    padding: 20,
    backgroundColor: '#042f2e',
    borderRadius: 24,
    alignItems: 'center',
  },
  emptyExercisesText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
  },
}); 