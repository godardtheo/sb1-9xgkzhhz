import { View, Text, StyleSheet, Pressable, Platform, TextInput, ScrollView, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Info, Trash2, ArrowUp, ArrowDown, Plus, CircleMinus } from 'lucide-react-native';
import { useRef, useImperativeHandle, forwardRef } from 'react';

type Exercise = {
  id: string;
  name: string;
  muscle?: string;  // Format ancien
  muscle_primary?: string[];  // Format nouveau
  muscle_secondary?: string[];
  equipment?: string[]; // Ajusté pour correspondre à [id].tsx : optionnel, tableau de strings
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

type Props = {
  exercise: Exercise;
  index: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (id: string) => void;
  onInfo: (exercise: Exercise) => void;
  totalExercises: number;
  onAddSet?: (exerciseId: string) => void;
  onRemoveSet?: (exerciseId: string) => void;
  onRepInputChange?: (exerciseId: string, setId: string, type: 'min' | 'max', value: string) => void;
  onRepInputBlur?: (exerciseId: string, setId: string) => void;
  scrollRef?: React.RefObject<ScrollView>;
};

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 180,
  mass: 0.5,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

const DraggableExerciseCard = forwardRef<
  { animateMove: (direction: -1 | 1, distance: number) => void },
  Props
>(({
  exercise,
  index,
  onMoveUp,
  onMoveDown,
  onRemove,
  onInfo,
  totalExercises,
  onAddSet,
  onRemoveSet,
  onRepInputChange,
  onRepInputBlur,
  scrollRef,
}, ref) => {
  // Animation values
  const isMoving = useSharedValue(false);
  const offsetY = useSharedValue(0);
  const direction = useSharedValue(0); // -1 for up, 1 for down
  
  // Setup animation method that can be called from parent
  const animateMove = (dir: -1 | 1, distance: number) => {
    direction.value = dir;
    offsetY.value = distance;
    isMoving.value = true;
    
    // Reset after animation
    setTimeout(() => {
      isMoving.value = false;
      offsetY.value = 0;
    }, 250);
  };
  
  // Expose the animation method to parent
  useImperativeHandle(ref, () => ({
    animateMove
  }));
  
  // Create animated styles for movement
  const animatedStyle = useAnimatedStyle(() => {
    if (!isMoving.value) return {};
    
    return {
      zIndex: 20,
      transform: [
        { translateY: withSpring(direction.value * offsetY.value, SPRING_CONFIG) },
        { scale: withSpring(1.02, SPRING_CONFIG) },
      ],
      shadowColor: '#0e7490',
      shadowOpacity: withTiming(0.25, { duration: 150 }),
      shadowRadius: withTiming(10, { duration: 150 }),
      elevation: 10,
    };
  });
  
  // Background color animation
  const backgroundStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        isMoving.value ? '#179186' : '#115e59',
        { duration: isMoving.value ? 150 : 120 }
      ),
    };
  });
  
  // Helper function for formatting muscle names
  const capitalizeFirstLetter = (string: string | undefined | null) => {
    if (!string || typeof string !== 'string') return '';
    return string.charAt(0).toUpperCase() + string.slice(1).replace('_', ' ');
  };
  
  return (
    <Animated.View 
      style={[styles.container, backgroundStyle, animatedStyle]}
    >
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          
          {/* Afficher le muscle dans le format ancien (string) */}
          {exercise.muscle && (
            <View style={styles.musclesContainer}>
              <View style={styles.primaryMuscleChip}>
                <Text style={styles.muscleChipText}>
                  {capitalizeFirstLetter(exercise.muscle)}
                </Text>
              </View>
            </View>
          )}
          
          {/* Afficher les muscles dans le nouveau format (arrays) */}
          {(!exercise.muscle && (exercise.muscle_primary || exercise.muscle_secondary)) && (
            <View style={styles.musclesContainer}>
              {exercise.muscle_primary && exercise.muscle_primary.map((muscle, i) => (
                <View key={`primary-${i}`} style={styles.primaryMuscleChip}>
                  <Text style={styles.muscleChipText}>
                    {capitalizeFirstLetter(muscle)}
                  </Text>
                </View>
              ))}
              
              {exercise.muscle_secondary && exercise.muscle_secondary.map((muscle, i) => (
                <View key={`secondary-${i}`} style={styles.secondaryMuscleChip}>
                  <Text style={styles.muscleChipText}>
                    {capitalizeFirstLetter(muscle)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={styles.exerciseActions}>
          <View style={styles.actionButtons}>
            <Pressable 
              onPress={() => onInfo(exercise)} 
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Info size={20} color="#5eead4" />
            </Pressable>
            <Pressable 
              onPress={() => onRemove(exercise.id)} 
              style={styles.lastActionButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Trash2 size={20} color="#5eead4" />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.exerciseContent}>
        <View style={styles.exerciseMainContent}>
          <View style={styles.setsContainer}>
            {exercise.sets.map((set, setIndex) => (
              <View key={`${exercise.id}-set-${set.id}-${setIndex}`} style={styles.setRow}>
                <Text style={styles.setNumber}>{setIndex + 1}</Text>
                <TextInput
                  key={`${set.id}-min`}
                  style={styles.setInput}
                  value={set.minReps}
                  onChangeText={(value) => onRepInputChange?.(exercise.id, set.id, 'min', value.replace(/[^0-9]/g, ''))}
                  onBlur={() => onRepInputBlur?.(exercise.id, set.id)}
                  keyboardType="numeric"
                  placeholder="6"
                  placeholderTextColor="#5eead4"
                  maxLength={2}
                  selectTextOnFocus
                />
                <Text style={styles.setText}>to</Text>
                <TextInput
                  key={`${set.id}-max`}
                  style={styles.setInput}
                  value={set.maxReps}
                  onChangeText={(value) => onRepInputChange?.(exercise.id, set.id, 'max', value.replace(/[^0-9]/g, ''))}
                  onBlur={() => onRepInputBlur?.(exercise.id, set.id)}
                  keyboardType="numeric"
                  placeholder="12"
                  placeholderTextColor="#5eead4"
                  maxLength={2}
                  selectTextOnFocus
                />
                <Text style={styles.setText}>reps</Text>
              </View>
            ))}
          </View>

          <View style={styles.setActions}>
            {exercise.sets.length > 1 && (
              <Pressable 
                style={styles.setActionButton}
                onPress={() => onRemoveSet?.(exercise.id)}
              >
                <CircleMinus size={16} color="#5eead4" />
                <Text style={styles.setActionText}>Remove Set</Text>
              </Pressable>
            )}
            <Pressable 
              style={[styles.setActionButton, styles.addSetButton]}
              onPress={() => onAddSet?.(exercise.id)}
            >
              <Plus size={16} color="#5eead4" />
              <Text style={styles.setActionText}>Add Set</Text>
            </Pressable>
          </View>
        </View>
        
        <View style={styles.reorderButtonsContainer}>
          {index > 0 && (
            <Pressable 
              onPress={() => onMoveUp(index)} 
              style={styles.arrowButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowUp size={20} color="#5eead4" />
            </Pressable>
          )}
          {index < totalExercises - 1 && (
            <Pressable 
              onPress={() => onMoveDown(index)} 
              style={styles.arrowButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowDown size={20} color="#5eead4" />
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

export default DraggableExerciseCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    ...Platform.select({
      web: {
        // Fix for cursor type error
        // @ts-ignore 
        cursor: 'default',
        // @ts-ignore
        userSelect: 'none',
      },
    }),
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
  musclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
    marginTop: 4,
  },
  primaryMuscleChip: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  secondaryMuscleChip: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  muscleChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
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
  lastActionButton: {
    marginRight: 0,
  },
  reorderButtonsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    width: 48,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        cursor: 'text',
      },
    }),
  },
  setText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  setActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  setActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#0d3d56',
  },
  addSetButton: {
    marginLeft: 'auto',
  },
  setActionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
});