import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NonDraggableDoneExercise from '@/components/NonDraggableDoneExercise';
import WorkoutStatsCard from '@/components/WorkoutStatsCard';
import DeleteWorkoutConfirmation from '@/components/DeleteWorkoutConfirmation';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [weightUnit, setWeightUnit] = useState<string>('kg'); // Default to kg
  
  // Get safe area insets
  const insets = useSafeAreaInsets();
  
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
      
      // Get current user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        console.error('Error fetching authenticated user:', authError);
        setError('Could not authenticate user.');
        setLoading(false);
        return;
      }
      
      // Fetch user's weight unit preference
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('weight_unit')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        console.warn('Warning fetching user weight unit:', userError.message);
        // Default to 'kg' or handle as per app logic, here we set it and continue
        setWeightUnit('kg');
      } else if (userData && userData.weight_unit) {
        setWeightUnit(userData.weight_unit);
        console.log('User weight unit:', userData.weight_unit);
      } else {
        setWeightUnit('kg'); // Default if not set
        console.log('No weight unit found in profile, using default \'kg\'.');
      }
      
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
      
      // Get exercises for this workout (ensure exercise_id is selected)
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
            exerciseId: workoutExercise.exercise_id,
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
  
  const handleExercisePress = (exerciseId: string) => {
    if (!exerciseId) {
      console.warn('Attempted to navigate with undefined exerciseId');
      return;
    }
    console.log(`Navigating to exercise details for ID: ${exerciseId}`);
    router.push(`/modals/exercise-details/${exerciseId}`);
  };
  
  const handleDeletePress = useCallback(() => {
    console.log('Delete button pressed, showing confirmation modal...');
    setForceUpdateCounter(prev => prev + 1);
    setTimeout(() => {
      setDeleteConfirmVisible(true);
    }, 50);
  }, []);
  
  const handleDeleteConfirm = async () => {
    console.log('[DEL] Starting deletion process for workout ID:', id);
    // Hide confirmation modal immediately and show loading overlay
    setDeleteConfirmVisible(false);
    setDeleteLoading(true);
    setError(null); // Clear previous errors

    try {
      // Step 1: Fetch workout exercise IDs
      console.log('[DEL] Step 1: Fetching workout_exercises IDs for workout:', id);
      const { data: workoutExercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('id')
        .eq('parent_workout_id', id);
      
      if (exercisesError) {
        console.error('[DEL] Step 1 FAILED: Error fetching workout exercises:', JSON.stringify(exercisesError, null, 2));
        // Show error and stop
        setError(`Failed to fetch exercises: ${exercisesError.message}`);
        Alert.alert('Deletion Error', `Failed to fetch associated exercises: ${exercisesError.message}`);
        // No return here, finally block will handle loading state
        throw exercisesError; // Throw error to be caught by outer catch
      }
      
      const exerciseIds = workoutExercises?.map(ex => ex.id) || [];
      console.log(`[DEL] Step 1 SUCCESS: Found ${exerciseIds.length} workout_exercises. IDs: ${exerciseIds.join(', ')}`);
      
      // Steps 2 & 3: Delete related sets and then workout_exercises
      if (exerciseIds.length > 0) {
        // Step 2: Delete sets
        console.log('[DEL] Step 2: Attempting to delete sets for workout_exercise IDs:', exerciseIds.join(', '));
        try {
          const { error: setsDeleteError } = await supabase
            .from('sets')
            .delete()
            .in('workout_exercise_id', exerciseIds);
          
          if (setsDeleteError) {
            console.error('[DEL] Step 2 FAILED: Error deleting sets:', JSON.stringify(setsDeleteError, null, 2));
            setError(`Failed to delete sets: ${setsDeleteError.message}`);
            Alert.alert('Deletion Error', `Failed to delete associated sets: ${setsDeleteError.message}`);
            throw setsDeleteError;
          }
          
          console.log('[DEL] Step 2 SUCCESS: Successfully deleted related sets.');
        } catch (deleteSetsCatchError: any) {
          console.error('[DEL] Step 2 FAILED (catch block): Error during set deletion:', JSON.stringify(deleteSetsCatchError, null, 2));
          setError(`Error during set deletion: ${deleteSetsCatchError?.message || 'Unknown error'}`);
          Alert.alert('Deletion Error', `An error occurred while deleting sets: ${deleteSetsCatchError?.message || 'Unknown error'}`);
          // Rethrow or handle appropriately
          throw deleteSetsCatchError;
        }
        
        // Step 3: Delete workout_exercises
        console.log('[DEL] Step 3: Attempting to delete workout_exercises for workout ID:', id);
        const { error: exercisesDeleteError } = await supabase
          .from('workout_exercises')
          .delete()
          .eq('parent_workout_id', id);
        
        if (exercisesDeleteError) {
          console.error('[DEL] Step 3 FAILED: Error deleting workout_exercises:', JSON.stringify(exercisesDeleteError, null, 2));
          setError(`Failed to delete workout exercises: ${exercisesDeleteError.message}`);
          Alert.alert('Deletion Error', `Failed to delete associated exercises records: ${exercisesDeleteError.message}`);
          throw exercisesDeleteError;
        }
        
        console.log('[DEL] Step 3 SUCCESS: Successfully deleted workout_exercises.');
        
      } else {
        console.log('[DEL] Steps 2 & 3 skipped: No workout_exercises found, so no sets or exercises to delete.');
      }
      
      // Step 4: Delete the workout itself
      console.log('[DEL] Step 4: Attempting to delete the main workout entry for ID:', id);
      const { error: workoutDeleteError } = await supabase
        .from('workouts')
        .delete()
        .eq('id', id);
      
      if (workoutDeleteError) {
        console.error('[DEL] Step 4 FAILED: Error deleting workout:', JSON.stringify(workoutDeleteError, null, 2));
        setError(`Failed to delete workout: ${workoutDeleteError.message}`);
        Alert.alert('Deletion Error', `Failed to delete the workout: ${workoutDeleteError.message}`);
        throw workoutDeleteError;
      }
      
      console.log('[DEL] Step 4 SUCCESS: Successfully deleted workout.');
      
      // Step 5: Navigate back AFTER successful deletion
      console.log('[DEL] Step 5: Deletion successful. Navigating back...');
      // setForceUpdateCounter(prev => prev + 1); // Probably no longer needed with useFocusEffect on the previous screen
      router.back(); 
      console.log('[DEL] Step 5: Navigation initiated.');
      // Note: setDeleteLoading(false) will be called in the finally block
      
    } catch (error: any) {
      // Catch any error thrown from the try block (including failed deletions)
      console.error('[DEL] CATCH BLOCK: Deletion process failed.', error);
      // Error message should have been set and Alert shown already
      // Ensure loading state is turned off in finally
    } finally {
      console.log('[DEL] Deletion process finished (finally block). Setting deleteLoading to false.');
      setDeleteLoading(false); // Ensure loading indicator is always turned off
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
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 24 }]}>
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
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 24 }]}>
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
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 24 }]}>
        <Pressable onPress={handleBack} style={styles.backButton} disabled={deleteLoading}>
          <Ionicons name="arrow-back" size={24} color={deleteLoading ? '#4b5563' : '#ccfbf1'} />
        </Pressable>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {workoutData.name} - <Text style={styles.dateText}>{workoutData.formattedDate}</Text>
          </Text>
        </View>
        <Pressable onPress={handleDeletePress} style={styles.deleteButton} disabled={deleteLoading}>
          <Ionicons name="trash-outline" size={22} color={deleteLoading ? '#4b5563' : '#ef4444'} />
        </Pressable>
      </View>
      
      {/* Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={!deleteLoading}
      >
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
              exerciseId={exercise.exerciseId}
              onPress={handleExercisePress}
              weightUnit={weightUnit}
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

      {/* Deletion Loading Overlay */}
      {deleteLoading && (
        <View style={styles.deleteOverlay}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.deleteOverlayText}>Deleting workout...</Text>
        </View>
      )}
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
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  deleteOverlayText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
}); 