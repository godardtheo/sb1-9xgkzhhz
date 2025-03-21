import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { Info, Trash2, GripVertical } from 'lucide-react-native';
import { useRef } from 'react';

type Workout = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  estimated_duration: string;
  exercise_count: number;
  set_count?: number;
};

type Props = {
  workout: Workout;
  index: number;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  onInfo: (workout: Workout) => void;
  onPress?: () => void;
  totalWorkouts: number;
  isInProgram?: boolean;
  activeIndex: Animated.SharedValue<number>;
  itemOffsets: Animated.SharedValue<number[]>;
  itemTranslations: Animated.SharedValue<number[]>;
  updateItemHeight: (index: number, height: number) => void;
  handleDragActive: (index: number, y: number) => number;
};

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

export default function DraggableWorkoutCard({
  workout,
  index,
  onDragEnd,
  onRemove,
  onInfo,
  onPress,
  totalWorkouts,
  isInProgram = false,
  activeIndex,
  itemOffsets,
  itemTranslations,
  updateItemHeight,
  handleDragActive,
}: Props) {
  const isDragging = useSharedValue(false);
  const dragY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);

  const gesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      isDragging.value = true;
      activeIndex.value = index;
      scale.value = withSpring(1.03, SPRING_CONFIG);
      zIndex.value = 1000;
    })
    .onUpdate((event) => {
      dragY.value = event.translationY;
      const currentY = (itemOffsets.value[index] || 0) + event.translationY;
      runOnJS(handleDragActive)(index, currentY);
    })
    .onEnd((event) => {
      const finalY = (itemOffsets.value[index] || 0) + event.translationY;
      const newIndex = handleDragActive(index, finalY);
      
      scale.value = withSpring(1, SPRING_CONFIG);
      zIndex.value = withTiming(1);
      isDragging.value = false;
      dragY.value = withSpring(0, SPRING_CONFIG);
      
      if (newIndex !== index && newIndex >= 0 && newIndex < totalWorkouts) {
        runOnJS(onDragEnd)(index, newIndex);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (isDragging.value) {
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
      return {
        transform: [
          { translateY: withSpring(itemTranslations.value[index] || 0, SPRING_CONFIG) },
          { scale: 1 }
        ],
        zIndex: 1,
      };
    }
    
    return {
      transform: [
        { translateY: withSpring(0, SPRING_CONFIG) },
        { scale: 1 }
      ],
      zIndex: 1,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View 
        style={[styles.container, animatedStyle]}
        onLayout={(event) => {
          updateItemHeight(index, event.nativeEvent.layout.height);
        }}
      >
        <Pressable 
          style={styles.content}
          onPress={onPress}
          disabled={isDragging.value}
        >
          <View style={styles.mainContent}>
            <Text style={styles.title}>{workout.name}</Text>
            <View style={styles.stats}>
              <Text style={styles.statsText}>
                {workout.exercise_count} exercises • {workout.set_count} sets • {workout.estimated_duration}
              </Text>
            </View>
            <View style={styles.muscleChips}>
              {workout.muscles.slice(0, 3).map((muscle, idx) => (
                <View key={muscle} style={styles.muscleChip}>
                  <Text style={styles.muscleChipText}>
                    {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                  </Text>
                </View>
              ))}
              {workout.muscles.length > 3 && (
                <View style={[styles.muscleChip, styles.moreChip]}>
                  <Text style={styles.muscleChipText}>
                    +{workout.muscles.length - 3}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable 
              onPress={() => onInfo(workout)}
              style={styles.actionButton}
              hitSlop={8}
            >
              <Info size={20} color="#5eead4" />
            </Pressable>
            
            <Pressable 
              onPress={() => onRemove(workout.id)}
              style={styles.actionButton}
              hitSlop={8}
            >
              <Trash2 size={20} color="#5eead4" />
            </Pressable>

            <View style={styles.dragHandle}>
              <GripVertical size={20} color="#5eead4" />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#115e59',
    borderRadius: 16,
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
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 8,
  },
  stats: {
    marginBottom: 12,
  },
  statsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  muscleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleChip: {
    backgroundColor: '#0d9488',
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
    color: '#f0fdfa',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  dragHandle: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'grab',
      },
    }),
  },
});