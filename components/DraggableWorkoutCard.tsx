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
import { Trash2, GripVertical, Info, ChevronRight } from 'lucide-react-native';
import { useRef, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Workout = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  estimated_duration: string;
  exercise_count: number;
  set_count?: number;
  template_id?: string; // Added for program workout reference
};

type Props = {
  workout: Workout;
  index: number;
  onDragEnd: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onPress?: () => void;
  onInfo?: (workout: Workout) => void;
  totalWorkouts: number;
  isInProgram?: boolean; // Flag to indicate if this is a program workout
  
  // DnD props
  activeIndex: SharedValue<number>;
  itemOffsets: SharedValue<number[]>;
  itemTranslations: SharedValue<number[]>;
  updateItemHeight: (index: number, height: number) => void;
  handleDragActive: (index: number, y: number) => number;
};

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

export default function DraggableWorkoutCard({
  workout,
  index,
  onDragEnd,
  onRemove,
  onPress,
  onInfo,
  totalWorkouts,
  isInProgram = false,
  
  // DnD props
  activeIndex,
  itemOffsets,
  itemTranslations,
  updateItemHeight,
  handleDragActive,
}: Props) {
  // Local animated values
  const isDragging = useSharedValue(false);
  const dragY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const opacity = useSharedValue(1);
  const backgroundColor = useSharedValue('#115e59');
  const autoScrollActive = useRef(false);
  const autoScrollFrame = useRef<number | null>(null);
  const draggingEnabled = useSharedValue(true);
  const touchY = useSharedValue(0);
  
  // State for workout metrics
  const [exerciseCount, setExerciseCount] = useState(workout.exercise_count || 0);
  const [setCount, setSetCount] = useState(workout.set_count || 0);
  
  // Fetch accurate exercise and set counts
  useEffect(() => {
    fetchWorkoutMetrics();
  }, [workout.id]);
  
  const fetchWorkoutMetrics = async () => {
    try {
      // Determine the correct ID to use for querying template exercises
      // If this is a program workout and template_id exists, use that instead of id
      const templateId = isInProgram && workout.template_id ? workout.template_id : workout.id;
      
      console.log(`Fetching metrics for workout: ${workout.name}, ID: ${templateId}`);

      // Get exercise count
      const { count: count, error: exerciseError } = await supabase
        .from('template_exercises')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', templateId);
        
      if (exerciseError) {
        console.error('Error fetching exercise count:', exerciseError);
      } else if (count !== null) {
        console.log(`Found ${count} exercises for workout ${workout.name}`);
        setExerciseCount(count);
      }
      
      // First get the template exercise IDs
      const { data: exerciseIds, error: exerciseIdsError } = await supabase
        .from('template_exercises')
        .select('id')
        .eq('template_id', templateId);
        
      if (exerciseIdsError) {
        console.error('Error fetching exercise IDs:', exerciseIdsError);
      } else if (exerciseIds && exerciseIds.length > 0) {
        const ids = exerciseIds.map(ex => ex.id);
        
        // Now use those IDs to get the set count
        const { count: setCountResult, error: setError } = await supabase
          .from('template_exercise_sets')
          .select('*', { count: 'exact', head: true })
          .in('template_exercise_id', ids);
          
        if (setError) {
          console.error('Error fetching set count:', setError);
        } else if (setCountResult !== null) {
          console.log(`Found ${setCountResult} sets for workout ${workout.name}`);
          setSetCount(setCountResult);
        }
      } else {
        console.log(`No exercise IDs found for workout ${workout.name}`);
      }
    } catch (error) {
      console.error('Error in fetchWorkoutMetrics:', error);
    }
  };
  
  // If we already have exercise and set count from props, use those as initial values
  useEffect(() => {
    if (workout.exercise_count > 0) {
      setExerciseCount(workout.exercise_count);
    }
    if (workout.set_count && workout.set_count > 0) {
      setSetCount(workout.set_count);
    }
  }, [workout.exercise_count, workout.set_count]);
  
  // Animation constants
  const SCROLL_THRESHOLD = 120; // px from edge to trigger auto-scroll
  const MAX_SCROLL_SPEED = 8; // Maximum scroll speed in px per frame
  const { height: WINDOW_HEIGHT } = Dimensions.get('window');
  
  // Handle layout to measure the card height
  const handleLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    updateItemHeight(index, height);
  };
  
  // Create pan gesture for dragging
  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onTouchesDown(() => {
      if (!draggingEnabled.value) return;
    })
    .onStart(() => {
      if (!draggingEnabled.value) return;
      
      isDragging.value = true;
      activeIndex.value = index;
      
      // Visual feedback
      scale.value = withSpring(1.03, SPRING_CONFIG);
      opacity.value = withTiming(0.9);
      backgroundColor.value = withTiming('#134e4a');
      zIndex.value = 1000;
    })
    .onUpdate((event) => {
      if (!isDragging.value) return;
      
      dragY.value = event.translationY;
      touchY.value = event.absoluteY;
      
      // Calculate current position for updating other cards
      const currentY = (itemOffsets.value[index] || 0) + event.translationY;
      
      // Update other cards based on dragged position
      runOnJS(handleDragActive)(index, currentY);
    })
    .onEnd(() => {
      if (!isDragging.value) return;
      
      // Calculate final position
      const finalY = (itemOffsets.value[index] || 0) + dragY.value;
      const newIndex = handleDragActive(index, finalY);
      
      // Reset visual state
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withTiming(1);
      backgroundColor.value = withTiming('#115e59');
      zIndex.value = withTiming(1);
      isDragging.value = false;
      dragY.value = withSpring(0, SPRING_CONFIG);
      
      // Update positions if needed
      if (newIndex !== index && newIndex >= 0 && newIndex < totalWorkouts) {
        runOnJS(onDragEnd)(index, newIndex);
      }
    })
    .onFinalize(() => {
      // Reset everything
      isDragging.value = false;
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withTiming(1);
      backgroundColor.value = withTiming('#115e59');
      zIndex.value = withTiming(1);
      dragY.value = withSpring(0, SPRING_CONFIG);
    });

  // Allow scrolling when not dragging
  const scrollGesture = Gesture.Pan()
    .onTouchesDown(() => {
      draggingEnabled.value = true;
    })
    .onStart(() => {
      if (isDragging.value) return;
    })
    .onUpdate(() => {
      if (isDragging.value) return;
    })
    .onEnd(() => {
      if (isDragging.value) return;
    });
  
  // Combine gestures with proper priorities
  const combinedGesture = Gesture.Exclusive(dragGesture, scrollGesture);

  // Create animated styles
  const animatedStyle = useAnimatedStyle(() => {
    if (isDragging.value) {
      return {
        transform: [
          { translateY: dragY.value },
          { scale: scale.value }
        ],
        zIndex: zIndex.value,
        opacity: opacity.value,
        backgroundColor: backgroundColor.value,
        shadowOpacity: 0.3,
        elevation: 8,
      };
    } else if (activeIndex.value !== -1) {
      // Another card is being dragged
      return {
        transform: [
          { translateY: withSpring(itemTranslations.value[index] || 0, SPRING_CONFIG) },
          { scale: 1 }
        ],
        zIndex: 1,
        opacity: 1,
        backgroundColor: '#115e59',
      };
    }
    
    // Default state
    return {
      transform: [
        { translateY: withSpring(0, SPRING_CONFIG) },
        { scale: 1 }
      ],
      zIndex: 1,
      opacity: 1,
      backgroundColor: '#115e59',
    };
  });

  // Clean up auto-scroll on unmount
  useEffect(() => {
    return () => {
      if (autoScrollFrame.current !== null) {
        cancelAnimationFrame(autoScrollFrame.current);
      }
    };
  }, []);

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View 
        style={[styles.container, animatedStyle]}
        onLayout={handleLayout}
      >
        <View style={styles.workoutHeader}>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutName}>{workout.name}</Text>
            <View style={styles.workoutDetails}>
              <Text style={styles.workoutStats}>
                {exerciseCount} exercises • {setCount} sets • {workout.estimated_duration}
              </Text>
            </View>
          </View>
          <View style={styles.workoutActions}>
            {onInfo && (
              <Pressable 
                onPress={() => onInfo(workout)}
                style={styles.actionButton}
                hitSlop={8}
              >
                <Info size={20} color="#5eead4" />
              </Pressable>
            )}
            <Pressable 
              onPress={() => onRemove(workout.id)}
              style={styles.actionButton}
              hitSlop={8}
            >
              <Trash2 size={20} color="#5eead4" />
            </Pressable>
          </View>
        </View>

        <View style={styles.workoutContent}>
          <View style={styles.muscleChips}>
            {workout.muscles && workout.muscles.slice(0, 3).map((muscle) => (
              <View key={muscle} style={styles.muscleChip}>
                <Text style={styles.muscleChipText}>
                  {muscle.charAt(0).toUpperCase() + muscle.slice(1).replace('_', ' ')}
                </Text>
              </View>
            ))}
            {workout.muscles && workout.muscles.length > 3 && (
              <View style={[styles.muscleChip, styles.moreChip]}>
                <Text style={styles.muscleChipText}>
                  +{workout.muscles.length - 3}
                </Text>
              </View>
            )}
          </View>
          
          {onPress && (
            <Pressable onPress={onPress} style={styles.viewButton}>
              <ChevronRight size={20} color="#5eead4" />
            </Pressable>
          )}
        </View>

        <View style={styles.dragHandleContainer}>
          <Animated.View style={[
            styles.dragHandle,
            useAnimatedStyle(() => ({
              backgroundColor: withTiming(
                isDragging.value ? '#134e4a' : '#0d3d56', 
                { duration: 200 }
              ),
              transform: [{ scale: withSpring(isDragging.value ? 1.1 : 1, SPRING_CONFIG) }]
            }))
          ]}>
            <GripVertical size={20} color="#5eead4" />
          </Animated.View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

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
        cursor: 'default',
        userSelect: 'none',
      },
    }),
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
  dragHandleContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...Platform.select({
      web: {
        cursor: 'grab',
      },
    }),
  },
  dragHandle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0d3d56',
    justifyContent: 'center',
    alignItems: 'center',
  },
});