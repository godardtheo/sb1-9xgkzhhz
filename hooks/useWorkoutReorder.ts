import { useState, useCallback, useEffect } from 'react';
import { useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { Dimensions } from 'react-native';

type Workout = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  estimated_duration: string;
  exercise_count: number;
  set_count?: number;
};

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = array.slice();
  newArray.splice(to < 0 ? newArray.length + to : to, 0, newArray.splice(from, 1)[0]);
  return newArray;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

export function useWorkoutReorder(initialWorkouts: Workout[]) {
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts);
  const [reorderedWorkouts, setReorderedWorkouts] = useState<Workout[]>(initialWorkouts);
  
  // Shared values for animations
  const activeIndex = useSharedValue<number>(-1);
  const itemHeights = useSharedValue<number[]>([]);
  const itemOffsets = useSharedValue<number[]>([]);
  const itemTranslations = useSharedValue<number[]>([]);
  
  // Window dimensions for auto-scrolling
  const { height: WINDOW_HEIGHT } = Dimensions.get('window');
  
  // Keep reorderedWorkouts in sync with workouts
  useEffect(() => {
    if (workouts && workouts.length > 0) {
      setReorderedWorkouts(workouts);
    }
  }, [workouts]);

  // Update item heights and calculate offsets
  const updateItemHeight = useCallback((index: number, height: number) => {
    console.log(`[Hook updateItemHeight] Received index: ${index}, height: ${height}`);
    if (index >= 0) { 
      // --- Direct SharedValue Update --- 
      const currentHeights = itemHeights.value;
      // Ensure array is long enough, pad with 0 if needed
      while (currentHeights.length <= index) {
        currentHeights.push(0);
      }
      // Directly assign the value
      currentHeights[index] = height;
      // Trigger an update by assigning the modified array back (might be necessary)
      itemHeights.value = [...currentHeights]; // Spread to ensure change detection?
      
      // Use runOnJS to log the value from the JS thread after the update attempt
      runOnJS(console.log)(
        `[Hook updateItemHeight AFTER JS] Updated itemHeights.value[${index}]=${height}. Full array:`, 
        JSON.stringify(itemHeights.value)
      );
      // --- End Direct Update ---

      // Recalculate offsets when heights change
      const offsets: number[] = [];
      let currentOffset = 0;
      
      for (let i = 0; i < currentHeights.length; i++) {
        offsets[i] = currentOffset;
        currentOffset += currentHeights[i] || 0;
      }
      
      itemOffsets.value = offsets;
    } else {
      console.warn(`[Hook updateItemHeight] Ignored update for invalid index: ${index}`);
    }
  }, [itemHeights, itemOffsets]);
  
  // Update translations during drag
  const handleDragActive = useCallback((index: number, y: number) => {
    if (activeIndex.value !== index) {
      activeIndex.value = index;
    }
    
    // Calculate potential new index based on y position
    const draggableHeight = itemHeights.value[index] || 0;
    const draggedItemTop = y;
    const draggedItemCenter = draggedItemTop + draggableHeight / 2;
    
    let newIndex = -1;
    for (let i = 0; i < itemOffsets.value.length; i++) {
      const currentTop = itemOffsets.value[i] || 0;
      const currentHeight = itemHeights.value[i] || 0;
      const currentBottom = currentTop + currentHeight;
      
      if (i !== index && draggedItemCenter >= currentTop && draggedItemCenter <= currentBottom) {
        newIndex = i;
        break;
      }
    }
    
    if (newIndex === -1) {
      // Check if we're at the beginning or end
      if (draggedItemCenter < (itemOffsets.value[0] || 0)) {
        newIndex = 0;
      } else if (itemOffsets.value.length > 0) {
        const lastIndex = itemOffsets.value.length - 1;
        const lastBottom = (itemOffsets.value[lastIndex] || 0) + (itemHeights.value[lastIndex] || 0);
        if (draggedItemCenter > lastBottom) {
          newIndex = lastIndex;
        } else {
          newIndex = index; // Keep same index if not found
        }
      }
    }
    
    if (newIndex !== -1 && newIndex !== index) {
      const newTranslations = Array(workouts.length).fill(0);
      const height = itemHeights.value[index] || 0;
      
      if (newIndex < index) {
        // Moving upward
        for (let i = newIndex; i < index; i++) {
          newTranslations[i] = height;
        }
      } else {
        // Moving downward
        for (let i = index + 1; i <= newIndex; i++) {
          newTranslations[i] = -height;
        }
      }
      
      itemTranslations.value = newTranslations;
      return newIndex;
    }
    
    return index;
  }, [workouts.length, activeIndex, itemHeights, itemOffsets]);
  
  // Handle the end of a drag
  const handleDragEnd = useCallback((fromIndex: number, toIndex: number) => {
    // Don't do anything if the indices are the same
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= workouts.length) {
      // Reset translations when dropping at same position
      itemTranslations.value = Array(workouts.length).fill(0);
      activeIndex.value = -1;
      return;
    }
    
    // Reorder the workouts
    const newOrder = arrayMove(workouts, fromIndex, toIndex);
    setWorkouts(newOrder);
    setReorderedWorkouts(newOrder);
    
    // Reset translations
    itemTranslations.value = Array(workouts.length).fill(0);
    activeIndex.value = -1;
    
    // Recalculate offsets after reordering
    const offsets: number[] = [];
    let currentOffset = 0;
    
    for (let i = 0; i < itemHeights.value.length; i++) {
      offsets[i] = currentOffset;
      currentOffset += itemHeights.value[i] || 0;
    }
    
    // Animate to new positions
    for (let i = 0; i < offsets.length; i++) {
      itemOffsets.value[i] = withSpring(offsets[i], SPRING_CONFIG);
    }
  }, [workouts, itemHeights, itemOffsets, itemTranslations, activeIndex]);
  
  return {
    workouts,
    setWorkouts,
    reorderedWorkouts,
    setReorderedWorkouts,
    activeIndex,
    itemHeights,
    itemOffsets,
    itemTranslations,
    updateItemHeight,
    handleDragActive,
    handleDragEnd,
  };
}