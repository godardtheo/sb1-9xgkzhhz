import { View, Text, StyleSheet, TextInput, Pressable, Platform, ScrollView, Alert, Switch, LayoutChangeEvent, AppState } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Info, Plus, ChevronRight } from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import DraggableWorkoutCard from '@/components/DraggableWorkoutCard';
import Animated, { FadeIn } from 'react-native-reanimated';
import WorkoutSelectionModal from '@/components/WorkoutSelectionModal';
import ProgramMetricsModal from '@/components/ProgramMetricsModal';
import ActiveProgramModal from '@/components/ActiveProgramModal';
import DeleteProgramModal from '@/components/DeleteProgramModal';
import { useProgramStore } from '@/lib/store/programStore';
import { formatDuration, parseDurationToMinutes } from '@/lib/utils/formatDuration';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Key will be dynamic: `formState_program_edit_${id}`
const FORM_STATE_PROGRAM_EDIT_KEY_PREFIX = 'formState_program_edit_';

type SavedProgramEditState = {
  name: string;
  description: string;
  isActive: boolean;
  workouts: ProgramWorkout[]; // Using ProgramWorkout type as defined in this file
  timestamp: number;
};

// Define the structure for muscle counts
type MuscleCount = {
  muscle: string;
  setCount: number;
  template_id?: string; // Adding temporarily to satisfy linter
};

// Renommer pour éviter conflit potentiel
type ProgramWorkout = {
  id: string;             // program_workout id
  name: string;
  description: string | null;
  muscles: string[];      
  musclesWithCounts: MuscleCount[]; // Assurer que ce champ est présent
  estimated_duration: string;
  exercise_count: number;
  set_count: number; 
  template_id: string;    // Assurer que ce champ est présent
};

export default function EditProgramScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const programId = typeof id === 'string' ? id : undefined;
  const FORM_STATE_KEY = programId ? `${FORM_STATE_PROGRAM_EDIT_KEY_PREFIX}${programId}` : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<ProgramWorkout[]>([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showWorkoutSelection, setShowWorkoutSelection] = useState(false);
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previousProgram, setPreviousProgram] = useState<{ id: string; name: string } | null>(null);
  const [shouldCheckActive, setShouldCheckActive] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { setNeedsRefresh, getActiveProgram } = useProgramStore();
  const workoutRefs = useRef<Map<string, { animateMove: (direction: -1 | 1, distance: number) => void }>>(new Map());
  const [itemHeights, setItemHeights] = useState<number[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  
  // Get safe area insets
  const insets = useSafeAreaInsets();
  const appStateRef = useRef(AppState.currentState);
  const [isRestoring, setIsRestoring] = useState(true); // To prevent saving while restoring/initial fetch
  const [initialFetchComplete, setInitialFetchComplete] = useState(false);

  // Fonction locale pour mettre à jour le state local itemHeights
  const updateLocalItemHeight = (index: number, height: number) => {
    setItemHeights(prev => {
      const newHeights = [...prev];
      // S'assurer que le tableau est assez grand
      while (newHeights.length <= index) {
        newHeights.push(0);
      }
      newHeights[index] = height;
      return newHeights;
    });
  };

  // Function to save current form state
  const saveCurrentFormState = async () => {
    if (isRestoring || !initialFetchComplete) {
      return;
    }
    if (!FORM_STATE_KEY) {
      return;
    }
    try {
      const formState: SavedProgramEditState = {
        name,
        description,
        isActive,
        workouts,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(FORM_STATE_KEY, JSON.stringify(formState));
    } catch (e) {
      console.error(`[EditProgramScreen ${programId}] Failed to save form state:`, e);
    }
  };

  // Effect for AppState changes (backgrounding)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
      } else if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        saveCurrentFormState();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  // Add all form state variables as dependencies to ensure saveCurrentFormState has fresh data
  }, [name, description, isActive, workouts, isRestoring, initialFetchComplete, programId, FORM_STATE_KEY]);

  // Effect for fetching initial details AND then trying to restore form state
  useEffect(() => {
    const loadAndTryRestore = async () => {
      if (programId) {
        setIsRestoring(true); // Start with restoring true
        setInitialFetchComplete(false);
        await fetchProgramDetails(); // This sets initial form state from DB
        setInitialFetchComplete(true);

        // Now try to restore from AsyncStorage
        if (!FORM_STATE_KEY) {
            setIsRestoring(false);
            return;
        }
        try {
          const savedStateString = await AsyncStorage.getItem(FORM_STATE_KEY);
          if (savedStateString) {
            const savedState: SavedProgramEditState = JSON.parse(savedStateString);
            Alert.alert(
              "Unsaved Changes",
              "You have unsaved changes for this program. Would you like to restore them?",
              [
                {
                  text: "No",
                  onPress: async () => {
                    await AsyncStorage.removeItem(FORM_STATE_KEY);
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
                    setWorkouts(savedState.workouts || []);
                    await AsyncStorage.removeItem(FORM_STATE_KEY);
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
          console.error(`[EditProgramScreen ${programId}] Failed to restore form state:`, e);
          setIsRestoring(false);
        }
      } else {
        setIsRestoring(false); // No programId
        setInitialFetchComplete(true); // No fetch to complete
      }
    };

    loadAndTryRestore();
  }, [programId]); // programId is the main dependency here; FORM_STATE_KEY is derived

  useEffect(() => {
    if (id) {
      fetchProgramDetails();
    }
  }, [id]);

  const totalWorkouts = workouts.length;
  const totalSets = workouts.reduce((acc, workout) => acc + (workout.set_count || 0), 0);
  const totalMinutes = workouts.reduce((acc, workout) => {
    return acc + parseDurationToMinutes(workout.estimated_duration);
  }, 0);
  const formattedDuration = formatDuration(totalMinutes);

  // Check if there's an active program on toggle
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
      if (activeProgram && activeProgram.id !== id) {
        setPreviousProgram(activeProgram);
        setShowActiveModal(true);
        return false; // Indicate check is in progress
      }
    }
    return true; // Proceed with save
  };

  const fetchProgramDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      // Ensure programId is valid before proceeding
      if (!programId) {
        setError("Program ID is missing.");
        setLoading(false);
        setInitialFetchComplete(true); // Mark as complete even if error
        setIsRestoring(false); // Stop restoring process
        return;
      }

      // Fetch program basic info
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', id)
        .single();

      if (programError) throw programError;

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
        setWorkouts([]);
        setLoading(false);
        setInitialFetchComplete(true); // Mark as complete even if no workouts
        setIsRestoring(false); // Stop restoring process
        return;
      }

      // Process each workout to get counts AND calculate sets per muscle
      const processedWorkouts = await Promise.all(programWorkoutsData.map(async (workout) => {
        console.log(`Processing workout: ${workout.name}, template_id: ${workout.template_id}`);

        // Get template exercises with their exercise_id
        const { data: templateExercises, error: templateExercisesError } = await supabase
          .from('template_exercises')
          .select('id, exercise_id')
          .eq('template_id', workout.template_id);

        if (templateExercisesError) {
          console.error('Error fetching template exercises:', templateExercisesError);
          return null; // Or handle error appropriately
        }
        if (!templateExercises || templateExercises.length === 0) {
          return {
            id: workout.id,
            name: workout.name,
            description: workout.description,
            muscles: [],
            musclesWithCounts: [],
            estimated_duration: workout.estimated_duration || '0 min',
            exercise_count: 0,
            set_count: 0,
            template_id: workout.template_id
          };
        }

        const exerciseCount = templateExercises.length;
        const exerciseIds = templateExercises.map(ex => ex.exercise_id);
        const templateExerciseIds = templateExercises.map(ex => ex.id);

        // 1. Fetch primary muscles for all exercises in this workout template
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('exercises')
          .select('id, muscle_primary')
          .in('id', exerciseIds);

        if (exercisesError) {
          console.error('Error fetching exercises data:', exercisesError);
          return null; // Or handle error
        }
        const exerciseMuscleMap = new Map(exercisesData?.map(ex => [ex.id, ex.muscle_primary || []]));

        // 2. Fetch set counts for all template_exercises
        const { data: setsData, error: setsError } = await supabase
          .from('template_exercise_sets')
          .select('template_exercise_id, id') // Count rows per template_exercise_id
          .in('template_exercise_id', templateExerciseIds);

        if (setsError) {
          console.error('Error fetching sets data:', setsError);
          return null; // Or handle error
        }

        // Calculate total sets and sets per muscle
        let totalSetCount = 0;
        const muscleSetCounts: { [key: string]: number } = {};

        for (const te of templateExercises) {
          // Count sets for this specific template_exercise
          const setsForThisExercise = setsData?.filter(s => s.template_exercise_id === te.id).length || 0;
          totalSetCount += setsForThisExercise;

          // Get primary muscles for the linked exercise
          const primaryMuscles = exerciseMuscleMap.get(te.exercise_id) || [];

          // Add set count to each primary muscle
          for (const muscle of primaryMuscles) {
            muscleSetCounts[muscle] = (muscleSetCounts[muscle] || 0) + setsForThisExercise;
          }
        }

        // Convert muscleSetCounts map to array and sort
        const sortedMuscles: MuscleCount[] = Object.entries(muscleSetCounts)
          .map(([muscle, setCount]) => ({ muscle, setCount }))
          .sort((a, b) => b.setCount - a.setCount);

        console.log(`Workout ${workout.name}: ${exerciseCount} exercises, ${totalSetCount} sets`);
        console.log('Sorted Muscles:', sortedMuscles);

        return {
          id: workout.id, // program_workout id
          name: workout.name,
          description: workout.description,
          muscles: Object.keys(muscleSetCounts), // Keep simple list if needed elsewhere
          musclesWithCounts: sortedMuscles, // Pass the sorted list with counts
          estimated_duration: workout.estimated_duration || '0 min',
          exercise_count: exerciseCount,
          set_count: totalSetCount, // Use calculated total set count
          template_id: workout.template_id
        };
      }));

      // Filter out any null results from errors during processing
      const validProcessedWorkouts = processedWorkouts.filter(w => w !== null) as ProgramWorkout[];
      setWorkouts(validProcessedWorkouts);
    } catch (err: any) {
      console.error('Error fetching program:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setInitialFetchComplete(true); // Mark as complete even if error
      setIsRestoring(false); // Stop restoring process
    }
  };

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        setError('Program name is required');
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

      // Update program details
      const { error: programError } = await supabase
        .from('programs')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          is_active: isActive,
          weekly_workouts: workouts.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (programError) throw programError;

      // If this program is set as active and there's a previous active program,
      // we need to update the active states
      if (isActive && previousProgram && previousProgram.id !== id) {
        // Deactivate the previous active program
        const { error: deactivateError } = await supabase
          .from('programs')
          .update({ is_active: false })
          .eq('id', previousProgram.id);

        if (deactivateError) throw deactivateError;
      }

      // Update workout order
      for (let i = 0; i < workouts.length; i++) {
        const workout = workouts[i];
        const { error: workoutError } = await supabase
          .from('program_workouts')
          .update({ order: i })
          .eq('id', workout.id)
          .eq('program_id', id);

        if (workoutError) throw workoutError;
      }

      // Notify that program store needs refresh
      setNeedsRefresh(true);
      
      // Clear any saved form state on successful save
      if (FORM_STATE_KEY) {
        try {
          await AsyncStorage.removeItem(FORM_STATE_KEY);
          await AsyncStorage.setItem('lastKnownRouteOverride', '/(tabs)/'); // Définir l'override
        } catch (e) {
          console.error(`[EditProgramScreen ${programId}] Failed to clear form state or set lastKnownRouteOverride after save:`, e);
        }
      }
      
      Alert.alert('Success', 'Program updated successfully');
      router.back();
    } catch (err: any) {
      console.error('Error saving program:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!programId) {
        setError("Program ID is missing for delete.");
        setLoading(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setNeedsRefresh(true);
      // Clear any saved form state on successful delete
      if (FORM_STATE_KEY) {
        try {
          await AsyncStorage.removeItem(FORM_STATE_KEY);
          await AsyncStorage.setItem('lastKnownRouteOverride', '/(tabs)/'); // Définir l'override
        } catch (e) {
          console.error(`[EditProgramScreen ${programId}] Failed to clear form state or set lastKnownRouteOverride after delete:`, e);
        }
      }
      router.back();
    } catch (err: any) {
      console.error('Error deleting program:', err);
      setError(err.message);
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
    } catch (err: any) {
      console.error('Error deleting workout:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutSelection = async (selectedWorkoutTemplates: any[]) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch detailed info including primary muscles for each selected template
      const detailedWorkouts = await Promise.all(selectedWorkoutTemplates.map(async (template) => {
        const { data: templateExercises, error: templateExercisesError } = await supabase
          .from('template_exercises')
          .select('id, exercise_id')
          .eq('template_id', template.id);

        if (templateExercisesError) throw templateExercisesError;

        const exerciseIds = templateExercises?.map(ex => ex.exercise_id) || [];
        let primaryMuscles: string[] = [];
        let setCount = 0;
        const exerciseCount = templateExercises?.length || 0;

        if (exerciseIds.length > 0) {
          const { data: muscleData, error: muscleError } = await supabase
            .from('exercises')
            .select('muscle_primary')
            .in('id', exerciseIds);

          if (!muscleError && muscleData) {
            const allMuscles = muscleData.flatMap(m => m.muscle_primary || []);
            primaryMuscles = [...new Set(allMuscles)];
          } else {
            console.error('Error fetching primary muscles for new workout:', muscleError);
          }

          // Also fetch set count for the newly added workout display
          const templateExerciseIds = templateExercises?.map(ex => ex.id) || [];
          const { count, error: setError } = await supabase
            .from('template_exercise_sets')
            .select('*', { count: 'exact', head: true })
            .in('template_exercise_id', templateExerciseIds);
            
          if (!setError) {
            setCount = count || 0;
          } else {
            console.error('Error fetching set count for new workout:', setError);
          }
        }

        return {
          ...template, // Keep original template data like name, description, duration
          muscles: primaryMuscles, // Add aggregated muscles
          exercise_count: exerciseCount,
          set_count: setCount,
        };
      }));

      // The selectedWorkouts will have the original template IDs and fetched muscles
      const workoutsToAdd = detailedWorkouts.map((workout, index) => ({
        program_id: id,
        template_id: workout.id, // This is the original workout template ID
        name: workout.name,
        description: workout.description,
        muscles: workout.muscles, // Pass the fetched muscles
        estimated_duration: workout.estimated_duration || '0 min',
        order: workouts.length + index, // Append to the end
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data: addedProgramWorkouts, error: addError } = await supabase
        .from('program_workouts')
        .insert(workoutsToAdd)
        .select(); // Select the newly inserted rows

      if (addError) throw addError;

      // After adding to database, update local state
      if (addedProgramWorkouts) {
        // Fetch details again for the newly added workouts to get counts/muscles
        const newWorkoutDetails = await Promise.all(addedProgramWorkouts.map(async (pw) => {
          // Simplified fetch logic similar to fetchProgramDetails processing
          const { data: templateExercises } = await supabase
            .from('template_exercises')
            .select('id, exercise_id')
            .eq('template_id', pw.template_id);
          
          if (!templateExercises || templateExercises.length === 0) return null;
          
          const exerciseIds = templateExercises.map(ex => ex.exercise_id);
          const templateExerciseIds = templateExercises.map(ex => ex.id);

          const { data: exercisesData } = await supabase.from('exercises').select('id, muscle_primary').in('id', exerciseIds);
          const exerciseMuscleMap = new Map(exercisesData?.map(ex => [ex.id, ex.muscle_primary || []]));

          const { data: setsData } = await supabase.from('template_exercise_sets').select('template_exercise_id, id').in('template_exercise_id', templateExerciseIds);

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

          return {
            id: pw.id, // Use the new program_workout ID
            name: pw.name,
            description: pw.description,
            muscles: Object.keys(muscleSetCounts),
            musclesWithCounts: sortedMuscles,
            estimated_duration: pw.estimated_duration || '0 min',
            exercise_count: templateExercises.length,
            set_count: totalSetCount,
            template_id: pw.template_id
          };
        }));

        const validNewWorkouts = newWorkoutDetails.filter(w => w !== null) as ProgramWorkout[];
        setWorkouts(prev => [...prev, ...validNewWorkouts]);
      }
      
      setShowWorkoutSelection(false);
    } catch (err: any) {
      console.error('Error adding workouts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutInfo = (workout: ProgramWorkout) => {
    // Instead of navigating to workout details, show info in an alert
    Alert.alert(
      workout.name,
      `${workout.description || 'No description'}\n\nExercises: ${workout.exercise_count}\nSets: ${workout.set_count}\nEstimated duration: ${workout.estimated_duration}`
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

  if (loading && workouts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading program...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 24 }]}>
        <Pressable 
          onPress={async () => {
            if (FORM_STATE_KEY) {
              await AsyncStorage.removeItem(FORM_STATE_KEY);
              await AsyncStorage.setItem('lastKnownRouteOverride', '/(tabs)/'); // Définir l'override
            }
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
        {workouts.map((workout, index) => (
          <DraggableWorkoutCard
            key={workout.id}
            workout={workout}
            index={index}
            totalWorkouts={workouts.length}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onRemove={() => handleDeleteWorkout(workout.id)}
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
      </ScrollView>

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
            style={styles.deleteButton}
            onPress={() => setShowDeleteModal(true)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>

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

      <DeleteProgramModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        loading={loading}
        programName={name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
    // @ts-ignore - Style incompatibility, ignore for now
    ...Platform.select({
      web: {
        cursor: 'default',
        userSelect: 'none',
      },
    }),
  },
  loadingContainer: {
    // @ts-ignore - Style incompatibility, ignore for now
    flex: 1,
    backgroundColor: '#021a19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    // @ts-ignore - Style incompatibility, ignore for now
    color: '#5eead4',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#450a0a',
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
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ef4444',
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