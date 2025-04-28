import { View, Text, StyleSheet, TextInput, Pressable, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Info, Trash2, Plus, CircleMinus as MinusCircle, Dumbbell } from 'lucide-react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ExerciseModal from '@/components/ExerciseModal';
import ExerciseDetailsModal from '@/components/ExerciseDetailsModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native';
import { useWorkoutStore } from '@/lib/store/workoutStore';
import DraggableExerciseCard from '@/components/DraggableExerciseCard';
import { formatDuration } from '@/lib/utils/formatDuration';
import uuid from 'react-native-uuid';

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

export default function NewWorkoutScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setNeedsRefresh } = useWorkoutStore();
  const scrollRef = useRef<ScrollView>(null);
  // Store refs to exercise cards for animation
  const exerciseRefs = useRef<Array<{animateMove: (direction: -1 | 1, distance: number) => void}>>([]);
  // Store item heights for animation
  const [itemHeights, setItemHeights] = useState<number[]>([]);

  // Keep track of whether a reorder is in progress
  const [isReordering, setIsReordering] = useState(false);

  const totalExercises = exercises.length;
  const totalSets = exercises.reduce((acc, exercise) => acc + exercise.sets.length, 0);
  const estimatedDuration = 5 + (exercises.length * 4) + (totalSets * 3);
  const formattedDuration = formatDuration(estimatedDuration);

  // Function to update item height in the array
  const updateItemHeight = (index: number, height: number) => {
    setItemHeights(prev => {
      const newHeights = [...prev];
      newHeights[index] = height;
      return newHeights;
    });
  };

  // Handler for moving an exercise up
  const handleMoveUp = (index: number) => {
    if (index <= 0 || isReordering) return;
    
    setIsReordering(true);
    
    // Animate the current item moving up
    exerciseRefs.current[index]?.animateMove(-1, itemHeights[index-1] || 0);
    // Animate the previous item moving down
    exerciseRefs.current[index-1]?.animateMove(1, itemHeights[index] || 0);
    
    // Update the state after animation completes
    setTimeout(() => {
      setExercises(prev => {
        const newExercises = [...prev];
        const temp = newExercises[index];
        newExercises[index] = newExercises[index-1];
        newExercises[index-1] = temp;
        return newExercises;
      });
      setIsReordering(false);
    }, 250);
  };

  // Handler for moving an exercise down
  const handleMoveDown = (index: number) => {
    if (index >= exercises.length - 1 || isReordering) return;
    
    setIsReordering(true);
    
    // Animate the current item moving down
    exerciseRefs.current[index]?.animateMove(1, itemHeights[index+1] || 0);
    // Animate the next item moving up
    exerciseRefs.current[index+1]?.animateMove(-1, itemHeights[index] || 0);
    
    // Update the state after animation completes
    setTimeout(() => {
      setExercises(prev => {
        const newExercises = [...prev];
        const temp = newExercises[index];
        newExercises[index] = newExercises[index+1];
        newExercises[index+1] = temp;
        return newExercises;
      });
      setIsReordering(false);
    }, 250);
  };

  const handleAddExercise = (selectedExercises: Exercise[]) => {
    // Maintenir l'ordre exact des exercices sélectionnés
    const newExercises = selectedExercises.map(exercise => ({
      ...exercise,
      sets: Array(4).fill(null).map(() => ({
        id: uuid.v4(),
        minReps: '6',
        maxReps: '12'
      }))
    }));
    
    // Ajouter les nouveaux exercices à la fin de la liste existante
    setExercises(prev => [...prev, ...newExercises]);
    setShowExerciseModal(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw new Error('Authentication error');
      if (!user) throw new Error('Not authenticated');

      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .insert({
          user_id: user.id,
          name: name || 'New Workout',
          description,
          muscles: [...new Set(exercises.map(ex => ex.muscle))],
          estimated_duration: formattedDuration
        })
        .select()
        .single();

      if (templateError) throw templateError;

      for (const [index, exercise] of exercises.entries()) {
        if (!exercise || !exercise.id) continue; // Skip if exercise is null or missing id
        
        const { data: templateExercise, error: exerciseError } = await supabase
          .from('template_exercises')
          .insert({
            template_id: template.id,
            exercise_id: exercise.id,
            sets: exercise.sets.length,
            rest_time: '00:02:00',
            order: index
          })
          .select()
          .single();

        if (exerciseError) throw exerciseError;

        const setsData = exercise.sets.map((set, setIndex) => ({
          template_exercise_id: templateExercise.id,
          min_reps: parseInt(set.minReps) || 0,
          max_reps: parseInt(set.maxReps) || 0,
          order: setIndex
        }));

        const { error: setsError } = await supabase
          .from('template_exercise_sets')
          .insert(setsData);

        if (setsError) throw setsError;
      }

      setNeedsRefresh(true);
      router.back();
    } catch (error: any) {
      console.error('Error saving workout:', error);
      setError(error.message || 'Failed to save workout');
      Alert.alert('Error', error.message || 'Failed to save workout');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReps = (exerciseId: string, setId: string, type: 'min' | 'max', value: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(set => {
            if (set.id === setId) {
              if (type === 'min') {
                const maxReps = parseInt(set.maxReps) || 12;
                const minReps = parseInt(value) || 0;
                return {
                  ...set,
                  minReps: value,
                  maxReps: maxReps < minReps ? value : set.maxReps
                };
              } else {
                const minReps = parseInt(set.minReps) || 6;
                const maxReps = parseInt(value) || 0;
                return {
                  ...set,
                  maxReps: value,
                  minReps: maxReps < minReps ? value : set.minReps
                };
              }
            }
            return set;
          })
        };
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

  const handleExerciseInfo = (exercise: Exercise) => {
    router.push(`/modals/exercise-details/${exercise.id}`);
  };

  const removeExercise = (exerciseId: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
  };

  // Update refs array when exercises change
  useEffect(() => {
    exerciseRefs.current = exerciseRefs.current.slice(0, exercises.length);
  }, [exercises.length]);

  // Handle layout measurement for each card
  const handleLayout = (index: number, height: number) => {
    updateItemHeight(index, height);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.wrapper}>
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
                placeholder="New workout"
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
                <Dumbbell size={48} color="#14b8a6" strokeWidth={1.5} />
                <Text style={styles.emptyStateText}>
                  The workout is empty. Add exercises
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
                    key={`${exercise.id}-${index}`}
                    ref={el => {
                      if (el) exerciseRefs.current[index] = el;
                    }}
                    exercise={exercise}
                    index={index}
                    totalExercises={exercises.length}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onRemove={removeExercise}
                    onInfo={handleExerciseInfo}
                    onUpdateReps={handleUpdateReps}
                    onAddSet={handleAddSet}
                    onRemoveSet={handleRemoveSet}
                    scrollRef={scrollRef}
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
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Workout'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {showExerciseModal && (
        <ExerciseModal
          visible={showExerciseModal}
          onClose={() => setShowExerciseModal(false)}
          onSelect={handleAddExercise}
          multiSelect={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  container: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
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
  content: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  scrollView: {
    flex: 1,
  },
  exercisesList: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },
  bottomSpacer: {
    height: 60,
  },
  emptyState: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
  },
  exerciseCard: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  exerciseContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exerciseMainContent: {
    flex: 1,
    marginRight: 16,
  },
  exerciseInfo: {
    flex: 1,
    paddingRight: 16,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  lastActionButton: {
    marginRight: 0,
  },
  dragButtonContainer: {
    width: 36,
    paddingTop: 4,
  },
  dragButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0d3d56',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setsContainer: {
    gap: 12,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setNumber: {
    width: 24,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
  },
  setInput: {
    backgroundColor: '#0d3d56',
    borderRadius: 8,
    padding: 8,
    width: 48,
    color: '#ccfbf1',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  setText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  setActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  setActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeSetButton: {
    opacity: 0.8,
  },
  setActionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
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
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  saveButton: {
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