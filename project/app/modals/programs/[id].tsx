import { View, Text, StyleSheet, TextInput, Pressable, Platform, Switch, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Info, ChevronRight } from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';
import ProgramContent from '@/components/ProgramContent';
import { supabase, handleApiError } from '@/lib/supabase';
import Animated, { FadeIn } from 'react-native-reanimated';
import WorkoutSelectionModal from '@/components/WorkoutSelectionModal';
import ProgramMetricsModal from '@/components/ProgramMetricsModal';

// Track rendering for debugging
let renderCount = 0;

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

export default function EditProgramScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showWorkoutSelection, setShowWorkoutSelection] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [initialDataFetched, setInitialDataFetched] = useState(false);
  
  // Reference to prevent multiple concurrent fetches
  const fetchingRef = useRef(false);

  // Log renders for debugging
  renderCount++;
  console.log(`EditProgramScreen render #${renderCount}, workouts: ${workouts.length}`);

  // Set mounted flag
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Only fetch details on initial mount or when id changes
  useEffect(() => {
    if (isMounted && id && !initialDataFetched && !fetchingRef.current) {
      fetchProgramDetails();
    }
  }, [id, isMounted, initialDataFetched]);

  const totalWorkouts = workouts.length;
  const totalSets = workouts.reduce((acc, workout) => acc + (workout.set_count || 0), 0);
  const estimatedDuration = workouts.reduce((acc, workout) => {
    const duration = parseInt(String(workout.estimated_duration).replace(/[^0-9]/g, '') || '0');
    return acc + duration;
  }, 0);

  const fetchProgramDetails = async () => {
    // Guard against concurrent or repeated fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching program details for ID:', id);

      // Add a small delay to prevent excessive API calls
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check if component is still mounted
      if (!isMounted) {
        fetchingRef.current = false;
        return;
      }

      // Fetch program basic info
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', id)
        .single();

      if (programError) throw programError;

      if (!program) {
        throw new Error('Program not found');
      }

      setName(program.name);
      setDescription(program.description || '');
      setIsActive(program.is_active);

      // Fetch the workouts with their template IDs
      const { data: programWorkoutsData, error: programWorkoutsError } = await supabase
        .from('program_workouts')
        .select(`
          id, 
          name, 
          description, 
          muscles, 
          estimated_duration, 
          template_id, 
          order
        `)
        .eq('program_id', id)
        .order('order');

      if (programWorkoutsError) throw programWorkoutsError;

      if (!programWorkoutsData || programWorkoutsData.length === 0) {
        console.log('No workouts found for program');
        setWorkouts([]);
        setInitialDataFetched(true);
        return;
      }

      console.log(`Found ${programWorkoutsData.length} workouts for program`);

      // Process each workout to get simplified data without expensive database calls
      const processedWorkouts = programWorkoutsData.map((workout) => {
        return {
          id: workout.id,
          name: workout.name,
          description: workout.description,
          muscles: workout.muscles || [],
          estimated_duration: workout.estimated_duration || '0 min',
          exercise_count: 0, // We'll fetch this data later asynchronously
          set_count: 0,      // We'll fetch this data later asynchronously
          template_id: workout.template_id
        };
      });

      // Update state with the basic workout data
      setWorkouts(processedWorkouts);
      setInitialDataFetched(true);
      
      // Later, fetch the exercise counts separately to prevent infinite loops
      if (isMounted) {
        fetchWorkoutDetails(processedWorkouts);
      }
      
    } catch (err) {
      console.error('Error fetching program:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Separate function to fetch workout details without blocking the UI
  const fetchWorkoutDetails = async (workoutsToUpdate: Workout[]) => {
    try {
      const updatedWorkouts = [...workoutsToUpdate];
      
      // Only process a limited number of workouts at once to avoid overwhelming the API
      const MAX_WORKOUTS_TO_PROCESS = 5;
      const workoutsToProcess = updatedWorkouts.slice(0, MAX_WORKOUTS_TO_PROCESS);
      
      // Process each workout sequentially to avoid overwhelming the API
      for (let i = 0; i < workoutsToProcess.length; i++) {
        const workout = workoutsToProcess[i];
        
        if (!isMounted) return; // Exit if component unmounted

        // Add a small delay between API calls to prevent rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        try {
          console.log(`Fetching details for workout: ${workout.name}`);
          
          // Get exercise count - use a simplified approach first
          let exerciseCount = 0;
          let exerciseIds: any[] = [];
          
          try {
            const { count, error } = await supabase
              .from('template_exercises')
              .select('*', { count: 'exact', head: true })
              .eq('template_id', workout.template_id);
              
            if (!error) {
              exerciseCount = count || 0;
              
              // Only fetch IDs if we have exercises
              if (exerciseCount > 0) {
                const { data, error: idsError } = await supabase
                  .from('template_exercises')
                  .select('id')
                  .eq('template_id', workout.template_id);
                  
                if (!idsError && data) {
                  exerciseIds = data;
                }
              }
            }
          } catch (err) {
            console.error(`Error fetching exercise count for ${workout.name}:`, err);
            exerciseCount = 0;
          }
            
          let setCount = 0;
          
          if (exerciseIds && exerciseIds.length > 0) {
            try {
              const ids = exerciseIds.map(ex => ex.id);
              const { count } = await supabase
                .from('template_exercise_sets')
                .select('*', { count: 'exact', head: true })
                .in('template_exercise_id', ids);
                
              setCount = count || 0;
            } catch (err) {
              console.error(`Error fetching set count for ${workout.name}:`, err);
            }
          }

          // Update the workout with the counts
          updatedWorkouts[i] = {
            ...workout,
            exercise_count: exerciseCount || 0,
            set_count: setCount
          };
          
          console.log(`Updated details for ${workout.name}: ${exerciseCount} exercises, ${setCount} sets`);
        } catch (err) {
          console.error(`Error fetching details for workout ${workout.name}:`, err);
          // Continue with the next workout rather than failing the entire operation
        }
      }

      if (isMounted) {
        setWorkouts(updatedWorkouts);
      }
    } catch (err) {
      console.error('Error updating workout details:', err);
      // Don't set error state - just log the error since this is a background update
    }
  };

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        setError('Program name is required');
        return;
      }

      setLoading(true);
      setError(null);

      // Update program details
      const { error: programError } = await supabase
        .from('programs')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (programError) throw programError;

      // Update workout order
      for (let i = 0; i < workouts.length; i++) {
        const { error: workoutError } = await supabase
          .from('program_workouts')
          .update({ order: i })
          .eq('id', workouts[i].id)
          .eq('program_id', id);

        if (workoutError) throw workoutError;
      }

      Alert.alert('Success', 'Program updated successfully');
      router.back();
    } catch (err) {
      console.error('Error saving program:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('program_workouts')
        .delete()
        .eq('id', workoutId)
        .eq('program_id', id);

      if (deleteError) throw deleteError;

      // Update local state after successful deletion
      setWorkouts(prev => prev.filter(w => w.id !== workoutId));
    } catch (err) {
      console.error('Error deleting workout:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutSelection = async (selectedWorkouts: any[]) => {
    try {
      setLoading(true);
      setError(null);

      // The selectedWorkouts will have the original template IDs
      const workoutsToAdd = selectedWorkouts.map((workout, index) => ({
        program_id: id,
        template_id: workout.id, // This is the original workout template ID
        name: workout.name,
        description: workout.description,
        muscles: workout.muscles || [],
        estimated_duration: workout.estimated_duration || '0 min',
        order: workouts.length + index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data: addedWorkouts, error: addError } = await supabase
        .from('program_workouts')
        .insert(workoutsToAdd)
        .select();

      if (addError) throw addError;

      // After adding to database, update local state
      // Include both original data and template_id
      if (addedWorkouts) {
        const newWorkouts = addedWorkouts.map((workout, index) => {
          const originalWorkout = selectedWorkouts[index];
          return {
            id: workout.id,
            name: workout.name,
            description: workout.description,
            muscles: workout.muscles || [],
            estimated_duration: workout.estimated_duration || '0 min',
            exercise_count: originalWorkout.exercise_count || 0,
            set_count: originalWorkout.set_count || 0,
            template_id: workout.template_id
          };
        });

        setWorkouts(prev => [...prev, ...newWorkouts]);
      }
      
      setShowWorkoutSelection(false);
    } catch (err) {
      console.error('Error adding workouts:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutInfo = (workout: Workout) => {
    // Navigate to workout details using template_id instead of workout.id
    if (workout.template_id) {
      router.push(`/modals/workouts/${workout.template_id}`);
    } else {
      console.warn(`No template_id found for workout: ${workout.name}`);
    }
  };

  const handleWorkoutReorder = (newOrder: Workout[]) => {
    console.log('Reordering workouts', newOrder.length);
    setWorkouts(newOrder);
  };

  if (loading && workouts.length === 0 && !initialDataFetched) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading program...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <ArrowLeft size={24} color="#5eead4" />
        </Pressable>
        <View style={styles.titleContainer}>
          <TextInput
            style={[styles.titleInput, Platform.OS === 'web' && styles.titleInputWeb]}
            placeholder="Program name"
            placeholderTextColor="#5eead4"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.descriptionInput, Platform.OS === 'web' && styles.descriptionInputWeb]}
            placeholder="Description"
            placeholderTextColor="#5eead4"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsPanel}>
          <View style={styles.toggleContainer}>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#115e59', true: '#0d9488' }}
              thumbColor={isActive ? '#14b8a6' : '#5eead4'}
              style={styles.switch}
            />
            <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
              Active
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>workouts</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>sets</Text>
          </View>
        </View>

        <Pressable 
          onPress={() => setShowMetrics(true)}
          style={styles.infoButton}
          hitSlop={8}
        >
          <Info size={20} color="#5eead4" />
        </Pressable>
      </View>

      <ProgramContent 
        workouts={workouts}
        onWorkoutDelete={handleDeleteWorkout}
        onWorkoutInfo={handleWorkoutInfo}
        onWorkoutPress={(templateId) => router.push(`/modals/workouts/${templateId}`)}
        onAddWorkout={() => setShowWorkoutSelection(true)}
        onReorderWorkouts={handleWorkoutReorder}
        loading={loading && !initialDataFetched}
        error={error}
      />

      {error && (
        <Animated.View 
          style={styles.errorMessage}
          entering={FadeIn.duration(200)}
        >
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}

      {workouts.length > 0 && (
        <View style={styles.bottomButtonContainer}>
          <Pressable 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
            <ChevronRight size={20} color="#021a19" />
          </Pressable>
        </View>
      )}

      <ProgramMetricsModal
        visible={showMetrics}
        onClose={() => setShowMetrics(false)}
        metrics={{
          workouts: totalWorkouts,
          sets: totalSets,
          duration: estimatedDuration
        }}
      />

      <WorkoutSelectionModal
        visible={showWorkoutSelection}
        onClose={() => setShowWorkoutSelection(false)}
        onSelect={handleWorkoutSelection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#021a19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#5eead4',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 40 : 24,
    backgroundColor: '#021a19',
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  backButton: {
    marginRight: 16,
    marginTop: 4,
  },
  titleContainer: {
    flex: 1,
  },
  titleInput: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    marginBottom: 8,
    backgroundColor: '#115e59',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0d9488',
    padding: 8,
    height: 40,
  },
  titleInputWeb: {
    outlineStyle: 'none',
  },
  descriptionInput: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ccfbf1',
    minHeight: 40,
    backgroundColor: '#115e59',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0d9488',
    padding: 8,
  },
  descriptionInputWeb: {
    outlineStyle: 'none',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 4,
  },
  statsPanel: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0d3d56',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingHorizontal: 4,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    opacity: 0.3,
  },
  toggleTextActive: {
    opacity: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#115e59',
    marginHorizontal: 0,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorMessage: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 160 : 140,
    left: 16,
    right: 16,
    backgroundColor: '#450a0a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  bottomButtonContainer: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minHeight: 56,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 12,
      },
    }),
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#021a19',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
});