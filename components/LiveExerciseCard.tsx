import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  Layout,
} from 'react-native-reanimated';
import {
  Trash2,
  Info,
  ArrowUp,
  ArrowDown,
  CircleMinus,
  Plus,
} from 'lucide-react-native';
import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Checkbox } from './Checkbox';

const { width, height } = Dimensions.get('window');

type Exercise = {
  id: string;
  name: string;
  muscle_primary?: string[];
  muscle_secondary?: string[];
  equipment?: string | string[];
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
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  totalExercises?: number;
  isInWorkout?: boolean;
};

const LiveExerciseCard = forwardRef<
  {},
  Props
>(({ exercise, index, onRemove, onSetUpdate, onAddSet, onRemoveSet, onInfo, onMoveUp, onMoveDown, totalExercises, isInWorkout = false }, ref) => {
  const [measurements, setMeasurements] = useState({ height: 0, y: 0 });
  const screenHeight = height;

  // For text input values
  const handleInputChange = (
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    // Allow decimal values for both weight and reps, accepting both comma and period
    let filteredValue = value.replace(/[^0-9.,]/g, ''); // <-- Allow comma
    
    // Replace comma with period for consistency before saving
    filteredValue = filteredValue.replace(',', '.'); // <-- Convert comma
    
    // Ensure only one decimal point exists
    const parts = filteredValue.split('.');
    if (parts.length > 2) {
      // If more than one dot, keep only the first one
      filteredValue = parts[0] + '.' + parts.slice(1).join('');
    }

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

  return (
    <Animated.View
      layout={Layout.springify().damping(18).stiffness(180)}
      style={[styles.container as any]}
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
                  disabled={(!set.weight || set.weight === '0') || set.reps === ''}
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
        
        <View style={styles.reorderButtonsContainer}>
          {typeof onMoveUp === 'function' && index > 0 && (
            <Pressable onPress={() => onMoveUp(index)} style={styles.arrowButton} hitSlop={8}>
              <ArrowUp size={20} color="#5eead4" />
            </Pressable>
          )}
          {typeof onMoveDown === 'function' && totalExercises && index < totalExercises - 1 && (
            <Pressable onPress={() => onMoveDown(index)} style={styles.arrowButton} hitSlop={8}>
              <ArrowDown size={20} color="#5eead4" />
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

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
  },
  completedInput: {
    backgroundColor: '#134e4a',
    color: '#14b8a6',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  setActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 1,
    flexWrap: 'nowrap',
  },
  setActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d3d56',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    ...Platform.select({
      android: {
        paddingVertical: 6,
        paddingHorizontal: 10,
      }
    })
  },
  setActionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    marginLeft: 8,
    ...Platform.select({
      android: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
        marginLeft: 6,
      }
    })
  },
  reorderButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0d3d56',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 0,
    ...Platform.select({
      android: {
        width: 36,
        height: 36,
        borderRadius: 18,
      }
    })
  },
});

export default LiveExerciseCard;