import { View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { Trash2, GripVertical, Info, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react-native';
import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDuration, parseDurationToMinutes } from '@/lib/utils/formatDuration';

// Define the structure for muscle counts, mirroring the definition in parent screens
type MuscleCount = {
  muscle: string;
  setCount: number;
};

type Workout = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[]; // Keep basic list for now, might be unused depending on final implementation
  musclesWithCounts: MuscleCount[]; // Expect the sorted list with counts
  estimated_duration: string;
  exercise_count?: number; // Keep optional as parent might not always provide it
  set_count?: number; // Total set count
  template_id?: string; // Added for program workout reference
};

type Props = {
  workout: Workout;
  index: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (id: string) => void;
  onPress?: () => void;
  onInfo?: (workout: Workout) => void;
  totalWorkouts: number;
  scrollRef?: React.RefObject<any>;
};

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 180,
  mass: 0.5,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

const DraggableWorkoutCard = forwardRef<
  { animateMove: (direction: -1 | 1, distance: number) => void },
  Props
>(({ workout, index, onMoveUp, onMoveDown, onRemove, onPress, onInfo, totalWorkouts }, ref) => {
  // Animation values
  const isMoving = useSharedValue(false);
  const offsetY = useSharedValue(0);
  const direction = useSharedValue(0); // -1 for up, 1 for down

  // Setup animation method that can be called from parent
  const animateMove = (dir: -1 | 1, distance: number) => {
    direction.value = dir;
    offsetY.value = distance;
    isMoving.value = true;
    setTimeout(() => {
      isMoving.value = false;
      offsetY.value = 0;
    }, 250);
  };
  useImperativeHandle(ref, () => ({ animateMove }));

  // Animated styles
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
  const backgroundStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        isMoving.value ? '#179186' : '#115e59',
        { duration: isMoving.value ? 150 : 120 }
      ),
    };
  });

  // Helper to capitalize first letter
  const capitalizeFirstLetter = (string: string) => {
    if (!string || typeof string !== 'string') return '';
    return string.charAt(0).toUpperCase() + string.slice(1).replace('_', ' ');
  };

  return (
    <View style={webOnlyStyle as any}>
      <Animated.View style={[styles.container, backgroundStyle, animatedStyle]}>
        <View style={styles.workoutHeader}>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutName}>{workout.name}</Text>
            <View style={styles.workoutDetails}>
              <Text style={styles.workoutStats}>
                {workout.exercise_count} exercises • {workout.set_count || 0} sets • {formatDuration(parseDurationToMinutes(workout.estimated_duration))}
              </Text>
            </View>
          </View>
          <View style={styles.workoutActions}>
            {onInfo && (
              <Pressable onPress={() => onInfo(workout)} style={styles.actionButton} hitSlop={8}>
                <Info size={20} color="#5eead4" />
              </Pressable>
            )}
            <Pressable onPress={() => onRemove(workout.id)} style={styles.actionButton} hitSlop={8}>
              <Trash2 size={20} color="#5eead4" />
            </Pressable>
          </View>
        </View>
        <View style={styles.workoutContent}>
          <View style={styles.muscleChips}>
            {workout.musclesWithCounts && workout.musclesWithCounts.slice(0, 2).map((muscleInfo) => (
              <View key={muscleInfo.muscle || 'unknown'} style={styles.muscleChip}>
                <Text style={styles.muscleChipText}>{capitalizeFirstLetter(muscleInfo.muscle)}</Text>
              </View>
            ))}
            {workout.musclesWithCounts && workout.musclesWithCounts.length > 2 && (
              <View style={[styles.muscleChip, styles.moreChip]}>
                <Text style={styles.muscleChipText}>+{workout.musclesWithCounts.length - 2}</Text>
              </View>
            )}
          </View>
          {onPress && (
            <Pressable onPress={onPress} style={styles.viewButton}>
              <ChevronRight size={20} color="#5eead4" />
            </Pressable>
          )}
        </View>
        {/* Up/Down buttons à la place du drag handle */}
        <View style={styles.reorderButtonsContainer}>
          {index > 0 && (
            <Pressable onPress={() => onMoveUp(index)} style={styles.arrowButton} hitSlop={8}>
              <ArrowUp size={20} color="#5eead4" />
            </Pressable>
          )}
          {index < totalWorkouts - 1 && (
            <Pressable onPress={() => onMoveDown(index)} style={styles.arrowButton} hitSlop={8}>
              <ArrowDown size={20} color="#5eead4" />
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
});

export default DraggableWorkoutCard;

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
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutInfo: {
    flex: 1,
    marginRight: 16,
  },
  workoutName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  workoutDetails: {
    marginBottom: 8,
  },
  workoutStats: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  workoutActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  workoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  muscleChip: {
    backgroundColor: '#0d3d56',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  moreChip: {
    backgroundColor: '#134e4a',
  },
  muscleChipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  viewButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderButtonsContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    width: 'auto',
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0d3d56',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 0,
  },
});

// Ajout d'un style web spécifique à appliquer sur un wrapper View (pas Animated.View)
const webOnlyStyle = Platform.OS === 'web' ? { cursor: 'default', userSelect: 'none' } : {};