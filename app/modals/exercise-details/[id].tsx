import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Heart, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { WebView } from 'react-native-webview';
import HistoryDoneExercise from '@/components/HistoryDoneExercise';

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

export default function ExerciseDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params;
  const [exercise, setExercise] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [weightUnit, setWeightUnit] = useState<string>('kg'); // Default to kg
  
  // Protection contre les rendus multiples
  const isDataFetched = React.useRef(false);

  // Pour stocker les paramètres de redirection
  const returnParams = React.useRef<Record<string, string>>({});

  // Stocker les paramètres de retour au premier rendu
  useEffect(() => {
    // Récupérer les paramètres qui seraient utiles pour revenir à l'écran live-workout
    if (params.template_id) {
      returnParams.current.template_id = params.template_id as string;
    }
  }, [params]);

  // Fetch exercise details on mount
  useEffect(() => {
    if (!isDataFetched.current) {
      fetchExerciseDetails();
      fetchUserWeightUnit();
      isDataFetched.current = true;
    }
  }, [id]);

  // Fetch user's weight unit preference
  const fetchUserWeightUnit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Get user weight unit from the users table
      const { data, error } = await supabase
        .from('users')
        .select('weight_unit')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user weight unit:', error);
        return;
      }

      if (data && data.weight_unit) {
        setWeightUnit(data.weight_unit);
      }
    } catch (error) {
      console.error('Error fetching user weight unit:', error);
    }
  };

  const fetchExerciseDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Get exercise details
      const { data: exerciseData, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching exercise:', error);
        return;
      }

      // Check if this exercise is a favorite
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('user_favorite_exercises')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', id)
        .maybeSingle();
      
      if (favoriteError) {
        console.error('Error checking favorite status:', favoriteError);
      }

      setExercise(exerciseData);
      setFavorite(!!favoriteData);
      
      // Also fetch exercise history
      fetchExerciseHistory(String(id));
    } catch (error) {
      console.error('Error fetching exercise details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch exercise's history in past workouts
  const fetchExerciseHistory = async (exerciseId: string) => {
    if (!exerciseId) return;

    setHistoryLoading(true);
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
          parent_workout_id,
          workouts:workouts!parent_workout_id(id, name, date)
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
            workout_id: item.parent_workout_id,
            workout_name: workout.name || 'Unknown Workout',
            date: new Date(workout.date).toLocaleDateString(),
            sets: sets.map(set => ({
              set_number: set.set_order + 1, // Add 1 to make set numbers start at 1
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
      setHistoryLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!exercise?.id) return;
    
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

  const handleBack = () => {
    // Utiliser router.back() pour revenir à l'écran précédent avec tout son contexte
    router.back();
  };

  // Helper to capitalize first letter
  const capitalizeFirstLetter = (string: string) => {
    if (!string || typeof string !== 'string') return '';
    return string.charAt(0).toUpperCase() + string.slice(1).replace('_', ' ');
  };

  // Parse instructions
  const instructions = exercise?.instructions?.split('\n').filter(Boolean) || [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading exercise details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: exercise?.name || 'Exercise Details',
          headerShown: true,
          presentation: 'card',
          headerTitleStyle: styles.headerTitle,
          headerStyle: styles.header,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable onPress={handleBack} style={styles.headerButton}>
              <ArrowLeft size={24} color="#5eead4" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={toggleFavorite} style={styles.headerButton}>
              <Heart 
                size={24} 
                color={favorite ? "#FF90B3" : "#5eead4"} 
                fill={favorite ? "#FF90B3" : "transparent"} 
              />
            </Pressable>
          ),
        }} 
      />
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Muscles tags section */}
        <View style={styles.tags}>
          {/* Primary Muscles */}
          {exercise?.muscle_primary && exercise.muscle_primary.length > 0 ? (
            exercise.muscle_primary.map((muscle: string, index: number) => (
              <View key={`primary-${index}`} style={[styles.tag, styles.primaryTag]}>
                <Text style={styles.primaryTagText}>{capitalizeFirstLetter(muscle)}</Text>
              </View>
            ))
          ) : (
            <View style={[styles.tag, styles.primaryTag]}>
              <Text style={styles.primaryTagText}>No primary muscles</Text>
            </View>
          )}
          
          {/* Secondary Muscles */}
          {exercise?.muscle_secondary && exercise.muscle_secondary.length > 0 && 
            exercise.muscle_secondary.map((muscle: string, index: number) => (
              <View key={`secondary-${index}`} style={[styles.tag, styles.secondaryTag]}>
                <Text style={styles.secondaryTagText}>{capitalizeFirstLetter(muscle)}</Text>
              </View>
            ))
          }
        </View>

        {/* Video if available */}
        {exercise?.video_url && (
          <View style={styles.videoContainer}>
            <WebView
              source={{ uri: exercise.video_url }}
              style={styles.video}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.videoLoadingContainer}>
                  <ActivityIndicator size="large" color="#14b8a6" />
                </View>
              )}
            />
          </View>
        )}

        {/* Instructions section */}
        {(instructions.length > 0 || (exercise?.equipment && Array.isArray(exercise.equipment) && exercise.equipment.length > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <View style={styles.sectionContent}>
              {/* Equipment section inside instructions */}
              {exercise?.equipment && Array.isArray(exercise.equipment) && exercise.equipment.length > 0 && (
                <View style={styles.equipmentSection}>
                  <Text style={styles.equipmentLabel}>Equipment: </Text>
                  {exercise.equipment.map((item: string, index: number) => (
                    <View key={`equipment-${index}`} style={styles.equipmentTag}>
                      <Text style={styles.equipmentTagText}>{capitalizeFirstLetter(item.replace('_', ' '))}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Instructions list */}
              {instructions.map((instruction: string, index: number) => (
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
          
          {historyLoading ? (
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
                  weightUnit={weightUnit}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021a19',
  },
  header: {
    backgroundColor: '#042f2e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94, 234, 212, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ccfbf1',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#021a19',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
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
  secondaryTag: {
    backgroundColor: '#164e63', // Bleu plus foncé pour les muscles secondaires
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
  secondaryTagText: {
    color: '#a5f3fc', // Couleur légèrement différente pour les muscles secondaires
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  equipmentSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
  },
  equipmentLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginRight: 6,
  },
  equipmentTag: {
    backgroundColor: '#134e4a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  equipmentTagText: {
    color: '#99f6e4',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  difficultyTag: {
    backgroundColor: '#0f766e',
  },
  videoContainer: {
    height: 220,
    backgroundColor: '#0d3d56',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  video: {
    flex: 1,
  },
  videoLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d3d56',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 16,
    paddingTop: 8,
    marginBottom: 16,
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