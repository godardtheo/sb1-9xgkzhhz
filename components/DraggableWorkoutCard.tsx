import { View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  SharedValue,
  Layout,
  SequencedTransition,
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

// Renommer et aligner avec le type utilisé dans les écrans parents
type WorkoutCardData = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  musclesWithCounts: MuscleCount[]; // Ajouter ce champ
  estimated_duration: string;
  exercise_count?: number;
  set_count?: number; 
  template_id?: string;
};

type Props = {
  workout: WorkoutCardData; // Utiliser le type aligné
  index: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (id: string) => void;
  onPress?: () => void;
  onInfo?: (workout: WorkoutCardData) => void;
  totalWorkouts: number;
  scrollRef?: React.RefObject<any>;
};

const DraggableWorkoutCard = forwardRef<
  {},
  Props
>(({ workout, index, onMoveUp, onMoveDown, onRemove, onPress, onInfo, totalWorkouts }, ref) => {
  // Helper to capitalize first letter
  const capitalizeFirstLetter = (string: string) => {
    if (!string || typeof string !== 'string') return '';
    return string.charAt(0).toUpperCase() + string.slice(1).replace('_', ' ');
  };

  return (
    <Animated.View 
      layout={Layout.springify().damping(18).stiffness(180)}
      style={[styles.container]}
    >
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
    gap: 6,
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
    ...Platform.select({
      android: {
        width: 36,
        height: 36,
        borderRadius: 18,
      }
    })
  },
});

// Ajout d'un style web spécifique à appliquer sur un wrapper View (pas Animated.View)
// On supprime l'utilisation de cette variable pour l'instant
// const webOnlyStyle = Platform.OS === 'web' ? { cursor: 'default', userSelect: 'none' } : {};