import { View, Text, StyleSheet, TextInput, Pressable, Platform, ScrollView, Alert, StatusBar } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Type for data coming FROM ExerciseModal
type ModalExerciseSelection = {
  id: string;
  name: string;
  muscle?: string;
  equipment?: string | string[]; // Ajusté pour accepter string ou string[] du modal
  muscle_primary?: string[];
  muscle_secondary?: string[];
  // ... autres champs possibles
};

type Exercise = {
  id: string;
  name: string;
  muscle?: string;
  equipment?: string[]; // Changé en optionnel et tableau
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

export default function NewWorkoutScreen() {
  // console.log("[NewWorkoutScreen] Rendering component...");
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
  // Get safe area insets
  const insets = useSafeAreaInsets();

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

  // Update signature to accept simpler type from Modal
  const handleAddExercise = (selectedExercises: ModalExerciseSelection[]) => {
    // Maintenir l'ordre exact des exercices sélectionnés
    const newExercises: Exercise[] = selectedExercises.map(exerciseSelection => {
      // Gérer le format de l'équipement
      let equipmentArray: string[] | undefined = undefined;
      if (Array.isArray(exerciseSelection.equipment)) {
        equipmentArray = exerciseSelection.equipment;
      } else if (typeof exerciseSelection.equipment === 'string') {
        equipmentArray = [exerciseSelection.equipment];
      }

      return {
        // Construire l'objet Exercise complet à partir de la sélection
        id: exerciseSelection.id,
        name: exerciseSelection.name,
        muscle: exerciseSelection.muscle || undefined, // Utiliser undefined si non fourni
        equipment: equipmentArray, // Utiliser le tableau formaté
        muscle_primary: exerciseSelection.muscle_primary, // Ajouter si présents dans ModalExerciseSelection
        muscle_secondary: exerciseSelection.muscle_secondary,
        // Ajouter les autres champs par défaut si nécessaire
        sets: Array(4).fill(null).map(() => ({
          id: uuid.v4() as string,
          minReps: '6',
          maxReps: '12'
        })),
        totalExercises: 1 // Remettre requis
      }
    });

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

  const handleExerciseInfo = (exercise: Exercise) => {
    router.navigate(`/modals/exercise-details/${exercise.id}`);
  };

  const removeExercise = (exerciseId: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
  };

  // console.log("[NewWorkoutScreen] Starting return...");
  return (
    <View style={styles.container as any}>
      {/* {(() => { console.log("[NewWorkoutScreen] Rendering SafeAreaView content..."); return null; })()} */}
      <View style={styles.wrapper as any}>
        {/* {(() => { console.log("[NewWorkoutScreen] Rendering Header..."); return null; })()} */}
        <View style={styles.header as any}>
          <Pressable 
            onPress={() => router.back()}
            style={styles.backButton as any}
            hitSlop={8}
          >
            <ArrowLeft size={24} color="#5eead4" />
          </Pressable>
          <View style={styles.titleContainer as any}>
            <TextInput
              style={[styles.titleInput as any, Platform.OS === 'web' && styles.titleInputWeb]}
              placeholder="New workout"
              placeholderTextColor="#5eead4"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.descriptionInput as any, Platform.OS === 'web' && styles.descriptionInputWeb]}
              placeholder="Description"
              placeholderTextColor="#5eead4"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </View>
        {/* {(() => { console.log("[NewWorkoutScreen] Header rendered."); return null; })()} */}

        <View style={styles.statsPanel as any}>
          {/* {(() => { console.log("[NewWorkoutScreen] Rendering Stats Panel..."); return null; })()} */}
          <View style={styles.statItem as any}>
            <Text style={styles.statValue as any}>{totalExercises}</Text>
            <Text style={styles.statLabel as any}>exercises</Text>
          </View>
          <View style={styles.statDivider as any} />
          <View style={styles.statItem as any}>
            <Text style={styles.statValue as any}>{totalSets}</Text>
            <Text style={styles.statLabel as any}>sets</Text>
          </View>
          <View style={styles.statDivider as any} />
          <View style={styles.statItem as any}>
            <Text style={styles.statValue as any}>{formattedDuration}</Text>
            <Text style={styles.statLabel as any}>duration</Text>
          </View>
        </View>
        {/* {(() => { console.log("[NewWorkoutScreen] Stats Panel rendered."); return null; })()} */}

        <ScrollView 
          ref={scrollRef}
          style={styles.scrollView as any}
          contentContainerStyle={styles.exercisesList as any}
        >
          {/* {(() => { console.log("[NewWorkoutScreen] Rendering ScrollView section..."); return null; })()} */}
          {exercises.length === 0 ? (
            <View style={styles.emptyState as any}>
              <Dumbbell size={48} color="#14b8a6" strokeWidth={1.5} />
              <Text style={styles.emptyStateText as any}>
                The workout is empty. Add exercises
              </Text>
              <Pressable 
                style={styles.addExerciseButton as any}
                onPress={() => setShowExerciseModal(true)}
              >
                <Plus size={20} color="#ccfbf1" />
                <Text style={styles.addExerciseText as any}>Add Exercise</Text>
              </Pressable>
            </View>
          ) : (
            exercises.map((exercise, index) => (
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
            ))
          )}

          {/* Toujours afficher le bouton Ajouter en bas de la liste */}
          {exercises.length > 0 && (
            <Pressable 
              style={styles.addExerciseButton as any}
              onPress={() => setShowExerciseModal(true)}
            >
              <Plus size={20} color="#ccfbf1" />
              <Text style={styles.addExerciseText as any}>Add Exercise</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* {(() => { console.log("[NewWorkoutScreen] Rendering Bottom Bar..."); return null; })()} */}
        <View style={styles.bottomBar as any}>
          <Pressable 
            style={styles.saveButton as any}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText as any}>
              {loading ? 'Saving...' : 'Save Workout'}
            </Text>
          </Pressable>
        </View>
        {/* {(() => { console.log("[NewWorkoutScreen] Bottom Bar rendered."); return null; })()} */}

        {showExerciseModal && (
          <ExerciseModal
            visible={showExerciseModal}
            onClose={() => setShowExerciseModal(false)}
            onSelect={handleAddExercise}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  wrapper: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 24 + (StatusBar.currentHeight || 0) : 24,
    paddingBottom: 24,
    paddingLeft: 24,
    paddingRight: 24,
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
    // Style web spécifique (vide maintenant si non nécessaire)
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
    // Style web spécifique (vide maintenant si non nécessaire)
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
    elevation: 12,
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