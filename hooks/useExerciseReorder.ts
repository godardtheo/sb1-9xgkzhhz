import { useState, useCallback, useEffect } from 'react';
import { useSharedValue, withSpring } from 'react-native-reanimated';

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

export function useExerciseReorder(initialExercises: Exercise[]) {
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [reorderedExercises, setReorderedExercises] = useState<Exercise[]>(initialExercises);
  
  // Shared values for animations
  const activeIndex = useSharedValue<number>(-1);
  const itemHeights = useSharedValue<number[]>([]);
  const itemOffsets = useSharedValue<number[]>([]);
  const itemTranslations = useSharedValue<number[]>([]);
  
  // Keep reorderedExercises in sync with exercises
  useEffect(() => {
    setReorderedExercises(exercises);
  }, [exercises]);

  // Update item heights and calculate offsets
  const updateItemHeight = useCallback((index: number, height: number) => {
    if (index >= 0 && index < exercises.length) {
      // Update height at specific index
      const newHeights = [...itemHeights.value];
      newHeights[index] = height;
      itemHeights.value = newHeights;
      
      // Recalculate offsets when heights change
      const offsets: number[] = [];
      let currentOffset = 0;
      
      for (let i = 0; i < newHeights.length; i++) {
        offsets[i] = currentOffset;
        currentOffset += newHeights[i] || 0;
      }
      
      itemOffsets.value = offsets;
    }
  }, [exercises.length, itemHeights]);
  
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
      const newTranslations = Array(exercises.length).fill(0);
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
  }, [exercises.length, activeIndex, itemHeights, itemOffsets]);
  
  // Handle the end of a drag
  const handleDragEnd = useCallback((fromIndex: number, toIndex: number) => {
    // Don't do anything if the indices are the same
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= exercises.length) {
      // Reset translations when dropping at same position
      itemTranslations.value = Array(exercises.length).fill(0);
      activeIndex.value = -1;
      return;
    }
    
    // Reorder the exercises
    const newOrder = arrayMove(exercises, fromIndex, toIndex);
    setExercises(newOrder);
    setReorderedExercises(newOrder);
    
    // Reset translations
    itemTranslations.value = Array(exercises.length).fill(0);
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
  }, [exercises, itemHeights, itemOffsets, itemTranslations, activeIndex]);
  
  return {
    exercises,
    setExercises,
    reorderedExercises, 
    setReorderedExercises,
    activeIndex,
    itemHeights,
    itemOffsets,
    itemTranslations,
    updateItemHeight,
    handleDragActive,
    handleDragEnd,
  };
}