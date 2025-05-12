import { View, Text, StyleSheet, TextInput, Pressable, Platform, ScrollView, Alert, AppState } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Info, Plus, CircleMinus as MinusCircle } from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import ExerciseModal from '@/components/ExerciseModal';
import ExerciseDetailsModal from '@/components/ExerciseDetailsModal';
import DeleteWorkoutModal from '@/components/DeleteWorkoutModal';
import { useWorkoutStore } from '@/lib/store/workoutStore';
import DraggableExerciseCard from '@/components/DraggableExerciseCard';
import { formatDuration } from '@/lib/utils/formatDuration';
import uuid from 'react-native-uuid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FORM_STATE_WORKOUT_EDIT_KEY_PREFIX = 'formState_workout_edit_';

// Using the existing Exercise type for saved state
type SavedWorkoutEditState = {
  name: string;
  description: string;
  exercises: Exercise[]; 
  timestamp: number;
};

// Type for data coming FROM ExerciseModal
type ModalExerciseSelection = {
  id: string;
  name: string;
  // Include other properties known to be returned by ExerciseModal if necessary
  // For now, assume ID and name are sufficient to proceed
};

type Exercise = {
  id: string;
  name: string;
  muscle_primary?: string[];
  muscle_secondary?: string[];
  muscle?: string;
  equipment?: string[];
  instructions?: string;
  video_url?: string;
  type?: string;
  difficulty?: string;
  sets: {
    id: string;
    minReps: string;
    maxReps: string;
  }[];
  totalExercises: number;
};

export default function EditWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const workoutId = typeof id === 'string' ? id : undefined;
  const FORM_STATE_KEY = workoutId ? `${FORM_STATE_WORKOUT_EDIT_KEY_PREFIX}${workoutId}` : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showExerciseDetails, setShowExerciseDetails] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setNeedsRefresh } = useWorkoutStore();
  const scrollRef = useRef<ScrollView>(null);
  
  // Get safe area insets
  const insets = useSafeAreaInsets();
  const appStateRef = useRef(AppState.currentState);
  const [isRestoring, setIsRestoring] = useState(true); // To prevent saving while restoring/initial fetch
  const [initialFetchComplete, setInitialFetchComplete] = useState(false);

  const totalExercises = exercises.length;
  const totalSets = exercises.reduce((acc, exercise) => acc + exercise.sets.length, 0);
  const estimatedDuration = 5 + (exercises.length * 4) + (totalSets * 3);
  const formattedDuration = formatDuration(estimatedDuration);

  // Handler for moving an exercise up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    
    setTimeout(() => {
      setExercises(prev => {
        const newExercises = [...prev];
        const temp = newExercises[index];
        newExercises[index] = newExercises[index-1];
        newExercises[index-1] = temp;
        return newExercises;
      });
    }, 0);
  };

  // Handler for moving an exercise down
  const handleMoveDown = (index: number) => {
    if (index >= exercises.length - 1) return;
    
    setTimeout(() => {
      setExercises(prev => {
        const newExercises = [...prev];
        const temp = newExercises[index];
        newExercises[index] = newExercises[index+1];
        newExercises[index+1] = temp;
        return newExercises;
      });
    }, 0);
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
      const formState: SavedWorkoutEditState = {
        name,
        description,
        exercises,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(FORM_STATE_KEY, JSON.stringify(formState));
    } catch (e) {
      console.error(`[EditWorkoutScreen ${workoutId}] Failed to save form state:`, e);
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
  }, [name, description, exercises, isRestoring, initialFetchComplete, workoutId, FORM_STATE_KEY]);

  // Effect for fetching initial details AND then trying to restore form state
  useEffect(() => {
    const loadAndTryRestore = async () => {
      if (workoutId) {
        setIsRestoring(true);
        setInitialFetchComplete(false);
        await fetchWorkoutDetails(); // This sets initial form state from DB
        setInitialFetchComplete(true);

        if (!FORM_STATE_KEY) {
            setIsRestoring(false);
            return;
        }
        try {
          const savedStateString = await AsyncStorage.getItem(FORM_STATE_KEY);
          if (savedStateString) {
            const savedState: SavedWorkoutEditState = JSON.parse(savedStateString);
            Alert.alert(
              "Unsaved Changes",
              "You have unsaved changes for this workout. Would you like to restore them?",
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
                    setExercises(savedState.exercises || []);
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
          console.error(`[EditWorkoutScreen ${workoutId}] Failed to restore form state:`, e);
          setIsRestoring(false);
        }
      } else {
        setIsRestoring(false);
        setInitialFetchComplete(true);
      }
    };

    loadAndTryRestore();
  }, [workoutId]); // workoutId is the main dependency here

  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      // Ensure workoutId is valid
      if (!workoutId) {
        setError("Workout ID is missing.");
        setLoading(false);
        setInitialFetchComplete(true);
        setIsRestoring(false);
        return;
      }

      // First fetch the template basic info
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (templateError) throw templateError;

      if (template) {
        setName(template.name);
        setDescription(template.description || '');
      }

      // Then fetch exercises with their details and sets
      const { data: exerciseData, error: exercisesError } = await supabase
        .from('template_exercises')
        .select(`
          id,
          exercise_id,
          exercises (
            id,
            name,
            equipment,
            instructions,
            video_url,
            type,
            difficulty,
            muscle_primary,
            muscle_secondary
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

      if (exercisesError) throw exercisesError;

      if (exerciseData) {
        // Explicitly type the exerciseData for clarity
        const formattedExercises = exerciseData.map((item: any) => {
          return {
            id: item.exercises.id,
            name: item.exercises.name,
            equipment: Array.isArray(item.exercises.equipment) && item.exercises.equipment.length > 0 
              ? item.exercises.equipment 
              : [],
            muscle_primary: Array.isArray(item.exercises.muscle_primary) && item.exercises.muscle_primary.length > 0 
              ? item.exercises.muscle_primary 
              : [],
            muscle_secondary: Array.isArray(item.exercises.muscle_secondary) && item.exercises.muscle_secondary.length > 0 
              ? item.exercises.muscle_secondary 
              : [],
            instructions: item.exercises.instructions,
            video_url: item.exercises.video_url,
            type: item.exercises.type,
            difficulty: item.exercises.difficulty,
            sets: item.template_exercise_sets.map((set: any) => ({
              id: set.id,
              minReps: set.min_reps.toString(),
              maxReps: set.max_reps.toString()
            })),
            totalExercises: item.exercises.totalExercises
          };
        });

        setExercises(formattedExercises);
      }
    } catch (err: any) {
      console.error('Error fetching workout:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      // Ensure these are set regardless of success/failure if fetch was attempted
      if (workoutId) {
        setInitialFetchComplete(true);
        setIsRestoring(false); 
      }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Update workout template details
      const { error: templateError } = await supabase
        .from('workout_templates')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          estimated_duration: formattedDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', workoutId);

      if (templateError) throw templateError;

      // 2. Update exercise order
      for (let i = 0; i < exercises.length; i++) {
        const { error: exerciseError } = await supabase
          .from('template_exercises')
          .update({ order: i })
          .eq('template_id', workoutId)
          .eq('exercise_id', exercises[i].id);

        if (exerciseError) throw exerciseError;
      }

      // 3. Update set values for each exercise
      for (const exercise of exercises) {
        // Get the template exercise ID
        const { data: templateExercise, error: templateExerciseError } = await supabase
          .from('template_exercises')
          .select('id')
          .eq('template_id', workoutId)
          .eq('exercise_id', exercise.id)
          .single();

        if (templateExerciseError) throw templateExerciseError;

        // Delete existing sets
        const { error: deleteError } = await supabase
          .from('template_exercise_sets')
          .delete()
          .eq('template_exercise_id', templateExercise.id);

        if (deleteError) throw deleteError;

        // Insert updated sets
        const setsToInsert = exercise.sets.map((set, index) => ({
          template_exercise_id: templateExercise.id,
          min_reps: parseInt(set.minReps),
          max_reps: parseInt(set.maxReps),
          order: index
        }));

        const { error: insertError } = await supabase
          .from('template_exercise_sets')
          .insert(setsToInsert);

        if (insertError) throw insertError;
      }

      setNeedsRefresh(true);
      // Clear any saved form state on successful save
      if (FORM_STATE_KEY) {
        try {
          await AsyncStorage.removeItem(FORM_STATE_KEY);
          await AsyncStorage.setItem('lastKnownRouteOverride', '/(tabs)/'); // Définir l'override
        } catch (e) {
          console.error(`[EditWorkoutScreen ${workoutId}] Failed to clear form state or set lastKnownRouteOverride after save:`, e);
        }
      }
      router.back();
    } catch (err: any) {
      console.error('Error saving workout:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!workoutId) {
        setError("Workout ID is missing for delete.");
        setLoading(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('workout_templates')
        .delete()
        .eq('id', workoutId);

      if (deleteError) throw deleteError;

      setNeedsRefresh(true);
      // Clear any saved form state on successful delete
      if (FORM_STATE_KEY) {
        try {
          await AsyncStorage.removeItem(FORM_STATE_KEY);
          await AsyncStorage.setItem('lastKnownRouteOverride', '/(tabs)/'); // Définir l'override
        } catch (e) {
          console.error(`[EditWorkoutScreen ${workoutId}] Failed to clear form state or set lastKnownRouteOverride after delete:`, e);
        }
      }
      router.back();
    } catch (error: any) {
      console.error('Error deleting workout:', error);
      setError(error.message);
      Alert.alert('Error', 'Failed to delete workout');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleExerciseInfo = (exercise: Exercise) => {
    router.navigate(`/modals/exercise-details/${exercise.id}`);
  };

  const handleAddExercise = async (selectedExercises: ModalExerciseSelection[]) => {
    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw new Error('Authentication error');
      if (!user) throw new Error('Not authenticated');

      for (const selectedExercise of selectedExercises) {
        // Check if already exists using the ID from the selection
        const existingIndex = exercises.findIndex(e => e.id === selectedExercise.id);
        if (existingIndex !== -1) continue; // Skip if already added

        // Fetch full exercise details if needed, or assume we have enough
        // For now, we proceed assuming the ID is enough to link in template_exercises
        // We will refetch the entire list anyway after adding

        // 1. Add exercise to template_exercises
        const { data: templateExercise, error: addError } = await supabase
          .from('template_exercises')
          .insert({
            template_id: workoutId,
            exercise_id: selectedExercise.id, // Use ID from selection
            sets: 4, // Default number of sets
            rest_time: '00:02:00',
            order: exercises.length // Add at the end
          })
          .select()
          .single();

        if (addError) throw addError;

        // 2. Add default sets
        const sets = Array(4).fill(null).map((_, i) => ({
          template_exercise_id: templateExercise.id,
          min_reps: 6,
          max_reps: 12,
          order: i
        }));

        const { error: setsError } = await supabase
          .from('template_exercise_sets')
          .insert(sets);

        if (setsError) throw setsError;
      }

      // 3. Reload workout details to get the updated exercise list
      await fetchWorkoutDetails();
    } catch (error: any) {
      console.error('Error adding exercise:', error);
      setError(error.message);
      Alert.alert('Error', 'Failed to add exercise');
    } finally {
      setLoading(false);
      setShowExerciseModal(false);
    }
  };

  const removeExercise = async (exerciseId: string) => {
    try {
      setLoading(true);

      // Find the template_exercise record for this exercise
      const { data: templateExercise, error: findError } = await supabase
        .from('template_exercises')
        .select('id')
        .eq('template_id', workoutId)
        .eq('exercise_id', exerciseId)
        .single();

      if (findError) throw findError;

      // Delete the exercise from the template
      const { error: deleteError } = await supabase
        .from('template_exercises')
        .delete()
        .eq('id', templateExercise.id);

      if (deleteError) throw deleteError;

      // Update local state
      setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
    } catch (error: any) {
      console.error('Error removing exercise:', error);
      setError(error.message);
      Alert.alert('Error', 'Failed to remove exercise');
    } finally {
      setLoading(false);
    }
  };

  // Nouvelle fonction pour gérer la mise à jour de la valeur pendant la frappe
  const handleRepInputChange = (exerciseId: string, setId: string, type: 'min' | 'max', value: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(set => {
            if (set.id === setId) {
              return { ...set, [type === 'min' ? 'minReps' : 'maxReps']: value };
            }
            return set;
          })
        };
      }
      return ex;
    }));
  };

  // Nouvelle fonction pour valider et corriger les reps au blur
  const validateAndCorrectReps = (exerciseId: string, setId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        const updatedSets = ex.sets.map(set => {
          if (set.id === setId) {
            // Assurer que les valeurs sont des nombres ou 0 si vide/invalide
            const minReps = parseInt(set.minReps) || 0;
            const maxReps = parseInt(set.maxReps) || 0;

            // Valider seulement si les deux champs ont une valeur valide et min > max
            if (set.minReps !== '' && set.maxReps !== '' && minReps > maxReps) {
              // Corriger minReps pour qu'il soit égal à maxReps
              return { ...set, minReps: maxReps.toString() };
            }
          }
          return set;
        });
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  const handleAddSet = (exerciseId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: [...ex.sets, { id: uuid.v4(), minReps: '6', maxReps: '12' }]
        };
      }
      return ex;
    }));
  };

  const handleRemoveSet = (exerciseId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId && ex.sets.length > 1) {
        return {
          ...ex,
          sets: ex.sets.slice(0, -1)
        };
      }
      return ex;
    }));
  };

  if (loading && exercises.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading workout...</Text>
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
            style={styles.titleInput}
            placeholder="Workout name"
            placeholderTextColor="#5eead4"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.descriptionInput}
            placeholder="Description"
            placeholderTextColor="#5eead4"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>
      </View>

      <View style={styles.statsPanel}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalExercises}</Text>
          <Text style={styles.statLabel}>exercises</Text>
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

      <ScrollView 
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.exercisesList}
      >
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Add exercises to your workout
            </Text>
            <Pressable 
              style={styles.addExerciseButton}
              onPress={() => setShowExerciseModal(true)}
            >
              <Plus size={20} color="#ccfbf1" />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {exercises.map((exercise, index) => (
              <DraggableExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                totalExercises={exercises.length}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onRemove={removeExercise}
                onInfo={handleExerciseInfo}
                onRepInputChange={handleRepInputChange}
                onRepInputBlur={validateAndCorrectReps}
                onAddSet={handleAddSet}
                onRemoveSet={handleRemoveSet}
                scrollRef={scrollRef as React.RefObject<ScrollView>}
              />
            ))}

            <Pressable 
              style={styles.addExerciseButton}
              onPress={() => setShowExerciseModal(true)}
            >
              <Plus size={20} color="#ccfbf1" />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable 
          style={styles.deleteButton}
          onPress={() => setShowDeleteModal(true)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
        <Pressable 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </Pressable>
      </View>

      {showExerciseModal && (
        <ExerciseModal
          visible={showExerciseModal}
          onClose={() => setShowExerciseModal(false)}
          onSelect={handleAddExercise}
          excludeExercises={exercises.map(e => e.id)}
        />
      )}

      {selectedExercise && (
        <ExerciseDetailsModal
          visible={!!selectedExercise}
          onClose={() => setSelectedExercise(null)}
          exercise={selectedExercise as any}
          isFavorite={false}
          onFavoriteToggle={() => {}}
        />
      )}

      <DeleteWorkoutModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        loading={loading}
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
  statsPanel: {
    flexDirection: 'row',
    backgroundColor: '#0d3d56',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
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
  scrollView: {
    flex: 1,
  },
  exercisesList: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#5eead4',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3d56',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 16,
  },
  addExerciseText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginLeft: 8,
  },
  bottomBar: {
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
    flex: 2,
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
});