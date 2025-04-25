import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  Trash2,
  Info,
  GripVertical,
  Plus,
  CircleMinus,
} from 'lucide-react-native';
import { useRef, useState, useEffect } from 'react';
import { Checkbox } from './Checkbox';

const { width, height } = Dimensions.get('window');

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

type Props = {
  exercise: Exercise;
  index: number;
  onRemove: (id: string) => void;
  onSetUpdate: (
    exerciseId: string,
    setIndex: number,
    field: 'weight' | 'reps' | 'completed',
    value: string | boolean
  ) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string) => void;
  onInfo: () => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  isInWorkout?: boolean;
};

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

export default function LiveExerciseCard({
  exercise,
  index,
  onRemove,
  onSetUpdate,
  onAddSet,
  onRemoveSet,
  onInfo,
  onReorder,
  isInWorkout = false,
}: Props) {
  // Local animated values
  const isDragging = useSharedValue(false);
  const dragY = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const opacity = useSharedValue(1);
  const [measurements, setMeasurements] = useState({ height: 0, y: 0 });
  const scrollOffset = useSharedValue(0);
  const screenHeight = height;

  // For tracking auto-scrolling
  const isScrolling = useSharedValue(false);
  const scrollDirection = useSharedValue(0); // -1 for up, 1 for down, 0 for none
  const scrollTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Clean up timer on unmount
      if (scrollTimer.current) {
        clearInterval(scrollTimer.current);
      }
    };
  }, []);

  // Create pan gesture for dragging, if reordering is enabled
  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(event => {
      isDragging.value = true;
      scale.value = withSpring(1.03, SPRING_CONFIG);
      opacity.value = withTiming(0.9);
      zIndex.value = 1000;
      startY.value = measurements.y;
    })
    .onUpdate(event => {
      if (!isDragging.value) return;
      
      dragY.value = event.translationY;
      
      // Check if we need to auto-scroll
      const touchY = event.absoluteY;
      const SCROLL_THRESHOLD = 120; // pixels from edge to start scrolling
      
      if (touchY < SCROLL_THRESHOLD) {
        // Near top edge, scroll up
        scrollDirection.value = -1;
        if (!isScrolling.value) {
          isScrolling.value = true;
          if (scrollTimer.current) clearInterval(scrollTimer.current);
          scrollTimer.current = setInterval(() => {
            // This would need to communicate with the parent component
            // We can only signal intent here
            const intensity = Math.max(0, 1 - touchY / SCROLL_THRESHOLD);
            console.log('Should scroll up', intensity);
          }, 16);
        }
      } else if (touchY > screenHeight - SCROLL_THRESHOLD) {
        // Near bottom edge, scroll down
        scrollDirection.value = 1;
        if (!isScrolling.value) {
          isScrolling.value = true;
          if (scrollTimer.current) clearInterval(scrollTimer.current);
          scrollTimer.current = setInterval(() => {
            const intensity = Math.max(0, 1 - (screenHeight - touchY) / SCROLL_THRESHOLD);
            console.log('Should scroll down', intensity);
          }, 16);
        }
      } else {
        // Not near edges, cancel auto-scrolling
        if (isScrolling.value) {
          isScrolling.value = false;
          scrollDirection.value = 0;
          if (scrollTimer.current) {
            clearInterval(scrollTimer.current);
            scrollTimer.current = null;
          }
        }
      }
    })
    .onEnd(event => {
      if (!isDragging.value || !onReorder) return;

      // Stop any auto-scrolling
      if (scrollTimer.current) {
        clearInterval(scrollTimer.current);
        scrollTimer.current = null;
      }
      isScrolling.value = false;
      scrollDirection.value = 0;

      // Calculate new index based on position
      const newIndex = Math.round(
        (startY.value + dragY.value) / measurements.height
      );
      if (newIndex !== index && newIndex >= 0) {
        runOnJS(onReorder)(index, newIndex);
      }

      // Reset animations
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withTiming(1);
      zIndex.value = withTiming(1);
      isDragging.value = false;
      dragY.value = withSpring(0, SPRING_CONFIG);
    })
    .onFinalize(() => {
      // Reset animations and clean up
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withTiming(1);
      zIndex.value = withTiming(1);
      isDragging.value = false;
      dragY.value = withSpring(0, SPRING_CONFIG);
      
      // Ensure auto-scrolling is stopped
      if (scrollTimer.current) {
        clearInterval(scrollTimer.current);
        scrollTimer.current = null;
      }
      isScrolling.value = false;
      scrollDirection.value = 0;
    });

  // For text input values
  const handleInputChange = (
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    // Allow decimal values for both weight and reps
    const filteredValue = value.replace(/[^0-9.]/g, '');
    onSetUpdate(exercise.id, setIndex, field, filteredValue);
  };

  // For gérer l'état de focus des inputs
  const [focusedInputs, setFocusedInputs] = useState<{[key: string]: boolean}>({});
  
  // Quand l'input reçoit le focus, on met à jour l'état
  const handleFocus = (setIndex: number, field: 'weight' | 'reps') => {
    const inputKey = `${setIndex}-${field}`;
    setFocusedInputs(prev => ({...prev, [inputKey]: true}));
  };
  
  // Quand l'input perd le focus, on met à jour l'état
  const handleBlur = (setIndex: number, field: 'weight' | 'reps') => {
    const inputKey = `${setIndex}-${field}`;
    setFocusedInputs(prev => ({...prev, [inputKey]: false}));
    
    // Si la valeur est vide et que le champ a perdu le focus, on réinitialise à '0'
    const set = exercise.sets[setIndex];
    if (field === 'weight' && set && (!set[field] || set[field] === '')) {
      onSetUpdate(exercise.id, setIndex, field, '0');
    }
  };

  // For checkbox
  const handleSetCompleted = (setIndex: number, completed: boolean) => {
    onSetUpdate(exercise.id, setIndex, 'completed', completed);
  };

  // Format previous performance data
  const formatPreviousPerformance = (reps?: string, weight?: string) => {
    if (reps && weight && reps !== '0' && weight !== '0') {
      return `${reps}×${weight}kg`;
    }
    return '-';
  };

  // Helper to capitalize first letter
  const capitalizeFirstLetter = (string: string) => {
    if (!string || typeof string !== 'string') return '';
    return string.charAt(0).toUpperCase() + string.slice(1).replace('_', ' ');
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    if (isDragging.value) {
      return {
        transform: [{ translateY: dragY.value }, { scale: scale.value }],
        zIndex: zIndex.value,
        opacity: opacity.value,
        shadowOpacity: 0.3,
        elevation: 8,
      };
    }

    return {
      transform: [{ translateY: withSpring(0, SPRING_CONFIG) }, { scale: 1 }],
      zIndex: 1,
      opacity: 1,
    };
  });

  // Function to measure component position
  const onLayout = (event: any) => {
    const { height, y } = event.nativeEvent.layout;
    setMeasurements({ height, y });
  };

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      onLayout={onLayout}
    >
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.muscleChips}>
            {/* Primary Muscles */}
            {exercise.muscle_primary && exercise.muscle_primary.length > 0 ? (
              exercise.muscle_primary.map((muscle, index) => (
                <View 
                  key={`primary-${index}`} 
                  style={[styles.muscleChip, styles.primaryTag]}
                >
                  <Text style={styles.primaryTagText}>
                    {capitalizeFirstLetter(muscle)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={[styles.muscleChip, styles.primaryTag]}>
                <Text style={styles.primaryTagText}>No primary muscles</Text>
              </View>
            )}
            
            {/* Secondary Muscles */}
            {exercise.muscle_secondary && exercise.muscle_secondary.length > 0 && 
              exercise.muscle_secondary.map((muscle, index) => (
                <View 
                  key={`secondary-${index}`} 
                  style={[styles.muscleChip, styles.secondaryTag]}
                >
                  <Text style={styles.secondaryTagText}>
                    {capitalizeFirstLetter(muscle)}
                  </Text>
                </View>
              ))
            }
          </View>
        </View>
        <View style={styles.exerciseActions}>
          <Pressable onPress={onInfo} style={styles.actionButton} hitSlop={8}>
            <Info size={20} color="#5eead4" />
          </Pressable>
          <Pressable
            onPress={() => onRemove(exercise.id)}
            style={styles.actionButton}
            hitSlop={8}
          >
            <Trash2 size={20} color="#5eead4" />
          </Pressable>
        </View>
      </View>

      <View style={styles.setsContainer}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text
            style={[styles.setCell, styles.setHeaderCell, styles.setNumberCell]}
          >
            #
          </Text>
          <Text
            style={[
              styles.setCell,
              styles.setHeaderCell,
              styles.setPreviousCell,
            ]}
          >
            Previous
          </Text>
          <Text
            style={[styles.setCell, styles.setHeaderCell, styles.setWeightCell]}
          >
            kg
          </Text>
          <Text
            style={[styles.setCell, styles.setHeaderCell, styles.setRepsCell]}
          >
            reps
          </Text>
          <Text
            style={[styles.setCell, styles.setHeaderCell, styles.setCheckCell]}
          ></Text>
        </View>

        {/* Set rows */}
        {exercise.sets.map((set, setIndex) => (
          <View key={`set-${set.id}`} style={styles.setRow}>
            <Text style={[styles.setCell, styles.setNumberCell, styles.captionText]}>
              {setIndex + 1}
            </Text>

            <View style={[styles.setCell, styles.setPreviousCell]}>
              <Text style={styles.previousText}>
                {formatPreviousPerformance(set.previousReps, set.previousWeight)}
              </Text>
            </View>

            <View style={[styles.setCell, styles.setWeightCell]}>
              <TextInput
                style={[styles.input, set.completed && styles.completedInput]}
                value={focusedInputs[`${setIndex}-weight`] && set.weight === '0' ? '' : set.weight}
                onChangeText={(value) =>
                  handleInputChange(setIndex, 'weight', value)
                }
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#5eead4"
                editable={isInWorkout && !set.completed}
                onFocus={() => handleFocus(setIndex, 'weight')}
                onBlur={() => handleBlur(setIndex, 'weight')}
              />
            </View>

            <View style={[styles.setCell, styles.setRepsCell]}>
              <TextInput
                style={[styles.input, set.completed && styles.completedInput]}
                value={set.reps}
                onChangeText={(value) =>
                  handleInputChange(setIndex, 'reps', value)
                }
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#5eead4"
                editable={isInWorkout && !set.completed}
                onFocus={() => handleFocus(setIndex, 'reps')}
                onBlur={() => handleBlur(setIndex, 'reps')}
              />
            </View>

            <View style={[styles.setCell, styles.setCheckCell]}>
              {isInWorkout && (
                <Checkbox
                  checked={set.completed}
                  onChange={(checked) => handleSetCompleted(setIndex, checked)}
                  disabled={!set.weight || !set.reps}
                />
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footerContainer}>
        <View style={styles.setActions}>
          <Pressable
            style={styles.setActionButton}
            onPress={() => onAddSet(exercise.id)}
          >
            <Plus size={16} color="#5eead4" />
            <Text style={styles.setActionText}>Add Set</Text>
          </Pressable>

          {exercise.sets.length > 1 && (
            <Pressable
              style={styles.setActionButton}
              onPress={() => onRemoveSet(exercise.id)}
            >
              <CircleMinus size={16} color="#5eead4" />
              <Text style={styles.setActionText}>Remove Set</Text>
            </Pressable>
          )}
        </View>
        
        {onReorder && (
          <GestureDetector gesture={dragGesture}>
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle}>
                <GripVertical size={20} color="#5eead4" />
              </View>
            </View>
          </GestureDetector>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#115e59',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      cursor: 'default',
      // @ts-ignore
      userSelect: 'none',
    } : {}),
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  muscleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  muscleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryTag: {
    backgroundColor: '#0d9488',
  },
  secondaryTag: {
    backgroundColor: '#164e63',
  },
  primaryTagText: {
    color: '#f0fdfa',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  secondaryTagText: {
    color: '#a5f3fc',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  muscleChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#f0fdfa',
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  setsContainer: {
    marginBottom: 16,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    height: 44,
  },
  setCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  setHeaderCell: {
    marginBottom: 8,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    height: 24,
    lineHeight: 24,
  },
  setNumberCell: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setPreviousCell: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setWeightCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setRepsCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setCheckCell: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  previousText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#0d3d56',
    width: '90%',
    height: 36,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ccfbf1',
    textAlign: 'center',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  completedInput: {
    backgroundColor: '#134e4a',
    color: '#14b8a6',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setActions: {
    flexDirection: 'row',
    gap: 12,
  },
  setActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d3d56',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  setActionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    marginLeft: 8,
  },
  dragHandleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0d3d56',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      cursor: 'grab',
    } : {}),
  },
});