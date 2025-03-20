import { View, Text, StyleSheet, Pressable, Platform, TextInput, ScrollView, LayoutChangeEvent, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useDerivedValue,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { Info, Trash2, GripVertical, Plus, CircleMinus } from 'lucide-react-native';
import { useRef, useState, useEffect } from 'react';

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

type Props = {
  exercise: Exercise;
  index: number;
  onDragEnd: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onInfo: (exercise: Exercise) => void;
  totalExercises: number;
  onAddSet?: (exerciseId: string) => void;
  onRemoveSet?: (exerciseId: string) => void;
  onUpdateReps?: (exerciseId: string, setId: string, type: 'min' | 'max', value: string) => void;
  scrollRef?: React.RefObject<ScrollView>;
  
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

export default function DraggableExerciseCard({
  exercise,
  index,
  onDragEnd,
  onRemove,
  onInfo,
  totalExercises,
  onAddSet,
  onRemoveSet,
  onUpdateReps,
  scrollRef,
  
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
  const scrollY = useSharedValue(0);
  const lastScrollY = useRef(0);
  const autoScrollSpeed = useSharedValue(0);
  const autoScrollActive = useRef(false);
  const autoScrollFrame = useRef<number | null>(null);
  const draggingEnabled = useSharedValue(true);
  const touchY = useSharedValue(0); // Capture the raw touch Y position
  
  // Animation constants
  const SCROLL_THRESHOLD = 120; // px from edge to trigger auto-scroll
  const MAX_SCROLL_SPEED = 8; // Maximum scroll speed in px per frame
  const { height: WINDOW_HEIGHT } = Dimensions.get('window');
  
  // Track scroll position
  useEffect(() => {
    if (scrollRef?.current) {
      const scrollNode = scrollRef.current;
      // This is a workaround since we can't directly hook into scroll events
      const checkScrollPosition = () => {
        if (scrollNode && 'scrollY' in scrollNode) {
          // @ts-ignore - scrollY exists on some implementations
          lastScrollY.current = scrollNode.scrollY || 0;
          scrollY.value = lastScrollY.current;
        }
      };
      const interval = setInterval(checkScrollPosition, 100);
      return () => clearInterval(interval);
    }
  }, [scrollRef]);
  
  // Stop auto-scrolling function
  const stopAutoScroll = () => {
    autoScrollActive.current = false;
    autoScrollSpeed.value = 0;
    if (autoScrollFrame.current !== null) {
      cancelAnimationFrame(autoScrollFrame.current);
      autoScrollFrame.current = null;
    }
  };
  
  // Handle auto-scrolling
  const handleAutoScroll = () => {
    if (!autoScrollActive.current || !scrollRef?.current) {
      return;
    }
    
    const scrollNode = scrollRef.current;
    
    // Apply scroll based on speed
    if (autoScrollSpeed.value !== 0) {
      // Calculate new scroll position
      const newScrollY = Math.max(0, lastScrollY.current + autoScrollSpeed.value);
      
      // Perform scroll
      scrollNode.scrollTo({
        y: newScrollY,
        animated: false,
      });
      
      // Update references
      lastScrollY.current = newScrollY;
      scrollY.value = newScrollY;
      
      // Update potential drop index based on new position
      const currentY = (itemOffsets.value[index] || 0) + dragY.value + scrollY.value;
      handleDragActive(index, currentY);
    }
    
    // Continue the animation frame loop if still active
    if (autoScrollActive.current) {
      autoScrollFrame.current = requestAnimationFrame(handleAutoScroll);
    }
  };
  
  // Start auto-scrolling
  const startAutoScroll = () => {
    if (autoScrollActive.current || !scrollRef?.current) return;
    
    autoScrollActive.current = true;
    autoScrollFrame.current = requestAnimationFrame(handleAutoScroll);
  };
  
  // Update auto-scroll speed based on touch position
  const updateAutoScrollSpeed = (touchY: number) => {
    // Get auto-scroll zones (top and bottom of screen)
    const topThreshold = SCROLL_THRESHOLD;
    const bottomThreshold = WINDOW_HEIGHT - SCROLL_THRESHOLD;
    
    // Calculate scroll speed
    if (touchY < topThreshold) {
      // Scroll up - increase negative speed as we get closer to top
      const distance = Math.max(0, topThreshold - touchY);
      const percentage = Math.min(1, distance / SCROLL_THRESHOLD);
      autoScrollSpeed.value = -MAX_SCROLL_SPEED * percentage;
      if (!autoScrollActive.current) {
        runOnJS(startAutoScroll)();
      }
    } else if (touchY > bottomThreshold) {
      // Scroll down - increase positive speed as we get closer to bottom
      const distance = Math.max(0, touchY - bottomThreshold);
      const percentage = Math.min(1, distance / SCROLL_THRESHOLD);
      autoScrollSpeed.value = MAX_SCROLL_SPEED * percentage;
      if (!autoScrollActive.current) {
        runOnJS(startAutoScroll)();
      }
    } else {
      // No auto-scroll needed
      autoScrollSpeed.value = 0;
    }
  };
  
  // Measure item height on layout
  const handleLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    updateItemHeight(index, height);
  };
  
  // Create simultaneous gesture for long press + pan
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
      zIndex.value = 1000;
      
      // Remember scroll position
      if (scrollRef?.current) {
        lastScrollY.current = scrollY.value;
      }
    })
    .onUpdate((event) => {
      if (!isDragging.value) return;
      
      // Update drag position
      dragY.value = event.translationY;
      
      // Store absolute touch position
      touchY.value = event.absoluteY;
      
      // Update auto-scroll speed based on touch position
      runOnJS(updateAutoScrollSpeed)(event.absoluteY);
      
      // Calculate current absolute position
      const currentY = (itemOffsets.value[index] || 0) + event.translationY + scrollY.value;
      
      // Update other cards based on dragged position
      runOnJS(handleDragActive)(index, currentY);
    })
    .onEnd((event) => {
      if (!isDragging.value) return;
      
      // Stop auto-scrolling
      runOnJS(stopAutoScroll)();
      
      // Calculate final position
      const finalY = (itemOffsets.value[index] || 0) + event.translationY + scrollY.value;
      const newIndex = handleDragActive(index, finalY);
      
      // Reset visual state
      scale.value = withSpring(1, SPRING_CONFIG);
      zIndex.value = withTiming(1);
      isDragging.value = false;
      dragY.value = withSpring(0, SPRING_CONFIG);
      
      // Perform reordering if needed
      if (newIndex !== index && newIndex >= 0 && newIndex < totalExercises) {
        runOnJS(onDragEnd)(index, newIndex);
      }
    })
    .onFinalize(() => {
      // Reset everything
      isDragging.value = false;
      scale.value = withSpring(1, SPRING_CONFIG);
      zIndex.value = withTiming(1);
      dragY.value = withSpring(0, SPRING_CONFIG);
      runOnJS(stopAutoScroll)();
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
      // Actively dragging this item
      return {
        transform: [
          { translateY: dragY.value },
          { scale: scale.value }
        ],
        zIndex: zIndex.value,
        shadowOpacity: 0.3,
        elevation: 8,
      };
    } else if (activeIndex.value !== -1) {
      // Another item is being dragged
      return {
        transform: [
          { translateY: withSpring(itemTranslations.value[index] || 0, SPRING_CONFIG) },
          { scale: 1 }
        ],
        zIndex: 1,
      };
    }
    
    // No dragging happening
    return {
      transform: [
        { translateY: withSpring(0, SPRING_CONFIG) },
        { scale: 1 }
      ],
      zIndex: 1,
    };
  });
  
  // Background color animation
  const backgroundStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        isDragging.value ? '#134e4a' : '#115e59', 
        { duration: 200 }
      ),
    };
  });
  
  // Handle input changes for set reps
  const handleUpdateReps = (exerciseId: string, setId: string, type: 'min' | 'max', value: string) => {
    // Filter non-numeric input
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue === '' || parseInt(numericValue) > 0) {
      onUpdateReps?.(exerciseId, setId, type, numericValue);
    }
  };
  
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
        style={[
          styles.container,
          backgroundStyle,
          animatedStyle,
        ]}
        onLayout={handleLayout}
      >
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
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
                    onChangeText={(value) => handleUpdateReps(exercise.id, set.id, 'min', value)}
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
                    onChangeText={(value) => handleUpdateReps(exercise.id, set.id, 'max', value)}
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
  lastActionButton: {
    marginRight: 0,
  },
  dragHandleContainer: {
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