import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Platform, ActivityIndicator, Switch, Alert, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Info, Plus, ChevronRight } from 'lucide-react-native';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Animated, { FadeIn } from 'react-native-reanimated';
import ProgramMetricsModal from '@/components/ProgramMetricsModal';
import WorkoutSelectionModal from '@/components/WorkoutSelectionModal';
import DraggableWorkoutCard from '@/components/DraggableWorkoutCard';
import ActiveProgramModal from '@/components/ActiveProgramModal';
import { useProgramStore } from '@/lib/store/programStore';
import { formatDuration, parseDurationToMinutes } from '@/lib/utils/formatDuration';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FORM_STATE_PROGRAM_NEW_KEY = 'formState_program_new';

type SavedProgramFormState = {
  name: string;
  description: string;
  isActive: boolean;
  workouts: SelectedWorkout[];
  timestamp: number; // To potentially expire old saves
};

// Define the structure for muscle counts
type MuscleCount = {
  muscle: string;
  setCount: number;
}

// Use the imported ModalWorkout type directly if SelectedWorkout becomes identical
// Update: Let's define SelectedWorkout explicitly to include musclesWithCounts
type SelectedWorkout = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  musclesWithCounts: MuscleCount[]; 
  estimated_duration: string;
  exercise_count: number;
  set_count: number;
  template_id?: string;
};

export default function NewProgramScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showWorkoutSelection, setShowWorkoutSelection] = useState(false);
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [previousProgram, setPreviousProgram] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [workouts, setWorkouts] = useState<SelectedWorkout[]>([]);
  const [shouldCheckActive, setShouldCheckActive] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { setNeedsRefresh, getActiveProgram } = useProgramStore();
  
  // Get safe area insets
  const insets = useSafeAreaInsets();
  const appState = useRef(AppState.currentState);
  const [isRestoring, setIsRestoring] = useState(true); // To prevent saving while restoring

  // Function to save current form state
  const saveCurrentFormState = async () => {
    if (isRestoring) {
      // console.log('[NewProgramScreen] Skipping save, still restoring or initial load.');
      return;
    }
    try {
      const formState: SavedProgramFormState = {
        name,
        description,
        isActive,
        workouts,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(FORM_STATE_PROGRAM_NEW_KEY, JSON.stringify(formState));
      // console.log('[NewProgramScreen] Form state saved to AsyncStorage.');
    } catch (e) {
      console.error('[NewProgramScreen] Failed to save form state:', e);
    }
  };

  // Effect for AppState changes (backgrounding)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground, restoration logic is handled on mount
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background
        // console.log('[NewProgramScreen] App going to background, attempting to save form state.');
        saveCurrentFormState();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [name, description, isActive, workouts, isRestoring]); // Dependencies ensure saveCurrentFormState has fresh data

  // Effect for restoring form state on mount
  useEffect(() => {
    const tryRestoreFormState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem(FORM_STATE_PROGRAM_NEW_KEY);
        if (savedStateString) {
          const savedState: SavedProgramFormState = JSON.parse(savedStateString);
          // Optional: Check timestamp to see if the save is too old, e.g., > 24 hours
          // const oneDay = 24 * 60 * 60 * 1000;
          // if (Date.now() - savedState.timestamp > oneDay) {
          //   // console.log('[NewProgramScreen] Saved state is too old, discarding.');
          //   await AsyncStorage.removeItem(FORM_STATE_PROGRAM_NEW_KEY);
          //   setIsRestoring(false);
          //   return;
          // }
          
          Alert.alert(
            "Unsaved Changes",
            "You have unsaved changes for this new program. Would you like to restore them?",
            [
              {
                text: "No",
                onPress: async () => {
                  await AsyncStorage.removeItem(FORM_STATE_PROGRAM_NEW_KEY);
                  // console.log('[NewProgramScreen] User declined to restore. Saved state cleared.');
                  setIsRestoring(false);
                },
                style: "cancel"
              },
              {
                text: "Yes",
                onPress: async () => {
                  setName(savedState.name);
                  setDescription(savedState.description);
                  setIsActive(savedState.isActive);
                  setWorkouts(savedState.workouts || []); // Ensure workouts is not undefined
                  await AsyncStorage.removeItem(FORM_STATE_PROGRAM_NEW_KEY);
                  // console.log('[NewProgramScreen] Form state restored. Saved state cleared.');
                  setIsRestoring(false);
                }
              }
            ],
            { cancelable: false }
          );
        } else {
          setIsRestoring(false); // No saved state
        }
      } catch (e) {
        console.error('[NewProgramScreen] Failed to restore form state:', e);
        setIsRestoring(false);
      }
    };

    tryRestoreFormState();
  }, []);

  // Handle active toggle changes
  const handleActiveToggle = (value: boolean) => {
    setIsActive(value);
    // Only flag for check if toggling to active
    if (value) {
      setShouldCheckActive(true);
    }
  };

  const checkActiveStatus = async () => {
    // Only check if trying to activate
    if (isActive) {
      // Check if another program is already active
      const activeProgram = await getActiveProgram();
      if (activeProgram) {
        setPreviousProgram(activeProgram);
        setShowActiveModal(true);
        return false; // Indicate check is in progress
      }
    }
    return true; // Proceed with save
  };

  const totalWorkouts = workouts.length;
  const totalSets = workouts.reduce((acc, workout) => acc + (workout.set_count || 0), 0);
  const totalMinutes = workouts.reduce((acc, workout) => {
    return acc + parseDurationToMinutes(workout.estimated_duration);
  }, 0);
  const formattedDuration = formatDuration(totalMinutes);

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        setError('Program name is required');
        return;
      }

      if (workouts.length === 0) {
        setError('Add at least one workout to the program');
        return;
      }

      // If we need to check active status and it's pending user confirmation
      if (shouldCheckActive) {
        const canProceed = await checkActiveStatus();
        setShouldCheckActive(false);
        if (!canProceed) {
          return; // Wait for user confirmation in the modal
        }
      }

      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create program
      const { data: program, error: programError } = await supabase
        .from('programs')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          weekly_workouts: workouts.length,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (programError) throw programError;

      // If this program is set as active and there's a previous active program,
      // we need to update the active states
      if (isActive && previousProgram) {
        // Deactivate the previous active program
        const { error: deactivateError } = await supabase
          .from('programs')
          .update({ is_active: false })
          .eq('id', previousProgram.id);

        if (deactivateError) throw deactivateError;
      }

      // Add workouts to program using the state `workouts` list to preserve order
      const workoutsToAdd = workouts.map((workout: SelectedWorkout, index: number) => ({
        program_id: program.id,
        template_id: workout.template_id || workout.id,
        name: workout.name,
        description: workout.description,
        muscles: workout.muscles,
        estimated_duration: workout.estimated_duration,
        order: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: workoutsError } = await supabase
        .from('program_workouts')
        .insert(workoutsToAdd);

      if (workoutsError) {
        // Cleanup program if workout insertion fails
        await supabase
          .from('programs')
          .delete()
          .eq('id', program.id);
        throw workoutsError;
      }

      // Notify that program store needs refresh
      setNeedsRefresh(true);
      
      // Clear any saved form state on successful save
      try {
        await AsyncStorage.removeItem(FORM_STATE_PROGRAM_NEW_KEY);
        // console.log('[NewProgramScreen] Form state cleared from AsyncStorage after successful save.');
        await AsyncStorage.setItem('lastKnownRouteOverride', '/(tabs)/'); // Définir l'override
        // console.log('[NewProgramScreen] lastKnownRouteOverride set to /(tabs)/ after successful save.');
      } catch (e) {
        console.error('[NewProgramScreen] Failed to clear form state or set lastKnownRouteOverride after save:', e);
      }
      
      // Show success message and redirect
      setSaveSuccess(true);
      setTimeout(() => {
        router.back();
      }, 1500);

    } catch (err: any) {
      console.error('Error saving program:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeWorkout = (workoutId: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== workoutId));
  };

  const handleWorkoutSelection = async (selectedTemplates: SelectedWorkout[]) => {
    setShowWorkoutSelection(false);
    setLoading(true);
    try {
      const detailedWorkouts = await Promise.all(selectedTemplates.map(async (template): Promise<SelectedWorkout | null> => {
        // Fetch details: exercises, sets, muscles
        const { data: templateExercises, error: templateExercisesError } = await supabase
          .from('template_exercises')
          .select('id, exercise_id')
          .eq('template_id', template.id);

        if (templateExercisesError) {
          console.error('Error fetching template exercises:', templateExercisesError);
          return null;
        }
        if (!templateExercises || templateExercises.length === 0) {
          // Return a basic structure if no exercises found
          return {
            id: template.id,
            name: template.name,
            description: template.description,
            muscles: [],
            musclesWithCounts: [],
            estimated_duration: template.estimated_duration || '0 min',
            exercise_count: 0,
            set_count: 0,
          };
        }

        const exerciseCount = templateExercises.length;
        const exerciseIds = templateExercises.map(ex => ex.exercise_id);
        const templateExerciseIds = templateExercises.map(ex => ex.id);

        const { data: exercisesData, error: exercisesError } = await supabase
          .from('exercises')
          .select('id, muscle_primary')
          .in('id', exerciseIds);

        if (exercisesError) {
          console.error('Error fetching exercises data:', exercisesError);
          return null;
        }
        const exerciseMuscleMap = new Map(exercisesData?.map(ex => [ex.id, ex.muscle_primary || []]));

        const { data: setsData, error: setsError } = await supabase
          .from('template_exercise_sets')
          .select('template_exercise_id, id')
          .in('template_exercise_id', templateExerciseIds);

        if (setsError) {
          console.error('Error fetching sets data:', setsError);
          return null;
        }
        let totalSetCount = 0;
        const muscleSetCounts: { [key: string]: number } = {};

        for (const te of templateExercises) {
          const setsForThisExercise = setsData?.filter(s => s.template_exercise_id === te.id).length || 0;
          totalSetCount += setsForThisExercise;
          const primaryMuscles = exerciseMuscleMap.get(te.exercise_id) || [];
          for (const muscle of primaryMuscles) {
            muscleSetCounts[muscle] = (muscleSetCounts[muscle] || 0) + setsForThisExercise;
          }
        }

        const sortedMuscles: MuscleCount[] = Object.entries(muscleSetCounts)
          .map(([muscle, setCount]) => ({ muscle, setCount }))
          .sort((a, b) => b.setCount - a.setCount);

        // Return the fully detailed workout info matching SelectedWorkout type
        return {
          id: template.id, // template_id
          name: template.name,
          description: template.description,
          muscles: Object.keys(muscleSetCounts), // Basic list
          musclesWithCounts: sortedMuscles, // Sorted list with counts
          estimated_duration: template.estimated_duration || '0 min',
          exercise_count: exerciseCount,
          set_count: totalSetCount, 
        };
      }));

      // Filter out nulls and use the fully detailed workouts
      const validDetailedWorkouts = detailedWorkouts.filter(w => w !== null) as SelectedWorkout[];
      setWorkouts(prev => [...prev, ...validDetailedWorkouts]);

    } catch (err: any) {
      console.error('Error processing selected workouts:', err);
      setError('Failed to add selected workouts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutInfo = (workout: SelectedWorkout) => {
    // Instead of directly pushing to workout details, just show alert
    // as navigating to another modal while in a modal is the issue
    Alert.alert(
      workout.name,
      `${workout.description || 'No description'}\n\nExercises: ${workout.exercise_count || 0}\nEstimated duration: ${workout.estimated_duration}`
    );
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setTimeout(() => {
      setWorkouts(prev => {
        const newArr = [...prev];
        [newArr[index-1], newArr[index]] = [newArr[index], newArr[index-1]];
        return newArr;
      });
    }, 0);
  };

  const handleMoveDown = (index: number) => {
    if (index >= workouts.length - 1) return;
    setTimeout(() => {
      setWorkouts(prev => {
        const newArr = [...prev];
        [newArr[index], newArr[index+1]] = [newArr[index+1], newArr[index]];
        return newArr;
      });
    }, 0);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 24 }]}>
        <Pressable 
          onPress={async () => {
            // console.log('[NewProgramScreen] Back button pressed. Clearing form state and setting lastKnownRouteOverride.');
            await AsyncStorage.removeItem(FORM_STATE_PROGRAM_NEW_KEY);
            await AsyncStorage.setItem('lastKnownRouteOverride', '/(tabs)/'); // Définir l'override
            router.back();
          }}
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
              onValueChange={handleActiveToggle}
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

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formattedDuration}</Text>
            <Text style={styles.statLabel}>duration</Text>
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
              onPress={() => setShowWorkoutSelection(true)}
            >
              <Plus size={20} color="#ccfbf1" />
              <Text style={styles.addWorkoutText}>Add Workout</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {workouts.map((workout: SelectedWorkout, index: number) => (
              <DraggableWorkoutCard
                key={workout.id}
                workout={workout}
                index={index}
                totalWorkouts={workouts.length}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onRemove={() => removeWorkout(workout.id)}
                onPress={() => router.push(`/modals/workouts/${workout.template_id}`)}
                onInfo={() => handleWorkoutInfo(workout)}
              />
            ))}
            <Pressable 
              style={styles.addWorkoutButton}
              onPress={() => setShowWorkoutSelection(true)}
            >
              <Plus size={20} color="#ccfbf1" />
              <Text style={styles.addWorkoutText}>Add Workout</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {error && (
        <Animated.View 
          style={styles.errorMessage}
          entering={FadeIn.duration(200)}
        >
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}

      {saveSuccess && (
        <Animated.View 
          style={styles.successMessage}
          entering={FadeIn.duration(200)}
        >
          <Text style={styles.successText}>Program saved successfully!</Text>
        </Animated.View>
      )}

      {workouts.length > 0 && (
        <View style={styles.bottomButtonContainer}>
          <Pressable 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#021a19" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save Program</Text>
                <ChevronRight size={20} color="#021a19" />
              </>
            )}
          </Pressable>
        </View>
      )}

      <ProgramMetricsModal
        visible={showMetrics}
        onClose={() => setShowMetrics(false)}
        metrics={{
          workouts: totalWorkouts,
          sets: totalSets,
          duration: formattedDuration
        }}
      />

      <WorkoutSelectionModal
        visible={showWorkoutSelection}
        onClose={() => setShowWorkoutSelection(false)}
        onSelect={handleWorkoutSelection}
      />

      <ActiveProgramModal
        visible={showActiveModal}
        onClose={() => {
          setShowActiveModal(false);
          setIsActive(false);
        }}
        onConfirm={() => {
          setShowActiveModal(false);
          // Continue with the save operation - the active status stays true
          handleSave();
        }}
        previousProgramName={previousProgram?.name || ''}
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
    padding: 24,
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
    paddingHorizontal: 4,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    marginBottom: 0,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    opacity: 1,
  },
  toggleTextActive: {
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
    marginBottom: 4,
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
  errorMessage: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 160 : 140,
    left: 16,
    right: 16,
    backgroundColor: '#450a0a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  successMessage: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 160 : 140,
    left: 16,
    right: 16,
    backgroundColor: '#065f46',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  successText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
});