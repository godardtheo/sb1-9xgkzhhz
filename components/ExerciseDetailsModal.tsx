import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Platform, useWindowDimensions, ActivityIndicator, PanResponder } from 'react-native';
import { Heart, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolate, Extrapolate, runOnJS } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import HistoryDoneExercise from './HistoryDoneExercise';

type Exercise = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  instructions?: string;
  video_url?: string;
  type?: string;
  difficulty?: string;
};

type ExerciseSet = {
  set_number: number;
  weight: number;
  reps: number;
};

type ExerciseHistory = {
  workout_id: string;
  workout_name: string;
  date: string;
  sets: ExerciseSet[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  isFavorite: boolean;
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
};

export default function ExerciseDetailsModal({ visible, onClose, exercise, isFavorite, onFavoriteToggle }: Props) {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const videoHeight = Math.min(width * 0.5625, height * 0.4); // 16:9 aspect ratio
  const [favorite, setFavorite] = useState(isFavorite);
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Animation value for modal slide
  const translateY = useSharedValue(0);
  
  // Create pan responder for swipe down gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10; // Only respond to downward swipes
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) { // Only allow downward movement
          translateY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > height * 0.2 || gestureState.vy > 0.5) {
          // Swipe down threshold reached, close modal
          translateY.value = withTiming(height, { duration: 250 }, () => {
            onClose();
            translateY.value = 0; // Reset for next time
          });
        } else {
          // Reset to original position
          translateY.value = withTiming(0);
        }
      }
    })
  ).current;

  // Update local state when props change
  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  // Reset translateY when modal becomes visible
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
    }
  }, [visible]);

  // Fetch exercise history when modal becomes visible
  useEffect(() => {
    if (visible && exercise) {
      fetchExerciseHistory(exercise.id);
    }
  }, [visible, exercise]);

  // Fetch exercise's history in past workouts
  const fetchExerciseHistory = async (exerciseId: string) => {
    if (!exerciseId) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Get workouts containing this exercise
      const { data, error } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          workout_id,
          workouts:workouts!workout_id(id, name, date)
        `)
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching workout exercises:', error);
        return;
      }

      // Get sets for each workout exercise
      const historyItems: ExerciseHistory[] = [];
      
      for (const item of data || []) {
        // Skip if workouts data isn't available
        if (!item.workouts) continue;
        
        const workout = item.workouts as any;

        // Get sets for this workout exercise
        const { data: sets, error: setsError } = await supabase
          .from('sets')
          .select('*')
          .eq('workout_exercise_id', item.id)
          .order('set_order');

        if (setsError) {
          console.error('Error fetching sets:', setsError);
          continue;
        }

        if (sets && sets.length > 0) {
          historyItems.push({
            workout_id: item.workout_id,
            workout_name: workout.name || 'Unknown Workout',
            date: new Date(workout.date).toLocaleDateString(),
            sets: sets.map(set => ({
              set_number: set.set_order,
              weight: set.weight,
              reps: set.rep_count
            }))
          });
        }
      }

      setHistory(historyItems);
    } catch (error) {
      console.error('Error fetching exercise history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!exercise) return;
    
    try {
      // Optimistic UI update
      setFavorite(!favorite);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        setFavorite(favorite); // Revert on error
        return;
      }
      
      if (!favorite) {
        // Add to favorites
        const { error } = await supabase
          .from('user_favorite_exercises')
          .insert({ 
            user_id: user.id,
            exercise_id: exercise.id
          });
        
        if (error) {
          // Revert optimistic update on error
          setFavorite(favorite);
          console.error('Error adding to favorites:', error);
        } else {
          // Notify parent component
          onFavoriteToggle && onFavoriteToggle(exercise.id, true);
        }
      } else {
        // Remove from favorites
        const { error } = await supabase
          .from('user_favorite_exercises')
          .delete()
          .match({ 
            user_id: user.id,
            exercise_id: exercise.id
          });
        
        if (error) {
          // Revert optimistic update on error
          setFavorite(favorite);
          console.error('Error removing from favorites:', error);
        } else {
          // Notify parent component
          onFavoriteToggle && onFavoriteToggle(exercise.id, false);
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setFavorite(favorite);
      console.error('Error toggling favorite:', error);
    }
  };

  const handleWorkoutHistoryPress = (workoutId: string) => {
    router.push(`/modals/workout-history/${workoutId}`);
  };

  // Create animated style for modal container
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!exercise) return null;

  const instructions = exercise.instructions?.split('\n').filter(Boolean) || [];

  // Helper to capitalize first letter
  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View 
          style={[styles.modalContainer, { width }, animatedStyle]}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable 
                onPress={onClose}
                style={styles.backButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={24} color="#5eead4" />
              </Pressable>
              
              <Text style={styles.title}>{exercise.name}</Text>
              
              <Pressable 
                onPress={toggleFavorite}
                style={styles.favoriteButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Heart 
                  size={24} 
                  color={favorite ? "#FF90B3" : "#5eead4"} 
                  fill={favorite ? "#FF90B3" : "transparent"} 
                />
              </Pressable>
            </View>

            {/* Drag indicator for visual cue */}
            <View 
              style={styles.dragIndicator} 
              {...panResponder.panHandlers} 
            />

            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
              bounces={false}
              scrollEventThrottle={16}
            >
              {/* Muscle tags */}
              <View style={styles.tags}>
                <View style={[styles.tag, styles.primaryTag]}>
                  <Text style={styles.primaryTagText}>{capitalizeFirstLetter(exercise.muscle)}</Text>
                </View>
                {exercise.type && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{exercise.type}</Text>
                  </View>
                )}
                {exercise.difficulty && (
                  <View style={[styles.tag, styles.difficultyTag]}>
                    <Text style={styles.tagText}>{exercise.difficulty}</Text>
                  </View>
                )}
                {exercise.equipment && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{capitalizeFirstLetter(exercise.equipment)}</Text>
                  </View>
                )}
              </View>

              {/* Video if available */}
              {exercise.video_url && (
                <View style={[styles.videoContainer, { height: videoHeight }]}>
                  <WebView
                    source={{ uri: exercise.video_url }}
                    style={styles.video}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsFullscreenVideo={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#14b8a6" />
                      </View>
                    )}
                  />
                </View>
              )}

              {/* Instructions section */}
              {instructions.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  <View style={styles.sectionContent}>
                    {instructions.map((instruction, index) => (
                      <View key={index} style={styles.instructionItem}>
                        <Text style={styles.instructionNumber}>{index + 1}</Text>
                        <Text style={styles.instructionText}>{instruction}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* History section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>History</Text>
                
                {loading ? (
                  <View style={styles.loadingStateContainer}>
                    <ActivityIndicator size="small" color="#14b8a6" />
                    <Text style={styles.loadingStateText}>Loading history...</Text>
                  </View>
                ) : history.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyStateText}>No history found for this exercise.</Text>
                  </View>
                ) : (
                  <View style={styles.historyList}>
                    {history.map((item, index) => (
                      <HistoryDoneExercise 
                        key={index} 
                        history={item} 
                        onPress={() => handleWorkoutHistoryPress(item.workout_id)} 
                      />
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 26, 25, 0.8)',
  },
  modalContainer: {
    backgroundColor: '#031A19',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 -8px 20px -5px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 20,
      },
    }),
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
  },
  backButton: {
    padding: 4,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  favoriteButton: {
    padding: 4,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragIndicator: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#115e59',
    marginTop: 8,
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  tag: {
    backgroundColor: '#115e59',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  primaryTag: {
    backgroundColor: '#0d9488',
  },
  difficultyTag: {
    backgroundColor: '#0f766e',
  },
  tagText: {
    color: '#ccfbf1',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  primaryTagText: {
    color: '#f0fdfa',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  videoContainer: {
    backgroundColor: '#0d3d56',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  video: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d3d56',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 16,
    paddingTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#5eead4',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#042f2e',
    borderRadius: 12,
    padding: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingRight: 16,
  },
  instructionNumber: {
    width: 24,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#14b8a6',
    textAlign: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ccfbf1',
    marginLeft: 12,
    lineHeight: 24,
  },
  historyList: {
    gap: 12,
  },
  loadingStateContainer: {
    backgroundColor: '#042f2e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  emptyStateContainer: {
    backgroundColor: '#042f2e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
    textAlign: 'center',
  },
});