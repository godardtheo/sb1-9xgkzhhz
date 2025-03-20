import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { Search, X, Check, Filter } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Animated, { FadeIn, SlideInDown, SlideOutDown, Layout } from 'react-native-reanimated';

type Workout = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  estimated_duration: string;
  exercise_count: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (workouts: Workout[]) => void;
};

export default function WorkoutSelectionModal({ visible, onClose, onSelect }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const muscleGroups = [
    'chest', 'back', 'shoulders', 'legs', 'core', 'biceps', 'triceps'
  ];

  useEffect(() => {
    if (visible) {
      fetchWorkouts();
    } else {
      setSelectedWorkouts([]);
      setSearchQuery('');
      setSelectedMuscles([]);
    }
  }, [visible]);

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('workout_templates')
        .select(`
          id,
          name,
          description,
          muscles,
          estimated_duration,
          template_exercises (count)
        `)
        .eq('user_id', user.id);

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (selectedMuscles.length > 0) {
        query = query.overlaps('muscles', selectedMuscles);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedWorkouts = data.map(workout => ({
        ...workout,
        exercise_count: workout.template_exercises[0].count
      }));

      setWorkouts(formattedWorkouts);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMuscleFilter = (muscle: string) => {
    setSelectedMuscles(prev => 
      prev.includes(muscle)
        ? prev.filter(m => m !== muscle)
        : [...prev, muscle]
    );
  };

  const toggleWorkoutSelection = (workoutId: string) => {
    setSelectedWorkouts(prev => 
      prev.includes(workoutId)
        ? prev.filter(id => id !== workoutId)
        : [...prev, workoutId]
    );
  };

  const handleConfirm = () => {
    const selectedItems = workouts.filter(workout => 
      selectedWorkouts.includes(workout.id)
    );
    onSelect(selectedItems);
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
          style={styles.modalContainer}
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.springify().damping(15)}
          layout={Layout.springify().damping(15)}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Workouts</Text>
              <Pressable 
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#5eead4" />
              </Pressable>
            </View>

            <View style={styles.searchContainer}>
              <Search size={20} color="#5eead4" />
              <TextInput
                style={[styles.searchInput, Platform.OS === 'web' && styles.searchInputWeb]}
                placeholder="Search workouts"
                placeholderTextColor="#5eead4"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  fetchWorkouts();
                }}
              />
              <Filter size={20} color="#5eead4" />
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.muscleGroupsScroll}
              contentContainerStyle={styles.muscleGroupsContent}
            >
              {muscleGroups.map((muscle) => (
                <Pressable
                  key={muscle}
                  style={[
                    styles.muscleGroupButton,
                    selectedMuscles.includes(muscle) && styles.selectedMuscleGroup
                  ]}
                  onPress={() => {
                    toggleMuscleFilter(muscle);
                    fetchWorkouts();
                  }}
                >
                  <Text style={[
                    styles.muscleGroupText,
                    selectedMuscles.includes(muscle) && styles.selectedMuscleGroupText
                  ]}>
                    {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView 
              style={styles.workoutsList}
              contentContainerStyle={styles.workoutsListContent}
            >
              {loading ? (
                <Text style={styles.statusText}>Loading workouts...</Text>
              ) : workouts.length === 0 ? (
                <Text style={styles.statusText}>No workouts found</Text>
              ) : (
                workouts.map((workout) => {
                  const isSelected = selectedWorkouts.includes(workout.id);
                  return (
                    <Pressable
                      key={workout.id}
                      style={styles.workoutItemContainer}
                      onPress={() => toggleWorkoutSelection(workout.id)}
                    >
                      <View 
                        style={[
                          styles.workoutItem,
                          isSelected && styles.workoutItemSelected
                        ]}
                      >
                        <View style={styles.workoutContent}>
                          <View style={styles.workoutInfo}>
                            <Text style={styles.workoutName}>{workout.name}</Text>
                            <View style={styles.workoutDetails}>
                              <Text style={styles.workoutExerciseCount}>
                                {workout.exercise_count} exercises
                              </Text>
                              <Text style={styles.workoutDuration}>
                                {workout.estimated_duration}
                              </Text>
                            </View>
                            <View style={styles.muscleChips}>
                              {workout.muscles.slice(0, 3).map((muscle, index) => (
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
                          {isSelected && (
                            <View style={styles.checkmarkContainer}>
                              <View style={styles.checkmark}>
                                <Check size={20} color="#14b8a6" />
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.bottomBar}>
              <Pressable 
                style={[
                  styles.addButton,
                  selectedWorkouts.length === 0 && styles.addButtonDisabled
                ]}
                onPress={handleConfirm}
                disabled={selectedWorkouts.length === 0}
              >
                <Text style={[
                  styles.addButtonText,
                  selectedWorkouts.length === 0 && styles.addButtonTextDisabled
                ]}>
                  Add {selectedWorkouts.length} Workout{selectedWorkouts.length !== 1 ? 's' : ''}
                </Text>
              </Pressable>
            </View>
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
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#115e59',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#115e59',
    margin: 16,
    borderRadius: 12,
    padding: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ccfbf1',
    marginHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    height: Platform.OS === 'web' ? 24 : 'auto',
    padding: 0,
  },
  searchInputWeb: {
    outlineStyle: 'none',
  },
  muscleGroupsScroll: {
    maxHeight: 40,
  },
  muscleGroupsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  muscleGroupButton: {
    backgroundColor: '#115e59',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedMuscleGroup: {
    backgroundColor: '#14b8a6',
  },
  muscleGroupText: {
    color: '#5eead4',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  selectedMuscleGroupText: {
    color: '#042f2e',
  },
  workoutsList: {
    flex: 1,
  },
  workoutsListContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  workoutItemContainer: {
    marginBottom: 12,
  },
  workoutItem: {
    backgroundColor: '#115e59',
    borderRadius: 12,
    overflow: 'hidden',
  },
  workoutItemSelected: {
    backgroundColor: '#134e4a',
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  workoutContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  workoutExerciseCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5eead4',
  },
  workoutDuration: {
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
  checkmarkContainer: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#5eead4',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Inter-Regular',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    backgroundColor: '#031A19',
    borderTopWidth: 1,
    borderTopColor: '#115e59',
  },
  addButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#115e59',
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#021a19',
  },
  addButtonTextDisabled: {
    color: '#5eead4',
  },
});