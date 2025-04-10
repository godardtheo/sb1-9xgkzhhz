import { View, Text, StyleSheet, TextInput, Pressable, Platform, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Info, Plus, CircleMinus as MinusCircle, ChevronRight } from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import ExerciseModal from '@/components/ExerciseModal';
import ExerciseDetailsModal from '@/components/ExerciseDetailsModal';
import DeleteWorkoutModal from '@/components/DeleteWorkoutModal';
import { useWorkoutStore } from '@/lib/store/workoutStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useExerciseReorder } from '@/hooks/useExerciseReorder';
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

export default function EditWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
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
  
  const { 
    exercises: reorderedExercises, 
    setExercises: setReorderedExercises, 
    handleDragEnd,
    activeIndex,
    itemOffsets,
    itemTranslations,
    updateItemHeight,
    handleDragActive
  } = useExerciseReorder(exercises);

  const totalExercises = exercises.length;
  const totalSets = exercises.reduce((acc, exercise) => acc + exercise.sets.length, 0);
  const estimatedDuration = 5 + (exercises.length * 4) + (totalSets * 3);
  const formattedDuration = formatDuration(estimatedDuration);

  useEffect(() => {
    if (exercises && exercises.length > 0) {
      setReorderedExercises(exercises);
    }
  }, [exercises]);

  useEffect(() => {
    if (id) {
      fetchWorkoutDetails();
    }
  }, [id]);

  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // First fetch the template basic info
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', id)
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
        .eq('template_id', id)
        .order('order');

      if (exercisesError) throw exercisesError;

      if (exerciseData) {
        const formattedExercises = exerciseData.map(item => ({
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

        setExercises(formattedExercises);
      }
    } catch (err: any) {
      console.error('Error fetching workout:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
        .eq('id', id);

      if (templateError) throw templateError;

      // 2. Update exercise order using reorderedExercises
      for (let i = 0; i < reorderedExercises.length; i++) {
        const { error: exerciseError } = await supabase
          .from('template_exercises')
          .update({ order: i })
          .eq('template_id', id)
          .eq('exercise_id', reorderedExercises[i].id);

        if (exerciseError) throw exerciseError;
      }

      // 3. Update set values for each exercise
      for (const exercise of exercises) {
        // Get the template exercise ID
        const { data: templateExercise, error: templateExerciseError } = await supabase
          .from('template_exercises')
          .select('id')
          .eq('template_id', id)
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

      const { error: deleteError } = await supabase
        .from('workout_templates')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setNeedsRefresh(true);
      router.replace('/modals/workouts');
    } catch (error: any) {
      console.error('Error deleting workout:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseInfo = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowExerciseDetails(true);
  };

  const handleAddExercise = async (selectedExercises: Exercise[]) => {
    try {
      for (const exercise of selectedExercises) {
        const { data: templateExercise, error: templateError } = await supabase
          .from('template_exercises')
          .insert({
            template_id: id,
            exercise_id: exercise.id,
            order: exercises.length
          })
          .select()
          .single();

        if (templateError) throw templateError;

        const defaultSets = Array(4).fill(null).map((_, index) => ({
          template_exercise_id: templateExercise.id,
          min_reps: 6,
          max_reps: 12,
          order: index
        }));

        const { data: sets, error: setsError } = await supabase
          .from('template_exercise_sets')
          .insert(defaultSets)
          .select();

        if (setsError) throw setsError;

        const newExercise = {
          ...exercise,
          sets: sets.map(set => ({
            id: set.id,
            minReps: set.min_reps.toString(),
            maxReps: set.max_reps.toString()
          }))
        };

        setExercises(prev => [...prev, newExercise]);
      }

      setShowExerciseModal(false);
    } catch (err) {
      console.error('Error adding exercises:', err);
      setError('Failed to add exercises');
    }
  };

  const removeExercise = async (exerciseId: string) => {
    try {
      const { error } = await supabase
        .from('template_exercises')
        .delete()
        .eq('exercise_id', exerciseId)
        .eq('template_id', id);

      if (error) throw error;

      setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
    } catch (err) {
      console.error('Error removing exercise:', err);
      setError('Failed to remove exercise');
    }
  };

  const handleUpdateReps = (exerciseId: string, setId: string, type: 'min' | 'max', value: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(set => {
            if (set.id === setId) {
              // Validate min/max relationship
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

  if (loading && exercises.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading workout...</Text>
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
            placeholder="Workout name"
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
        showsVerticalScrollIndicator={true}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          {reorderedExercises.map((exercise, index) => (
            <DraggableExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              onDragEnd={handleDragEnd}
              onRemove={removeExercise}
              onInfo={handleExerciseInfo}
              onUpdateReps={handleUpdateReps}
              onAddSet={handleAddSet}
              onRemoveSet={handleRemoveSet}
              totalExercises={exercises.length}
              scrollRef={scrollRef}
              // DnD props
              activeIndex={activeIndex}
              itemOffsets={itemOffsets}
              itemTranslations={itemTranslations}
              updateItemHeight={updateItemHeight}
              handleDragActive={handleDragActive}
            />
          ))}
          <Pressable 
            style={styles.addExerciseButton}
            onPress={() => setShowExerciseModal(true)}
          >
            <Plus size={20} color="#ccfbf1" />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </Pressable>
        </GestureHandlerRootView>
      </ScrollView>

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

      <ExerciseModal
        visible={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSelect={handleAddExercise}
        excludeExercises={exercises.map(e => e.id)}
      />

      <ExerciseDetailsModal
        visible={showExerciseDetails}
        onClose={() => setShowExerciseDetails(false)}
        exercise={selectedExercise}
      />

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
  scrollView: {
    flex: 1,
  },
  exercisesList: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
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
  saveButtonDisabled: {
    opacity: 0.7,
  },
});