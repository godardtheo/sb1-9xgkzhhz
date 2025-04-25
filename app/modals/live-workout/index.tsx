import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Edit2, Trash2, Plus, Timer, X, RotateCcw } from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth/store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import LiveExerciseCard from '@/components/LiveExerciseCard';
import ExerciseModal from '@/components/ExerciseModal';
import WorkoutNameModal from '@/components/WorkoutNameModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import RestTimerModal from '@/components/RestTimerModal';
import { Audio } from 'expo-av';
import { useWorkoutProgressStore } from '@/lib/store/workoutProgressStore';

type Exercise = {
  id: string;
  name: string;
  muscle_primary?: string[];
  muscle_secondary?: string[];
  equipment?: string[];
  instructions?: string;
  video_url?: string;
  type?: string;
  difficulty?: string;
  sets: {
    id: string;
    weight: string;
    reps: string;
    completed: boolean;
    previousWeight?: string;
    previousReps?: string;
  }[];
};

export default function LiveWorkoutScreen() {
  const router = useRouter();
  const { template_id } = useLocalSearchParams();
  const { userProfile } = useAuthStore();

  // Get global workout state
  const workoutProgress = useWorkoutProgressStore();
  
  // Workout state
  const [workoutName, setWorkoutName] = useState('New Workout');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isWorkoutFinished, setIsWorkoutFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Display duration - this will be updated from the global timer
  const [displayDuration, setDisplayDuration] = useState(0);

  // Timers
  const [restTime, setRestTime] = useState(120); // default 2 minutes in seconds
  const [activeRestTime, setActiveRestTime] = useState(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [isTimerDone, setIsTimerDone] = useState(false);
  const [playSoundOnFinish, setPlaySoundOnFinish] = useState(true);

  // Sound
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Modals
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showWorkoutNameModal, setShowWorkoutNameModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showRestTimerModal, setShowRestTimerModal] = useState(false);

  // References
  const displayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Animated values
  const progressValue = useSharedValue(0);

  // Check if resuming a workout
  useEffect(() => {
    if (workoutProgress.isWorkoutInProgress) {
      // If we're returning to the live workout screen and a workout is in progress,
      // restore the state from the global store
      setWorkoutName(workoutProgress.workoutName);
      setExercises(workoutProgress.exercises);
      setRestTime(workoutProgress.restTime);
      setActiveRestTime(workoutProgress.activeRestTime);
      setIsRestTimerActive(workoutProgress.isRestTimerActive);
      setIsWorkoutStarted(true);
      setLoading(false);
      
      // Start the display timer to show current workout duration
      startDisplayTimer();
      
      // If rest timer was active, resume it
      if (workoutProgress.isRestTimerActive && workoutProgress.activeRestTime > 0) {
        resumeRestTimer(workoutProgress.activeRestTime);
      }
    } 
    // Normal initialization for a new workout
    else if (template_id) {
      loadWorkoutTemplate(template_id as string);
    } else {
      setLoading(false);
    }

    // Load sounds
    loadSound();

    // Cleanup timers and sound on unmount
    return () => {
      if (displayTimerRef.current) clearInterval(displayTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      
      // Unload sound
      sound?.unloadAsync();
    };
  }, [template_id, workoutProgress.isWorkoutInProgress]);

  // Update the global store whenever workout state changes
  useEffect(() => {
    if (isWorkoutStarted) {
      workoutProgress.updateWorkout({
        workoutName,
        restTime,
        activeRestTime,
        isRestTimerActive,
      });
      
      workoutProgress.updateExercises(exercises);
    }
  }, [
    isWorkoutStarted,
    workoutName,
    exercises,
    restTime,
    activeRestTime,
    isRestTimerActive,
  ]);

  // Load alarm sound
  const loadSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/timer-alarm.mp3')
      );
      setSound(sound);
    } catch (error) {
      console.error('Error loading sound:', error);
    }
  };

  // Play alarm sound
  const playAlarmSound = async () => {
    if (sound && playSoundOnFinish) {
      try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    }
  };

  // Update progress bar based on completed sets
  useEffect(() => {
    const totalSets = exercises.reduce(
      (total, ex) => total + ex.sets.length,
      0
    );
    const completedSets = exercises.reduce(
      (total, ex) => total + ex.sets.filter((set) => set.completed).length,
      0
    );

    const progress = totalSets > 0 ? completedSets / totalSets : 0;
    progressValue.value = withTiming(progress, { duration: 300 });
  }, [exercises]);

  // Start the display timer to continuously update from the global store
  const startDisplayTimer = () => {
    if (displayTimerRef.current) clearInterval(displayTimerRef.current);
    
    // Update immediately
    setDisplayDuration(workoutProgress.getCurrentDuration());
    
    // Then update every second
    displayTimerRef.current = setInterval(() => {
      setDisplayDuration(workoutProgress.getCurrentDuration());
    }, 1000);
  };

  const loadWorkoutTemplate = async (templateId: string) => {
    try {
      setLoading(true);

      // Fetch template details
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      if (template) {
        setWorkoutName(template.name);

        // Fetch exercises for the template
        const { data: templateExercises, error: exercisesError } =
          await supabase
            .from('template_exercises')
            .select(
              `
            id,
            exercise_id,
            exercises (
              id,
              name,
              muscle_primary,
              muscle_secondary,
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
          `
            )
            .eq('template_id', templateId)
            .order('order');

        if (exercisesError) throw exercisesError;

        if (templateExercises && templateExercises.length > 0) {
          // Process exercises and get previous performances
          const processedExercises = await Promise.all(
            templateExercises.map(async (item) => {
              // Get previous performance for this exercise
              const previousPerformance = await getPreviousPerformance(
                item.exercises.id
              );

              return {
                id: item.exercises.id,
                name: item.exercises.name,
                muscle_primary: item.exercises.muscle_primary || [],
                muscle_secondary: item.exercises.muscle_secondary || [],
                equipment: Array.isArray(item.exercises.equipment) 
                  ? item.exercises.equipment 
                  : (item.exercises.equipment ? [item.exercises.equipment] : []),
                instructions: item.exercises.instructions,
                video_url: item.exercises.video_url,
                type: item.exercises.type,
                difficulty: item.exercises.difficulty,
                sets: item.template_exercise_sets.map((set, index) => {
                  const prevSet = previousPerformance[index] || {};
                  return {
                    id: set.id,
                    weight: prevSet.weight || '0', // Pre-populate with '0' if no previous data
                    reps: '',
                    completed: false,
                    previousWeight: prevSet.weight || '0',
                    previousReps: prevSet.reps || '0',
                  };
                }),
              };
            })
          );

          setExercises(processedExercises);
        }
      }
    } catch (err: any) {
      console.error('Error loading workout template:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPreviousPerformance = async (exerciseId: string) => {
    try {
      if (!userProfile?.id) return [];

      console.log("Fetching previous performance for exercise:", exerciseId);

      // Get the most recent workout exercise for this exercise
      const { data: workoutExercises, error: workoutError } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          parent_workout_id,
          workouts:workouts!parent_workout_id(id, user_id)
        `)
        .eq('exercise_id', exerciseId)
        .eq('workouts.user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (workoutError) {
        console.log("Error fetching workout exercises:", workoutError.message);
        console.log("Error details:", workoutError);
        return [];
      }

      if (!workoutExercises || workoutExercises.length === 0) {
        console.log("No previous workout exercises found for exercise:", exerciseId);
        
        // Essayer une approche alternative avec workout_id au lieu de parent_workout_id
        console.log("Trying alternative approach with workout_id...");
        const { data: altWorkoutExercises, error: altError } = await supabase
          .from('workout_exercises')
          .select(`
            id,
            workout_id,
            workouts:workouts!workout_id(id, user_id)
          `)
          .eq('exercise_id', exerciseId)
          .eq('workouts.user_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (altError || !altWorkoutExercises || altWorkoutExercises.length === 0) {
          console.log("Alternative approach also failed:", altError?.message);
          return [];
        }
        
        console.log("Found workout exercise with alternative approach:", altWorkoutExercises[0].id);
        
        // Continue with the alternative data
        const { data: setData, error: setError } = await supabase
          .from('sets')
          .select('rep_count, weight, set_order')
          .eq('workout_exercise_id', altWorkoutExercises[0].id)
          .order('set_order');
          
        if (setError || !setData || setData.length === 0) {
          console.log("No set data found with alternative approach.");
          return [];
        }
        
        console.log("Found previous sets with alternative approach:", setData.length);
        
        return setData.map(set => ({
          reps: set.rep_count.toString(),
          weight: set.weight.toString(),
          set_order: set.set_order
        }));
      }

      console.log("Found previous workout exercise:", workoutExercises[0].id);

      // Get the sets for this exercise in that workout
      const { data: setData, error: setError } = await supabase
        .from('sets')
        .select('rep_count, weight, set_order')
        .eq('workout_exercise_id', workoutExercises[0].id)
        .order('set_order');

      if (setError) {
        console.log("Error fetching set data:", setError.message);
        return [];
      }

      if (!setData || setData.length === 0) {
        console.log("No set data found for workout exercise:", workoutExercises[0].id);
        
        // Essayer une approche alternative si la table sets ne renvoie rien
        // Certaines versions de la base de données stockent les informations de sets directement dans workout_exercises
        const { data: exerciseDetails, error: exerciseError } = await supabase
          .from('workout_exercises')
          .select('*')
          .eq('id', workoutExercises[0].id)
          .single();
          
        if (!exerciseError && exerciseDetails && exerciseDetails.sets) {
          try {
            // Si les sets sont stockés sous forme de JSON dans un champ sets
            const setArray = typeof exerciseDetails.sets === 'string' 
              ? JSON.parse(exerciseDetails.sets) 
              : exerciseDetails.sets;
              
            console.log("Using sets from workout_exercises:", setArray.length);
            
            return Array.isArray(setArray) ? setArray.map((set, index) => ({
              reps: (set.reps || set.rep_count || "0").toString(),
              weight: (set.weight || "0").toString(),
              set_order: set.order || set.set_order || index
            })) : [];
          } catch (e) {
            console.error("Error parsing sets from workout_exercises:", e);
            return [];
          }
        }
        
        return [];
      }

      console.log("Found previous sets:", setData.length);

      // Format the set data to include both rep_count and weight
      return setData.map(set => ({
        reps: set.rep_count.toString(),
        weight: set.weight.toString(),
        set_order: set.set_order
      }));
      
    } catch (error) {
      console.error('Error fetching previous performance:', error);
      return [];
    }
  };

  const startWorkout = () => {
    if (isWorkoutStarted) {
      // If already started, confirm finish
      if (hasIncompleteSets()) {
        setShowFinishModal(true);
      } else {
        finishWorkout();
      }
    } else {
      // Start workout and timer
      setIsWorkoutStarted(true);
      
      // Start display timer to update UI
      startDisplayTimer();
      
      // Save to global store
      workoutProgress.startWorkout(workoutName, template_id as string || null, exercises);
    }
  };

  const startRestTimer = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);

    setActiveRestTime(restTime);
    setIsRestTimerActive(true);
    setIsTimerDone(false);

    restTimerRef.current = setInterval(() => {
      setActiveRestTime((prev) => {
        if (prev <= 1) {
          // Timer completed
          clearInterval(restTimerRef.current!);
          setIsTimerDone(true);
          // Play sound when timer completes
          playAlarmSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const resumeRestTimer = (timeRemaining: number) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    
    setActiveRestTime(timeRemaining);
    setIsRestTimerActive(true);
    setIsTimerDone(false);
    
    restTimerRef.current = setInterval(() => {
      setActiveRestTime((prev) => {
        if (prev <= 1) {
          // Timer completed
          clearInterval(restTimerRef.current!);
          setIsTimerDone(true);
          // Play sound when timer completes
          playAlarmSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetRestTimer = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setActiveRestTime(restTime);
    setIsTimerDone(false);
  };

  const hasIncompleteSets = () => {
    return exercises.some((ex) => ex.sets.some((set) => !set.completed));
  };

  const finishWorkout = async () => {
    if (!isWorkoutStarted || exercises.length === 0) {
      Alert.alert(
        'Cannot finish',
        'You need to start the workout and add exercises first.'
      );
      return;
    }

    try {
      setIsSaving(true);
      console.log('Starting workout save process...');

      // Stop timers
      if (displayTimerRef.current) clearInterval(displayTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Step 1: Create the workout
      console.log('Creating workout record...');
      const { data: workoutId, error: workoutError } = await supabase.rpc(
        'create_workout',
        {
          p_user_id: user.id,
          p_name: workoutName,
          p_date: new Date().toISOString(),
          p_duration: `${Math.floor(displayDuration / 60)} minutes`,
          p_notes: ''
        }
      );

      if (workoutError) throw workoutError;
      console.log('Workout created with ID:', workoutId);

      // Step 2: Process each exercise
      for (const [index, exercise] of exercises.entries()) {
        // Only save exercises that have at least one completed set
        const completedSets = exercise.sets.filter(set => set.completed);
        
        if (completedSets.length > 0) {
          console.log(`Processing exercise ${index + 1}/${exercises.length}: ${exercise.name}`);
          
          // Create workout exercise
          const { data: workoutExerciseId, error: exerciseError } = await supabase.rpc(
            'create_workout_exercise',
            {
              parent_workout_id: workoutId,
              exercise_id: exercise.id,
              sets: completedSets.length,
              exercise_order: index
            }
          );

          if (exerciseError) throw exerciseError;
          console.log('Workout exercise created with ID:', workoutExerciseId);

          // Step 3: Save the sets
          const setsData = completedSets.map((set, setIndex) => ({
            reps: set.reps,
            weight: set.weight,
            order: setIndex
          }));

          const { data: setsResult, error: setsError } = await supabase.rpc(
            'create_workout_sets',
            {
              p_workout_exercise_id: workoutExerciseId,
              p_sets: setsData
            }
          );

          if (setsError) throw setsError;
          console.log(`Saved ${completedSets.length} sets for exercise`);
        }
      }

      console.log('Workout saved successfully!');
      
      setIsWorkoutFinished(true);
      // End the workout in global state
      workoutProgress.endWorkout();
      
      // Close modal and redirect to home screen
      setShowFinishModal(false);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Error saving workout:', err);
      Alert.alert('Error', `Failed to save workout: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const discardWorkout = () => {
    // Stop timers
    if (displayTimerRef.current) clearInterval(displayTimerRef.current);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    
    // End workout in global state
    workoutProgress.endWorkout();

    // Navigate back
    router.replace('/(tabs)');
  };

  const updateExerciseSet = (
    exerciseId: string,
    setIndex: number,
    field: 'weight' | 'reps' | 'completed',
    value: string | boolean
  ) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const updatedSets = [...ex.sets];
          
          // Update the specific set
          updatedSets[setIndex] = {
            ...updatedSets[setIndex],
            [field]: value,
          };

          // If field is weight, update all subsequent sets with the same value
          if (field === 'weight' && typeof value === 'string') {
            for (let i = setIndex + 1; i < updatedSets.length; i++) {
              updatedSets[i] = {
                ...updatedSets[i],
                weight: value,
              };
            }
          }

          // If set is marked as completed, start rest timer
          if (field === 'completed' && value === true) {
            startRestTimer();
          }

          return { ...ex, sets: updatedSets };
        }
        return ex;
      })
    );
  };

  const addSet = (exerciseId: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          // Find the last entered weight to use as default for the new set
          const lastEnteredWeight = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1].weight : '0';
          
          const newSet = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // Use unique ID
            weight: lastEnteredWeight, // Use the weight from the last set
            reps: '',
            completed: false,
            previousWeight: ex.sets[ex.sets.length - 1]?.previousWeight || '0',
            previousReps: ex.sets[ex.sets.length - 1]?.previousReps || '0',
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        }
        return ex;
      })
    );
  };

  const removeSet = (exerciseId: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId && ex.sets.length > 1) {
          const newSets = [...ex.sets];
          newSets.pop();
          return { ...ex, sets: newSets };
        }
        return ex;
      })
    );
  };

  const removeExercise = (exerciseId: string) => {
    setExercises(exercises.filter((ex) => ex.id !== exerciseId));
  };

  const handleExerciseSelection = (selectedExercises: any[]) => {
    const newExercises = selectedExercises.map((ex) => {
      // Vérifier et convertir les champs pour assurer le bon format
      let muscle_primary = ex.muscle_primary || [];
      // Gérer la compatibilité avec l'ancien format
      if (!muscle_primary.length && ex.muscle) {
        muscle_primary = [ex.muscle];
      }

      // Gérer le format de l'équipement
      let equipment = ex.equipment || [];
      if (!Array.isArray(equipment) && equipment) {
        equipment = [equipment];
      }

      return {
        id: ex.id,
        name: ex.name,
        muscle_primary: muscle_primary,
        muscle_secondary: ex.muscle_secondary || [],
        equipment: equipment,
        instructions: ex.instructions,
        video_url: ex.video_url,
        type: ex.type,
        difficulty: ex.difficulty,
        sets: Array(4)
          .fill(null)
          .map(() => ({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            weight: '0',
            reps: '',
            completed: false,
            previousWeight: '0',
            previousReps: '0',
          })),
      };
    });

    setExercises([...exercises, ...newExercises]);
    setShowExerciseModal(false);
  };

  const handleExerciseInfo = (exercise: Exercise) => {
    // Utiliser push avec un flag de redirection pour éviter l'empilement tout en préservant le contexte
    // Le paramètre 'source: live-workout' nous permettra de savoir d'où vient l'utilisateur si nécessaire
    router.push({
      pathname: "/modals/exercise-details/[id]",
      params: { id: exercise.id, source: 'live-workout' }
    });
  };

  const handleUpdateWorkoutName = (name: string) => {
    setWorkoutName(name);
    setShowWorkoutNameModal(false);
  };

  const reorderExercises = (fromIndex: number, toIndex: number) => {
    const reordered = [...exercises];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    setExercises(reordered);
  };
  
  // Handle back button - just go back without confirmation
  const handleBackPress = () => {
    router.back();
  };

  const formatTime = (timeInSeconds: number) => {
    // Format as M:SS (no hours)
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatWorkoutTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(1, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value * 100}%`,
      height: 3,
      backgroundColor: '#14b8a6',
    };
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={handleBackPress}
            style={styles.backButton}
            hitSlop={8}
          >
            <ArrowLeft size={24} color="#5eead4" />
          </Pressable>

          <Text style={styles.timerText}>{formatWorkoutTime(displayDuration)}</Text>

          <Pressable
            style={[
              styles.controlButton,
              isWorkoutStarted ? styles.finishButton : styles.startButton,
            ]}
            onPress={startWorkout}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#021a19" />
            ) : (
              <Text style={styles.controlButtonText}>
                {isWorkoutStarted ? 'Finish' : 'Start'}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{workoutName}</Text>
          <Pressable onPress={() => setShowWorkoutNameModal(true)} hitSlop={8}>
            <Edit2 size={18} color="#5eead4" />
          </Pressable>
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View style={progressBarStyle} />
        </View>
      </View>

      <GestureHandlerRootView style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={true}
          // Add passive flag to prevent scroll blocking warning
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          // Make the scrolling event listener passive
          onScroll={undefined}
        >
          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Add exercises to start your workout
              </Text>
            </View>
          ) : (
            exercises.map((exercise, index) => (
              <LiveExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                onRemove={removeExercise}
                onSetUpdate={updateExerciseSet}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                onInfo={() => handleExerciseInfo(exercise)}
                onReorder={reorderExercises}
                isInWorkout={true}
              />
            ))
          )}

          <View style={styles.buttonContainer}>
            <Pressable
              style={styles.addExerciseButton}
              onPress={() => setShowExerciseModal(true)}
            >
              <Plus size={20} color="#ccfbf1" />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </Pressable>

            {isWorkoutStarted && (
              <Pressable
                style={styles.discardButton}
                onPress={() => setShowDiscardModal(true)}
              >
                <Trash2 size={20} color="#ef4444" />
                <Text style={styles.discardButtonText}>Discard Workout</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </GestureHandlerRootView>

      {/* Rest Timer Button - Always visible */}
      <Pressable
        style={[
          styles.restTimerButton, 
          isTimerDone && styles.restTimerButtonDone
        ]}
        onPress={() => setShowRestTimerModal(true)}
      >
        <Timer size={20} color="#ccfbf1" />
        <Text style={styles.restTimerText}>
          {isRestTimerActive || activeRestTime > 0 ? formatTime(activeRestTime) : formatTime(restTime)}
        </Text>
        <Pressable
          style={styles.resetRestTimer}
          onPress={resetRestTimer}
          hitSlop={8}
        >
          <RotateCcw size={16} color="#ccfbf1" />
        </Pressable>
      </Pressable>

      {/* Modals */}
      <ExerciseModal
        visible={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSelect={handleExerciseSelection}
        excludeExercises={exercises.map((e) => e.id)}
      />

      <WorkoutNameModal
        visible={showWorkoutNameModal}
        onClose={() => setShowWorkoutNameModal(false)}
        onConfirm={handleUpdateWorkoutName}
        initialName={workoutName}
      />

      <ConfirmationModal
        visible={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={discardWorkout}
        title="Discard Workout"
        message="Are you sure you want to discard this workout? All progress will be lost."
        confirmText="Discard"
        confirmColor="#ef4444"
      />

      <ConfirmationModal
        visible={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        onConfirm={finishWorkout}
        title="Finish Workout"
        message="You have incomplete sets. Are you sure you want to finish the workout?"
        confirmText="Finish"
        confirmColor="#14b8a6"
      />

      <RestTimerModal
        visible={showRestTimerModal}
        onClose={() => setShowRestTimerModal(false)}
        currentTime={restTime}
        playSoundOnFinish={playSoundOnFinish}
        onSoundToggle={() => setPlaySoundOnFinish(!playSoundOnFinish)}
        onTimeSelected={(time) => {
          setRestTime(time);
          setActiveRestTime(time);
          setShowRestTimerModal(false);

          // Restart timer with new time
          if (isRestTimerActive) {
            if (restTimerRef.current) clearInterval(restTimerRef.current);
            startRestTimer();
          }
        }}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#021a19',
  },
  loadingText: {
    marginTop: 16,
    color: '#5eead4',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 24 : 24,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#021a19',
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
  },
  controlButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#14b8a6',
  },
  finishButton: {
    backgroundColor: '#0d9488',
  },
  controlButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#021a19',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 3,
    width: '100%',
    backgroundColor: '#115e59',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 20,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3d56',
    borderRadius: 12,
    padding: 16,
  },
  addExerciseText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginLeft: 8,
  },
  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#450a0a',
    borderRadius: 12,
    padding: 16,
  },
  discardButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ef4444',
    marginLeft: 8,
  },
  restTimerButton: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: '#14b8a6',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    width: 140,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  restTimerButtonDone: {
    backgroundColor: '#f97316', // Orange color when timer is done
  },
  restTimerText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
  },
  resetRestTimer: {
    padding: 4,
  },
  closeRestTimer: {
    marginLeft: 8,
    padding: 4,
  },
});